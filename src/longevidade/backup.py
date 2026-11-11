"""Módulo de Backup Atômico e Restauração Consistente do Longevidade Hub.

Garante backups atômicos em repouso mesmo com o banco SQLite em operação
utilizando a SQLite Online Backup API (`sqlite3.Connection.backup()`).
Empacota em arquivo ZIP:
1. O banco de dados SQLite consistente (`longevity.sqlite3`);
2. As fotografias de avaliações físicas e anexos (`photos/`);
3. Manifesto estruturado (`manifest.json`) com metadados, contagens e hashes SHA-256 de integridade.

Fornece também funções de verificação e restauração segura com validação
obrigatória via `PRAGMA integrity_check`.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
import re
from pathlib import Path, PurePosixPath, PureWindowsPath
import shutil
import sqlite3
import tempfile
from typing import Any, Dict, List, Optional
import zipfile

from longevidade.version import __version__


class BackupError(Exception):
    """Exceção base para erros durante backup ou restauração."""


class BackupIntegrityError(BackupError):
    """Lançada quando a verificação de hash SHA-256 ou PRAGMA integrity_check falha."""


def _safe_relative_path(value: object) -> str:
    if not isinstance(value, str) or not value or '\\' in value:
        raise BackupIntegrityError('Caminho inválido no manifesto de backup.')
    posix = PurePosixPath(value)
    windows = PureWindowsPath(value)
    if posix.is_absolute() or windows.is_absolute() or windows.drive or any(part in ('..', '.') for part in value.split('/')):
        raise BackupIntegrityError('Caminho inseguro no manifesto de backup.')
    return value


def _validate_manifest_paths(manifest: dict, names: list[str]) -> None:
    if names.count('manifest.json') != 1:
        raise BackupIntegrityError('Manifesto duplicado ou ausente no backup.')
    database = _safe_relative_path(manifest.get('database', {}).get('arcname'))
    if not database.startswith('database/') or names.count(database) != 1:
        raise BackupIntegrityError('Arquivo de banco inválido ou duplicado no backup.')
    seen: set[str] = set()
    for photo in manifest.get('photos', []):
        arc = _safe_relative_path(photo.get('arcname'))
        relative = _safe_relative_path(photo.get('relative_path'))
        if arc != f'photos/{relative}' or names.count(arc) != 1 or relative.casefold() in seen:
            raise BackupIntegrityError('Foto inválida ou duplicada no backup.')
        seen.add(relative.casefold())


def retention_candidates(directory: Path | str, keep: int) -> list[Path]:
    """Lista backups antigos; não remove nenhum arquivo."""
    if keep < 1:
        raise ValueError('A retenção deve preservar pelo menos um backup.')
    root = Path(directory)
    if not root.is_dir():
        return []
    backups = sorted(
        (p for p in root.iterdir() if p.is_file() and not p.is_symlink()
         and re.fullmatch(r'longevity_backup_\d{8}_\d{6}(?:_\d{6})?\.zip', p.name)),
        key=lambda p: p.name, reverse=True,
    )
    return backups[keep:]


def _calculate_sha256(file_path: Path) -> str:
    """Calcula o hash SHA-256 de um arquivo."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def _run_sqlite_integrity_check(db_path: Path) -> str:
    """Executa PRAGMA integrity_check em um banco SQLite."""
    conn = sqlite3.connect(db_path, timeout=30.0)
    try:
        cursor = conn.execute("PRAGMA integrity_check;")
        row = cursor.fetchone()
        return str(row[0]) if row else "unknown"
    finally:
        conn.close()


