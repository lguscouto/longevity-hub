"""
Serviço de domínio para gerenciamento de Avaliações Físicas e Fotografias Corporais.
Manipula arquivos locais, sanitização de EXIF, hash SHA-256 e manifesto de comparação.
"""

from __future__ import annotations

import hashlib
import io
import os
import shutil
import uuid
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from longevidade.db.repository import LongevityRepository

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_PHOTOS_PER_ASSESSMENT = 20

VALID_ANGLES = {"front", "back", "left_side", "right_side", "other"}
VALID_BODY_STATES = {"relaxed", "flexed", "unspecified"}


def _get_image_metadata(data: bytes, filename: str) -> Tuple[str, str, int, int]:
    """Valida o conteúdo binário da imagem e retorna (mime_type, ext, width, height)."""
    # 1. Tenta usar Pillow (PIL) se disponível para validação completa e sanitização EXIF
    try:
        from PIL import Image, ImageOps

        image = Image.open(io.BytesIO(data))
        image.verify()  # Verifica integridade

        # Re-abre para extrair tamanho e formato (verify desativa métodos da instância)
        image = Image.open(io.BytesIO(data))
        fmt = (image.format or "").lower()
        width, height = image.width, image.height

        try:
            transposed = ImageOps.exif_transpose(image)
            width, height = transposed.width, transposed.height
        except Exception:
            pass

        if fmt in ("jpeg", "jpg"):
            mime_type = "image/jpeg"
            ext = ".jpg"
        elif fmt == "png":
            mime_type = "image/png"
            ext = ".png"
        elif fmt == "webp":
            mime_type = "image/webp"
            ext = ".webp"
        else:
            raise ValueError(f"Formato de imagem não suportado: {fmt}")

        return mime_type, ext, width, height
    except (ValueError, Exception) as err:
        if isinstance(err, ValueError) and "Formato de imagem não suportado" in str(err):
            raise err
        pass  # Fallback para validação por magic bytes se PIL falhar

    # 2. Fallback por magic bytes se Pillow não conseguir identificar
    if data.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
        ext = ".jpg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
        ext = ".png"
    elif data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        mime_type = "image/webp"
        ext = ".webp"
    else:
        raise ValueError("Arquivo de imagem inválido ou formato não suportado")

    return mime_type, ext, 0, 0


def _strip_exif_if_possible(data: bytes, ext: str) -> bytes:
    """Remove metadados sensíveis de EXIF (GPS, dispositivo) preservando os pixels."""
    try:
        from PIL import Image, ImageOps

        image = Image.open(io.BytesIO(data))
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        output = io.BytesIO()
        # Salva limpo sem salvar exif original
        save_format = "JPEG" if ext == ".jpg" else ext[1:].upper()
        if save_format == "JPG":
            save_format = "JPEG"

        image.save(output, format=save_format, quality=92 if save_format == "JPEG" else None)
        return output.getvalue()
    except Exception:
        return data  # Retorna bytes originais se não conseguir reprocessar


