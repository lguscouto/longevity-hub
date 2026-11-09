from __future__ import annotations

import json
from pathlib import Path
import sqlite3
import zipfile

import pytest

from longevidade.backup import (
    BackupIntegrityError,
    create_backup,
    restore_backup,
    verify_backup,
)
from longevidade.db.schema import initialize_db


def test_backup_and_restore_cycle(tmp_path: Path):
    # 1. Cria banco de dados de teste e popula alguns dados
    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    db_file = orig_dir / "longevity.sqlite3"
    initialize_db(db_file)

    conn = sqlite3.connect(db_file)
    with conn:
        conn.execute("UPDATE user_profile SET name = 'Paciente Backup Teste' WHERE id = 1;")
        conn.execute(
            "INSERT INTO lab_results (collected_at, metric_key, metric_name, value, unit, record_origin) "
            "VALUES ('2026-05-01', 'fasting_glucose', 'Glicemia', 88.0, 'mg/dL', 'patient_lab');"
        )
    conn.close()

    # Cria diretório de fotos sintéticas
    photos_dir = orig_dir / "physical_assessments" / "ass_123"
    photos_dir.mkdir(parents=True)
    photo_file = photos_dir / "front_relaxed.jpg"
    photo_file.write_bytes(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xDB\x00C\x00dummyphoto")

    # 2. Executa create_backup
    backup_zip = tmp_path / "backups" / "longevidade_backup.zip"
    created_path = create_backup(
        db_path=db_file,
        output_zip=backup_zip,
        photos_dir=orig_dir / "physical_assessments",
        notes="Teste de backup consistente",
    )
    assert created_path.exists()
    assert created_path == backup_zip

    # 3. Executa verify_backup
    verify_res = verify_backup(backup_zip)
    assert verify_res["status"] == "valid"
    manifest = verify_res["manifest"]
    assert manifest["notes"] == "Teste de backup consistente"
    assert manifest["database"]["integrity_check"] == "ok"
    assert manifest["photos_count"] == 1

    # 4. Restaura em um novo local
    restore_dir = tmp_path / "restored"
    target_db = restore_dir / "restored.sqlite3"
    target_photos = restore_dir / "restored_photos"

    restore_res = restore_backup(
        zip_path=backup_zip,
        target_db_path=target_db,
        target_photos_dir=target_photos,
    )
    assert restore_res["status"] == "success"
    assert target_db.exists()

    # Valida que os dados restaurados conferem exatamente
    restored_conn = sqlite3.connect(target_db)
    user_row = restored_conn.execute("SELECT name FROM user_profile WHERE id = 1;").fetchone()
    assert user_row[0] == "Paciente Backup Teste"
    lab_row = restored_conn.execute("SELECT metric_key, value FROM lab_results WHERE metric_key = 'fasting_glucose';").fetchone()
    assert lab_row[0] == "fasting_glucose"
    assert lab_row[1] == 88.0
    restored_conn.close()

    # Valida restauração das fotos
    restored_photo = target_photos / "ass_123" / "front_relaxed.jpg"
    assert restored_photo.exists()
    assert restored_photo.read_bytes() == photo_file.read_bytes()


def test_verify_detects_corrupted_hash(tmp_path: Path):
    db_file = tmp_path / "source.sqlite3"
    initialize_db(db_file)

    backup_zip = tmp_path / "tampered.zip"
    create_backup(db_path=db_file, output_zip=backup_zip)

    # Adultera o manifesto dentro do ZIP trocando o hash esperado
    tampered_zip = tmp_path / "tampered_bad_hash.zip"
    with zipfile.ZipFile(backup_zip, "r") as zin:
        with zipfile.ZipFile(tampered_zip, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "manifest.json":
                    manifest = json.loads(data.decode("utf-8"))
                    manifest["database"]["sha256"] = "0" * 64
                    data = json.dumps(manifest).encode("utf-8")
                zout.writestr(item, data)

    with pytest.raises(BackupIntegrityError, match="Incompatibilidade de hash SHA-256"):
        verify_backup(tampered_zip)


def test_restore_cleans_stale_wal_and_shm(tmp_path: Path):
    # Cria banco de origem e gera backup
    orig_dir = tmp_path / "orig"
    orig_dir.mkdir()
    source_db = orig_dir / "longevity.sqlite3"
    initialize_db(source_db)

    conn = sqlite3.connect(source_db)
    with conn:
        conn.execute("UPDATE user_profile SET name = 'Paciente Sem WAL Corrompido' WHERE id = 1;")
    conn.close()

    backup_zip = tmp_path / "backup_clean.zip"
    create_backup(db_path=source_db, output_zip=backup_zip)

    # Cria destino com arquivos residuais/órfãos de WAL e SHM
    dest_dir = tmp_path / "dest"
    dest_dir.mkdir()
    dest_db = dest_dir / "target.sqlite3"
    dest_wal = dest_dir / "target.sqlite3-wal"
    dest_shm = dest_dir / "target.sqlite3-shm"
    dest_wal.write_text("corrupted old wal from crashed process")
    dest_shm.write_text("corrupted old shm from crashed process")

    # Restaura sobre o destino com lixo residual de WAL
    res = restore_backup(zip_path=backup_zip, target_db_path=dest_db)
    assert res["status"] == "success"

    # Confere que os resíduos foram removidos na restauração
    assert not dest_wal.exists()
    assert not dest_shm.exists()

    # Confere que o banco restaurado abre e responde normalmente sem disk I/O error
    restored_conn = sqlite3.connect(dest_db)
    row = restored_conn.execute("SELECT name FROM user_profile WHERE id = 1;").fetchone()
    assert row[0] == "Paciente Sem WAL Corrompido"
    restored_conn.close()

