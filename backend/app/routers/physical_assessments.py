"""
Router FastAPI para Avaliações Físicas e Fotografias Corporais.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from backend.app.config import DATA_DIR, get_db_path
from longevidade.assessments.service import PhysicalAssessmentService
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/physical-assessments", tags=["Physical Assessments"])


def _service() -> PhysicalAssessmentService:
    db_path = get_db_path()
    repo = LongevityRepository(db_path)
    return PhysicalAssessmentService(repo, DATA_DIR)


@router.get("", response_model=List[Dict[str, Any]])
def list_physical_assessments(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    try:
        service = _service()
        assessments = service.list_assessments(
            limit=limit, offset=offset, start_date=start_date, end_date=end_date
        )
    except FileNotFoundError:
        return []
    # Adiciona content_url para cada foto
    for ass in assessments:
        for p in ass.get("photos", []):
            p["content_url"] = f"/api/physical-assessments/{ass['id']}/photos/{p['id']}/content"
    return assessments


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_physical_assessment(payload: Dict[str, Any]) -> Dict[str, Any]:
    service = _service()
    try:
        assessment = service.create_assessment(payload)
        return assessment
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/compare", response_model=Dict[str, Any])
def compare_physical_assessments(
    previous_id: str = Query(..., description="ID da avaliação física anterior"),
    current_id: str = Query(..., description="ID da avaliação física atual"),
) -> Dict[str, Any]:
    service = _service()
    try:
        manifest = service.compare_assessments(previous_id, current_id)
        # Adiciona content_url nas fotos pareadas
        for match in manifest.get("matched_photos", []):
            if match.get("previous_photo"):
                p = match["previous_photo"]
                p["content_url"] = f"/api/physical-assessments/{previous_id}/photos/{p['id']}/content"
            if match.get("current_photo"):
                c = match["current_photo"]
                c["content_url"] = f"/api/physical-assessments/{current_id}/photos/{c['id']}/content"
        return manifest
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/timeline", response_model=Dict[str, Any])
def get_composition_timeline(
    days: Optional[int] = Query(None, ge=1, description="Número de dias para filtrar o histórico"),
) -> Dict[str, Any]:
    """Retorna linha do tempo consolidada de composição corporal mesclando avaliações físicas e wearables."""
    try:
        service = _service()
        repo = service.repo
        cutoff_date: Optional[str] = None
        if days:
            cutoff_date = (datetime.now().date() - timedelta(days=days)).isoformat()

        daily_metrics = repo.get_daily_metrics(days=days or 3650)
        assessments = service.list_assessments(
            limit=500, offset=0, start_date=cutoff_date
        )

        profile = repo.get_user_profile() if hasattr(repo, "get_user_profile") else {}
        target_weight_kg = profile.get("target_weight_kg") if isinstance(profile, dict) else None

        merged: Dict[str, Dict[str, Any]] = {}

        # 1. Popula com métricas diárias de wearables (Zepp, Google Health)
        for m in daily_metrics:
            date_str = str(m.get("date_ref") or "")[:10]
            if not date_str or (cutoff_date and date_str < cutoff_date):
                continue
            w = m.get("weight_kg")
            bf = m.get("body_fat_pct")
            waist = m.get("waist_cm")
            if w is not None or bf is not None or waist is not None:
                merged[date_str] = {
                    "date": date_str,
                    "weight_kg": w,
                    "body_fat_pct": bf,
                    "source": m.get("source") or "Wearable",
                    "is_physical_assessment": False,
                    "assessment_id": None,
                    "assessment_title": None,
                    "photo_count": 0,
                    "waist_cm": waist,
                    "abdomen_cm": None,
                    "hip_cm": None,
                }

        # 2. Avaliações físicas têm precedência padrão-ouro em datas coincidentes
        for ass in assessments:
            date_str = str(ass.get("assessment_date") or "")[:10]
            if not date_str or (cutoff_date and date_str < cutoff_date):
                continue
            existing = merged.get(date_str, {})
            w = ass.get("weight_kg") if ass.get("weight_kg") is not None else existing.get("weight_kg")
            bf = ass.get("body_fat_percentage") if ass.get("body_fat_percentage") is not None else existing.get("body_fat_pct")
            waist = ass.get("waist_cm") if ass.get("waist_cm") is not None else existing.get("waist_cm")

            merged[date_str] = {
                "date": date_str,
                "weight_kg": w,
                "body_fat_pct": bf,
                "source": "Avaliação Física",
                "is_physical_assessment": True,
                "assessment_id": ass.get("id"),
                "assessment_title": ass.get("title"),
                "photo_count": len(ass.get("photos", [])),
                "waist_cm": waist,
                "abdomen_cm": ass.get("abdomen_cm"),
                "hip_cm": ass.get("hip_cm"),
            }

        # 3. Calcula massa magra e massa gorda cronologicamente
        points: List[Dict[str, Any]] = []
        for d in sorted(merged.keys()):
            pt = merged[d]
            w = pt.get("weight_kg")
            bf = pt.get("body_fat_pct")
            if w is not None and bf is not None and w > 0 and 0 <= bf <= 100:
                fat_mass = round(float(w) * (float(bf) / 100.0), 2)
                lean_mass = round(float(w) - fat_mass, 2)
                pt["fat_mass_kg"] = fat_mass
                pt["lean_mass_kg"] = lean_mass
            else:
                pt["fat_mass_kg"] = None
                pt["lean_mass_kg"] = None
            points.append(pt)

        # 4. Sumário estatístico
        summary: Dict[str, Any] = {
            "latest_weight_kg": None,
            "weight_delta": None,
            "latest_body_fat_pct": None,
            "body_fat_delta": None,
            "latest_lean_mass_kg": None,
            "lean_mass_delta": None,
            "total_points": len(points),
            "assessment_count": sum(1 for p in points if p.get("is_physical_assessment")),
        }

        weights = [p["weight_kg"] for p in points if p.get("weight_kg") is not None]
        if weights:
            summary["latest_weight_kg"] = weights[-1]
            summary["weight_delta"] = round(weights[-1] - weights[0], 2)

        fats = [p["body_fat_pct"] for p in points if p.get("body_fat_pct") is not None]
        if fats:
            summary["latest_body_fat_pct"] = fats[-1]
            summary["body_fat_delta"] = round(fats[-1] - fats[0], 2)

        leans = [p["lean_mass_kg"] for p in points if p.get("lean_mass_kg") is not None]
        if leans:
            summary["latest_lean_mass_kg"] = leans[-1]
            summary["lean_mass_delta"] = round(leans[-1] - leans[0], 2)

        return {
            "target_weight_kg": target_weight_kg,
            "points": points,
            "summary": summary,
        }
    except FileNotFoundError:
        return {
            "target_weight_kg": None,
            "points": [],
            "summary": {
                "latest_weight_kg": None,
                "weight_delta": None,
                "latest_body_fat_pct": None,
                "body_fat_delta": None,
                "latest_lean_mass_kg": None,
                "lean_mass_delta": None,
                "total_points": 0,
                "assessment_count": 0,
            },
        }


@router.get("/{assessment_id}", response_model=Dict[str, Any])
def get_physical_assessment(assessment_id: str) -> Dict[str, Any]:
    service = _service()
    assessment = service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Avaliação física {assessment_id} não encontrada",
        )
    for p in assessment.get("photos", []):
        p["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{p['id']}/content"
    return assessment


@router.put("/{assessment_id}", response_model=Dict[str, Any])
@router.patch("/{assessment_id}", response_model=Dict[str, Any])
def update_physical_assessment(
    assessment_id: str, payload: Dict[str, Any]
) -> Dict[str, Any]:
    service = _service()
    try:
        updated = service.update_assessment(assessment_id, payload)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Avaliação física {assessment_id} não encontrada",
            )
        for p in updated.get("photos", []):
            p["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{p['id']}/content"
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_physical_assessment(assessment_id: str) -> None:
    service = _service()
    deleted = service.delete_assessment(assessment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Avaliação física {assessment_id} não encontrada",
        )


@router.post("/{assessment_id}/photos", response_model=List[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_assessment_photos(
    assessment_id: str,
    files: List[UploadFile] = File(...),
    angle: str = Form("other"),
    body_state: str = Form("unspecified"),
    description: Optional[str] = Form(None),
) -> List[Dict[str, Any]]:
    service = _service()
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum arquivo enviado"
        )

    saved_photos = []
    for index, upload in enumerate(files):
        try:
            content = await upload.read()
            photo = service.save_photo(
                assessment_id=assessment_id,
                file_bytes=content,
                original_filename=upload.filename or f"photo_{index}.jpg",
                angle=angle,
                body_state=body_state,
                description=description,
                display_order=index,
            )
            photo["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{photo['id']}/content"
            saved_photos.append(photo)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            )
        except IOError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
            )

    return saved_photos


@router.get("/{assessment_id}/photos/download")
def download_assessment_photos(assessment_id: str) -> Response:
    service = _service()
    try:
        zip_buffer, filename = service.export_photos_zip(assessment_id)
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{assessment_id}/photos/{photo_id}/content")
def get_photo_content(assessment_id: str, photo_id: str) -> FileResponse:
    service = _service()
    try:
        file_path = service.get_photo_file_path(assessment_id, photo_id)
        photo = service.repo.get_physical_assessment_photo(photo_id)
        mime_type = photo.get("mime_type", "image/jpeg") if photo else "image/jpeg"
        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=photo.get("stored_filename", file_path.name) if photo else file_path.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{assessment_id}/photos/{photo_id}", response_model=Dict[str, Any])
def update_photo_metadata(
    assessment_id: str, photo_id: str, payload: Dict[str, Any]
) -> Dict[str, Any]:
    service = _service()
    photo = service.repo.get_physical_assessment_photo(photo_id)
    if not photo or photo["assessment_id"] != assessment_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
    updated = service.update_photo(photo_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
    updated["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{photo_id}/content"
    return updated


@router.delete("/{assessment_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment_photo(assessment_id: str, photo_id: str) -> None:
    service = _service()
    deleted = service.delete_photo(assessment_id, photo_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