class PhysicalAssessmentService:
    def __init__(self, repo: LongevityRepository, base_data_dir: str | Path):
        self.repo = repo
        self.base_data_dir = Path(base_data_dir)
        self.storage_dir = self.base_data_dir / "physical_assessments"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _assessment_dir(self, assessment_id: str) -> Path:
        target = (self.storage_dir / assessment_id).resolve()
        # Proteção contra path traversal
        if not str(target).startswith(str(self.storage_dir.resolve())):
            raise ValueError("Tentativa de navegação fora do diretório de armazenamento permitido (path traversal)")
        return target

    def create_assessment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not data.get("assessment_date"):
            raise ValueError("A data da avaliação é obrigatória (assessment_date)")

        # Validação do formato de data
        try:
            date.fromisoformat(str(data["assessment_date"])[:10])
        except ValueError:
            raise ValueError("Data da avaliação inválida (formato esperado YYYY-MM-DD)")

        return self.repo.create_physical_assessment(data)

    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get_physical_assessment(assessment_id)

    def list_assessments(
        self,
        limit: int = 50,
        offset: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return self.repo.list_physical_assessments(
            limit=limit, offset=offset, start_date=start_date, end_date=end_date
        )

    def update_assessment(self, assessment_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "assessment_date" in data and data["assessment_date"]:
            try:
                date.fromisoformat(str(data["assessment_date"])[:10])
            except ValueError:
                raise ValueError("Data da avaliação inválida (formato esperado YYYY-MM-DD)")

        return self.repo.update_physical_assessment(assessment_id, data)

    def delete_assessment(self, assessment_id: str) -> bool:
        assessment = self.repo.get_physical_assessment(assessment_id)
        if not assessment:
            return False

        # 1. Apaga registros no banco
        success = self.repo.delete_physical_assessment(assessment_id)

        # 2. Apaga arquivos físicos da pasta interna
        target_dir = self._assessment_dir(assessment_id)
        if target_dir.exists():
            shutil.rmtree(target_dir, ignore_errors=True)

        return success

    def save_photo(
        self,
        assessment_id: str,
        file_bytes: bytes,
        original_filename: str,
        angle: str = "other",
        body_state: str = "unspecified",
        description: Optional[str] = None,
        display_order: int = 0,
    ) -> Dict[str, Any]:
        assessment = self.repo.get_physical_assessment(assessment_id)
        if not assessment:
            raise ValueError(f"Avaliação física {assessment_id} não encontrada")

        if len(file_bytes) == 0:
            raise ValueError("Arquivo de imagem vazio")

        if len(file_bytes) > MAX_FILE_SIZE:
            raise ValueError(f"Tamanho do arquivo excede o limite máximo permitido de 15 MB ({len(file_bytes)} bytes)")

        existing_photos = self.repo.list_physical_assessment_photos(assessment_id)
        if len(existing_photos) >= MAX_PHOTOS_PER_ASSESSMENT:
            raise ValueError(f"Limite máximo de {MAX_PHOTOS_PER_ASSESSMENT} fotos por avaliação atingido")

        if angle not in VALID_ANGLES:
            angle = "other"
        if body_state not in VALID_BODY_STATES:
            body_state = "unspecified"

        # Validação de formato e dimensão
        mime_type, ext, width, height = _get_image_metadata(file_bytes, original_filename)

        # Sanitização de EXIF
        clean_bytes = _strip_exif_if_possible(file_bytes, ext)
        sha256 = hashlib.sha256(clean_bytes).hexdigest()

        photo_id = str(uuid.uuid4())
        stored_filename = f"{photo_id}{ext}"
        target_dir = self._assessment_dir(assessment_id)
        target_dir.mkdir(parents=True, exist_ok=True)

        file_path = target_dir / stored_filename
        relative_path = f"data/physical_assessments/{assessment_id}/{stored_filename}"

        # 1. Salva arquivo físico temporariamente
        temp_path = target_dir / f"tmp_{stored_filename}"
        try:
            temp_path.write_bytes(clean_bytes)
            # Move para caminho definitivo
            temp_path.replace(file_path)
        except Exception as exc:
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            raise IOError(f"Falha ao gravar arquivo de imagem no disco: {exc}")

        # 2. Salva no banco de dados
        try:
            photo_data = {
                "id": photo_id,
                "assessment_id": assessment_id,
                "angle": angle,
                "body_state": body_state,
                "description": description,
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "relative_path": relative_path,
                "mime_type": mime_type,
                "file_size": len(clean_bytes),
                "sha256": sha256,
                "width": width,
                "height": height,
                "display_order": display_order,
            }
            record = self.repo.add_physical_assessment_photo(photo_data)
            return record
        except Exception as exc:
            # Em caso de falha no banco, limpa o arquivo para evitar órfão
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise exc

    def get_photo_file_path(self, assessment_id: str, photo_id: str) -> Path:
        photo = self.repo.get_physical_assessment_photo(photo_id)
        if not photo or photo["assessment_id"] != assessment_id:
            raise ValueError("Foto não encontrada")

        target_dir = self._assessment_dir(assessment_id)
        file_path = (target_dir / photo["stored_filename"]).resolve()

        if not str(file_path).startswith(str(self.storage_dir.resolve())):
            raise ValueError("Path traversal detectado no acesso à foto")

        if not file_path.is_file():
            raise FileNotFoundError(f"Arquivo físico da foto não existe no disco: {file_path}")

        return file_path

    def update_photo(self, photo_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "angle" in data and data["angle"] not in VALID_ANGLES:
            data["angle"] = "other"
        if "body_state" in data and data["body_state"] not in VALID_BODY_STATES:
            data["body_state"] = "unspecified"
        return self.repo.update_physical_assessment_photo(photo_id, data)

    def delete_photo(self, assessment_id: str, photo_id: str) -> bool:
        photo = self.repo.get_physical_assessment_photo(photo_id)
        if not photo or photo["assessment_id"] != assessment_id:
            return False

        # Remove do banco
        deleted = self.repo.delete_physical_assessment_photo(photo_id)

        # Remove arquivo do disco
        try:
            target_dir = self._assessment_dir(assessment_id)
            file_path = target_dir / photo["stored_filename"]
            if file_path.exists():
                file_path.unlink(missing_ok=True)

            # Limpa diretório se ficou vazio
            if target_dir.exists() and not any(target_dir.iterdir()):
                target_dir.rmdir()
        except Exception:
            pass

        return deleted

    def compare_assessments(self, previous_id: str, current_id: str) -> Dict[str, Any]:
        prev = self.repo.get_physical_assessment(previous_id)
        curr = self.repo.get_physical_assessment(current_id)

        if not prev:
            raise ValueError(f"Avaliação física anterior {previous_id} não encontrada")
        if not curr:
            raise ValueError(f"Avaliação física atual {current_id} não encontrada")

        prev_date = date.fromisoformat(str(prev["assessment_date"])[:10])
        curr_date = date.fromisoformat(str(curr["assessment_date"])[:10])

        days_between = (curr_date - prev_date).days

        def _calc_delta(val_curr: Any, val_prev: Any) -> Optional[float]:
            if isinstance(val_curr, (int, float)) and isinstance(val_prev, (int, float)):
                return round(float(val_curr) - float(val_prev), 2)
            return None

        matched_photos: List[Dict[str, Any]] = []
        prev_photos_by_angle: Dict[str, list[dict]] = {}
        curr_photos_by_angle: Dict[str, list[dict]] = {}

        for p in prev.get("photos", []):
            prev_photos_by_angle.setdefault(p["angle"], []).append(p)
        for c in curr.get("photos", []):
            curr_photos_by_angle.setdefault(c["angle"], []).append(c)

        for angle in ("front", "back", "left_side", "right_side", "other"):
            prev_list = prev_photos_by_angle.get(angle, [])
            curr_list = curr_photos_by_angle.get(angle, [])
            max_len = max(len(prev_list), len(curr_list))
            for i in range(max_len):
                matched_photos.append({
                    "angle": angle,
                    "previous_photo": prev_list[i] if i < len(prev_list) else None,
                    "current_photo": curr_list[i] if i < len(curr_list) else None,
                })

        return {
            "previous_assessment": {
                "id": prev["id"],
                "assessment_date": prev["assessment_date"],
                "title": prev.get("title"),
                "weight_kg": prev.get("weight_kg"),
                "body_fat_percentage": prev.get("body_fat_percentage"),
                "waist_cm": prev.get("waist_cm"),
                "abdomen_cm": prev.get("abdomen_cm"),
                "hip_cm": prev.get("hip_cm"),
                "notes": prev.get("notes"),
            },
            "current_assessment": {
                "id": curr["id"],
                "assessment_date": curr["assessment_date"],
                "title": curr.get("title"),
                "weight_kg": curr.get("weight_kg"),
                "body_fat_percentage": curr.get("body_fat_percentage"),
                "waist_cm": curr.get("waist_cm"),
                "abdomen_cm": curr.get("abdomen_cm"),
                "hip_cm": curr.get("hip_cm"),
                "notes": curr.get("notes"),
            },
            "days_between": days_between,
            "deltas": {
                "weight_kg": _calc_delta(curr.get("weight_kg"), prev.get("weight_kg")),
                "body_fat_percentage": _calc_delta(curr.get("body_fat_percentage"), prev.get("body_fat_percentage")),
                "waist_cm": _calc_delta(curr.get("waist_cm"), prev.get("waist_cm")),
                "abdomen_cm": _calc_delta(curr.get("abdomen_cm"), prev.get("abdomen_cm")),
                "hip_cm": _calc_delta(curr.get("hip_cm"), prev.get("hip_cm")),
            },
            "matched_photos": matched_photos,
        }

    def export_photos_zip(self, assessment_id: str) -> Tuple[io.BytesIO, str]:
        assessment = self.repo.get_physical_assessment(assessment_id)
        if not assessment:
            raise ValueError(f"Avaliação física {assessment_id} não encontrada")

        photos = assessment.get("photos", [])
        if not photos:
            raise ValueError("Esta avaliação não possui fotos para download")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_STORED) as zf:
            used_names: set[str] = set()
            files_added = 0
            for idx, photo in enumerate(photos, 1):
                try:
                    file_path = self.get_photo_file_path(assessment_id, photo["id"])
                    if not file_path.exists():
                        continue

                    angle = photo.get("angle") or "foto"
                    orig_name = photo.get("original_filename") or photo.get("stored_filename", f"foto_{idx}.jpg")
                    base_name = f"{idx:02d}_{angle}_{orig_name}"

                    clean_name = base_name
                    counter = 1
                    while clean_name in used_names:
                        clean_name = f"{idx:02d}_{angle}_{counter}_{orig_name}"
                        counter += 1
                    used_names.add(clean_name)

                    zf.write(file_path, arcname=clean_name)
                    files_added += 1
                except Exception:
                    continue

        if files_added == 0:
            raise ValueError("Nenhum arquivo físico de foto foi encontrado para esta avaliação")

        zip_buffer.seek(0)
        date_str = str(assessment.get("assessment_date", "fotos"))[:10]
        filename = f"fotos_avaliacao_{date_str}.zip"
        return zip_buffer, filename