def create_backup(
    db_path: Path | str,
    output_zip: Path | str,
    photos_dir: Optional[Path | str] = None,
    notes: Optional[str] = None,
) -> Path:
    """Cria um backup atômico e consistente empacotado em arquivo ZIP.

    Args:
        db_path: Caminho para o banco de dados longevity.sqlite3 de origem.
        output_zip: Caminho de destino para o arquivo .zip gerado.
        photos_dir: Diretório opcional contendo fotos de avaliações corporais.
        notes: Notas textuais opcionais a serem incluídas no manifesto.

    Returns:
        Path do arquivo ZIP criado.
    """
    src_db = Path(db_path)
    if not src_db.exists():
        raise FileNotFoundError(f"Banco de dados de origem não encontrado em '{src_db}'")

    dest_zip_path = Path(output_zip)
    dest_zip_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="longevidade_backup_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        temp_db = tmp_path / "longevity.sqlite3"

        # 1. Backup atômico online do SQLite
        src_conn = sqlite3.connect(src_db, timeout=30.0)
        dest_conn = sqlite3.connect(temp_db, timeout=30.0)
        try:
            src_conn.backup(dest_conn)
        finally:
            dest_conn.close()
            src_conn.close()

        # 2. Valida integridade do snapshot temporário
        integrity = _run_sqlite_integrity_check(temp_db)
        if integrity.lower() != "ok":
            raise BackupIntegrityError(f"Falha no integrity_check do snapshot do banco: {integrity}")

        db_sha256 = _calculate_sha256(temp_db)
        db_size = temp_db.stat().st_size

        # Obtém versão do schema e contagem de tabelas
        conn = sqlite3.connect(temp_db)
        try:
            ver_row = conn.execute("PRAGMA user_version;").fetchone()
            user_version = ver_row[0] if ver_row else 0
            tables_count = conn.execute(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
            ).fetchone()[0]
        finally:
            conn.close()

        # 3. Mapeia arquivos de fotos se existirem
        files_manifest: List[Dict[str, Any]] = []
        effective_photos_dir: Optional[Path] = None
        if photos_dir is not None:
            effective_photos_dir = Path(photos_dir)
        else:
            # Procura pastas comuns no diretório pai do banco
            candidate1 = src_db.parent / "physical_assessments"
            candidate2 = src_db.parent / "photos"
            if candidate1.exists() and candidate1.is_dir():
                effective_photos_dir = candidate1
            elif candidate2.exists() and candidate2.is_dir():
                effective_photos_dir = candidate2

        temp_zip = tmp_path / "backup.zip"
        with zipfile.ZipFile(temp_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            # Adiciona o banco de dados
            zf.write(temp_db, arcname="database/longevity.sqlite3")

            # Adiciona as fotos
            if effective_photos_dir and effective_photos_dir.exists():
                for root, _, files in os.walk(effective_photos_dir):
                    for file in files:
                        file_path = Path(root) / file
                        rel_path = file_path.relative_to(effective_photos_dir).as_posix()
                        sha = _calculate_sha256(file_path)
                        size = file_path.stat().st_size
                        arc_name = f"photos/{rel_path}"
                        zf.write(file_path, arcname=arc_name)
                        files_manifest.append({
                            "arcname": arc_name,
                            "relative_path": rel_path,
                            "sha256": sha,
                            "size_bytes": size,
                        })

            # Monta o manifesto
            manifest = {
                "format_version": "1.0",
                "application_version": __version__,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "notes": notes,
                "database": {
                    "arcname": "database/longevity.sqlite3",
                    "original_name": src_db.name,
                    "sha256": db_sha256,
                    "size_bytes": db_size,
                    "user_version": user_version,
                    "tables_count": tables_count,
                    "integrity_check": integrity,
                },
                "photos_count": len(files_manifest),
                "photos": files_manifest,
            }

            zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

        # Move o arquivo ZIP finalizado de forma atômica
        shutil.move(str(temp_zip), str(dest_zip_path))

    return dest_zip_path


def verify_backup(zip_path: Path | str) -> Dict[str, Any]:
    """Valida um arquivo de backup sem alterar dados operacionais.

    Verifica a existência do manifesto, confere os hashes SHA-256 de todos os
    arquivos contidos no ZIP e executa PRAGMA integrity_check no banco embutido.

    Returns:
        Dicionário com o manifesto e status de validação.
    """
    path = Path(zip_path)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo de backup não encontrado em '{path}'")

    if not zipfile.is_zipfile(path):
        raise BackupError(f"Arquivo '{path}' não é um arquivo ZIP válido.")

    with tempfile.TemporaryDirectory(prefix="longevidade_verify_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        with zipfile.ZipFile(path, "r") as zf:
            if "manifest.json" not in zf.namelist():
                raise BackupIntegrityError("Manifesto 'manifest.json' ausente no pacote de backup.")

            manifest_bytes = zf.read("manifest.json")
            try:
                manifest = json.loads(manifest_bytes.decode("utf-8"))
            except Exception as exc:
                raise BackupIntegrityError(f"Falha ao interpretar manifest.json: {exc}")

            _validate_manifest_paths(manifest, zf.namelist())

            db_arcname = manifest.get("database", {}).get("arcname", "database/longevity.sqlite3")
            if db_arcname not in zf.namelist():
                raise BackupIntegrityError(f"Banco de dados '{db_arcname}' ausente no arquivo de backup.")

            # Extrai o banco e valida sha256 + integrity_check
            extracted_db = zf.extract(db_arcname, path=tmp_path)
            extracted_db_path = Path(extracted_db)
            calc_sha = _calculate_sha256(extracted_db_path)
            expected_sha = manifest["database"]["sha256"]
            if calc_sha != expected_sha:
                raise BackupIntegrityError(
                    f"Incompatibilidade de hash SHA-256 no banco: esperado {expected_sha}, obtido {calc_sha}"
                )

            integrity = _run_sqlite_integrity_check(extracted_db_path)
            if integrity.lower() != "ok":
                raise BackupIntegrityError(f"Integridade do SQLite comprometida: {integrity}")

            # Valida hashes das fotos
            for photo_entry in manifest.get("photos", []):
                arc = photo_entry["arcname"]
                if arc not in zf.namelist():
                    raise BackupIntegrityError(f"Foto '{arc}' declarada no manifesto não encontrada no arquivo ZIP.")
                extracted_photo = Path(zf.extract(arc, path=tmp_path))
                photo_sha = _calculate_sha256(extracted_photo)
                if photo_sha != photo_entry["sha256"]:
                    raise BackupIntegrityError(
                        f"Hash inválido na foto '{arc}': esperado {photo_entry['sha256']}, obtido {photo_sha}"
                    )

    return {
        "status": "valid",
        "manifest": manifest,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


def restore_backup(
    zip_path: Path | str,
    target_db_path: Path | str,
    target_photos_dir: Optional[Path | str] = None,
    verify_first: bool = True,
) -> Dict[str, Any]:
    """Restaura o banco de dados e arquivos de mídia a partir de um backup verificado.

    Args:
        zip_path: Caminho do arquivo .zip contendo o backup.
        target_db_path: Destino para o arquivo longevity.sqlite3 restaurado.
        target_photos_dir: Destino opcional para restaurar a árvore de fotos.
        verify_first: Se True, executa `verify_backup` antes de substituir os arquivos.

    Returns:
        Dicionário com o resultado da restauração e metadados.
    """
    path = Path(zip_path)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo de backup não encontrado em '{path}'")

    if verify_first:
        verify_result = verify_backup(path)
        manifest = verify_result["manifest"]
    else:
        with zipfile.ZipFile(path, "r") as zf:
            manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
            _validate_manifest_paths(manifest, zf.namelist())

    dest_db = Path(target_db_path)
    if dest_db.exists():
        raise BackupError('A restauração exige um caminho de banco ainda inexistente.')
    photos_dest = Path(target_photos_dir) if target_photos_dir is not None else dest_db.parent / 'physical_assessments'
    for photo_entry in manifest.get('photos', []):
        photo_path = photos_dest / photo_entry['relative_path']
        if not photo_path.resolve().is_relative_to(photos_dest.resolve()) or photo_path.exists():
            raise BackupError('A restauração exige destino isolado para todas as fotos.')
    dest_db.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="longevidade_restore_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        with zipfile.ZipFile(path, "r") as zf:
            db_arcname = manifest["database"]["arcname"]
            extracted_db = Path(zf.extract(db_arcname, path=tmp_path))

            # Validação rigorosa final de integridade
            integrity = _run_sqlite_integrity_check(extracted_db)
            if integrity.lower() != "ok":
                raise BackupIntegrityError(f"Falha no integrity_check antes da restauração final: {integrity}")

            # Remove arquivos WAL/SHM legados ou residuais no destino para evitar "disk I/O error" ou salt mismatch
            dest_wal = dest_db.with_name(dest_db.name + "-wal")
            dest_shm = dest_db.with_name(dest_db.name + "-shm")
            if dest_wal.exists():
                try:
                    dest_wal.unlink()
                except OSError:
                    pass
            if dest_shm.exists():
                try:
                    dest_shm.unlink()
                except OSError:
                    pass

            # Substituição atômica do banco de dados
            tmp_target = dest_db.with_suffix(".tmp_restore")
            shutil.copyfile(extracted_db, tmp_target)
            tmp_target.replace(dest_db)

            # Restauração das fotos se diretório alvo foi informado ou determinado
            restored_photos_count = 0
            for photo_entry in manifest.get("photos", []):
                arc = photo_entry["arcname"]
                rel = photo_entry["relative_path"]
                final_photo_path = photos_dest / rel
                final_photo_path.parent.mkdir(parents=True, exist_ok=True)

                extracted_photo = Path(zf.extract(arc, path=tmp_path))
                shutil.copyfile(extracted_photo, final_photo_path)
                restored_photos_count += 1

    return {
        "status": "success",
        "restored_at": datetime.now(timezone.utc).isoformat(),
        "database_restored": str(dest_db),
        "user_version": manifest["database"]["user_version"],
        "tables_count": manifest["database"]["tables_count"],
        "photos_restored": restored_photos_count,
        "manifest": manifest,
    }


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Utilitário de Backup e Restauração do Longevidade Hub")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcomando create
    create_p = subparsers.add_parser("create", help="Cria um novo backup atômico")
    create_p.add_argument("--db", default="data/longevity.sqlite3", help="Caminho do banco SQLite (padrão: data/longevity.sqlite3)")
    create_p.add_argument("--output", help="Caminho do arquivo ZIP de saída (padrão: data/backups/longevity_backup_YYYYMMDD_HHMMSS.zip)")
    create_p.add_argument("--photos", help="Diretório de fotos")
    create_p.add_argument("--notes", help="Notas descritivas opcionais")

    # Subcomando verify
    verify_p = subparsers.add_parser("verify", help="Verifica a integridade de um arquivo de backup")
    verify_p.add_argument("zip_path", help="Caminho do arquivo ZIP")

    # Subcomando restore
    restore_p = subparsers.add_parser("restore", help="Restaura um backup verificado")
    restore_p.add_argument("zip_path", help="Caminho do arquivo ZIP")
    restore_p.add_argument("--db", default="data/longevity.sqlite3", help="Caminho de destino do banco SQLite")
    restore_p.add_argument("--photos", help="Diretório de destino para fotos")

    retention_p = subparsers.add_parser("retention", help="Lista backups antigos para retenção; não remove por padrão")
    retention_p.add_argument("--dir", default="data/backups", help="Diretório dos backups")
    retention_p.add_argument("--keep", type=int, required=True, help="Número mínimo de backups a preservar")
    retention_p.add_argument("--apply", action="store_true", help="Remove os arquivos listados")

    args = parser.parse_args()

    if args.command == "create":
        db_path = Path(args.db)
        if not db_path.exists():
            print(f"[ERRO] Banco de dados não encontrado em {db_path}", file=sys.stderr)
            sys.exit(1)
        if args.output:
            out_zip = Path(args.output)
        else:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            out_zip = Path("data/backups") / f"longevity_backup_{ts}.zip"

        print(f"Iniciando backup online consistente de '{db_path}'...")
        res_zip = create_backup(db_path, out_zip, photos_dir=args.photos, notes=args.notes)
        print(f"Backup concluído com sucesso: {res_zip}")
        print(f"Tamanho: {res_zip.stat().st_size:,} bytes")

    elif args.command == "verify":
        res = verify_backup(args.zip_path)
        print(f"Verificação concluída com sucesso: {res['status']}")
        print(json.dumps(res["manifest"], indent=2, ensure_ascii=False))

    elif args.command == "restore":
        res = restore_backup(args.zip_path, args.db, target_photos_dir=args.photos)
        print("Restauração concluída com sucesso:")
        print(json.dumps(res, indent=2, ensure_ascii=False))

    elif args.command == "retention":
        candidates = retention_candidates(args.dir, args.keep)
        for candidate in candidates:
            print(candidate)
            if args.apply:
                candidate.unlink()
        print(f"{len(candidates)} backup(s) {'removido(s)' if args.apply else 'elegível(eis); simulação sem exclusão' }.")

