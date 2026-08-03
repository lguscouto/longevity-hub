"""
Testes determinísticos para o Módulo de Avaliações Físicas e Fotografias Corporais.
"""

from __future__ import annotations

import io
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.config import get_db_path
from backend.app.main import app
from longevidade.assessments.service import PhysicalAssessmentService
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


@pytest.fixture
def temp_env(tmp_path: Path):
    db_path = tmp_path / "test_assessments.sqlite3"
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    service = PhysicalAssessmentService(repo, data_dir)
    return repo, service, data_dir


def _make_dummy_image(format_name="JPEG", width=100, height=100) -> bytes:
    img = Image.new("RGB", (width, height), color="blue")
    buf = io.BytesIO()
    img.save(buf, format=format_name)
    return buf.getvalue()


class TestPhysicalAssessmentRepository:
    def test_crud_assessment(self, temp_env):
        repo, _, _ = temp_env

        # 1. Create
        created = repo.create_physical_assessment({
            "assessment_date": "2026-07-28",
            "title": "Avaliação Inicial",
            "weight_kg": 78.5,
            "body_fat_percentage": 16.5,
            "waist_cm": 82.0,
            "abdomen_cm": 84.0,
            "hip_cm": 95.0,
            "notes": "Início do protocolo",
        })
        assert created["id"] is not None
        assert created["assessment_date"] == "2026-07-28"
        assert created["weight_kg"] == 78.5

        # 2. Get
        fetched = repo.get_physical_assessment(created["id"])
        assert fetched is not None
        assert fetched["title"] == "Avaliação Inicial"

        # 3. List
        listed = repo.list_physical_assessments(limit=10)
        assert len(listed) == 1

        # 4. Update
        updated = repo.update_physical_assessment(created["id"], {"weight_kg": 77.0})
        assert updated["weight_kg"] == 77.0

        # 5. Delete
        deleted = repo.delete_physical_assessment(created["id"])
        assert deleted is True
        assert repo.get_physical_assessment(created["id"]) is None


class TestPhysicalAssessmentService:
    def test_save_and_delete_photo(self, temp_env):
        repo, service, data_dir = temp_env

        assessment = service.create_assessment({"assessment_date": "2026-07-29", "title": "Teste"})

        img_bytes = _make_dummy_image("JPEG", width=200, height=150)
        photo = service.save_photo(
            assessment_id=assessment["id"],
            file_bytes=img_bytes,
            original_filename="frente.jpg",
            angle="front",
            body_state="relaxed",
            description="Foto de frente",
        )

        assert photo["id"] is not None
        assert photo["angle"] == "front"
        assert photo["width"] == 200
        assert photo["height"] == 150
        assert photo["sha256"] is not None

        file_path = service.get_photo_file_path(assessment["id"], photo["id"])
        assert file_path.is_file()

        # Delete photo
        deleted_photo = service.delete_photo(assessment["id"], photo["id"])
        assert deleted_photo is True
        assert not file_path.exists()

    def test_invalid_image_rejection(self, temp_env):
        repo, service, _ = temp_env
        assessment = service.create_assessment({"assessment_date": "2026-07-29"})

        # Empty file
        with pytest.raises(ValueError, match="vazio"):
            service.save_photo(assessment["id"], b"", "empty.jpg")

        # Corrupted file
        with pytest.raises(ValueError, match="inválido"):
            service.save_photo(assessment["id"], b"not an image file data", "fake.jpg")

    def test_oversized_image_rejection(self, temp_env):
        repo, service, _ = temp_env
        assessment = service.create_assessment({"assessment_date": "2026-07-29"})

        huge_bytes = b"0" * (16 * 1024 * 1024)
        with pytest.raises(ValueError, match="limite máximo"):
            service.save_photo(assessment["id"], huge_bytes, "huge.jpg")

    def test_path_traversal_protection(self, temp_env):
        repo, service, _ = temp_env
        assessment = service.create_assessment({"assessment_date": "2026-07-29"})

        with pytest.raises(ValueError):
            service._assessment_dir("../../../etc")

    def test_compare_assessments_manifest(self, temp_env):
        repo, service, _ = temp_env

        prev = service.create_assessment({
            "assessment_date": "2026-06-01",
            "weight_kg": 80.0,
            "body_fat_percentage": 18.0,
        })
        curr = service.create_assessment({
            "assessment_date": "2026-07-01",
            "weight_kg": 77.5,
            "body_fat_percentage": 16.0,
        })

        img_prev = _make_dummy_image("JPEG")
        img_curr = _make_dummy_image("JPEG")

        service.save_photo(prev["id"], img_prev, "prev_front.jpg", angle="front")
        service.save_photo(curr["id"], img_curr, "curr_front.jpg", angle="front")

        manifest = service.compare_assessments(prev["id"], curr["id"])

        assert manifest["days_between"] == 30
        assert manifest["deltas"]["weight_kg"] == -2.5
        assert manifest["deltas"]["body_fat_percentage"] == -2.0
        assert len(manifest["matched_photos"]) >= 1

        front_match = next(m for m in manifest["matched_photos"] if m["angle"] == "front")
        assert front_match["previous_photo"] is not None
        assert front_match["current_photo"] is not None


class TestPhysicalAssessmentEndpoints:
    @pytest.fixture
    def client(self, tmp_path: Path, monkeypatch):
        db_path = tmp_path / "test_api_assessments.sqlite3"
        initialize_db(db_path)
        monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(db_path))

        with TestClient(app) as test_client:
            yield test_client

    def test_api_assessment_flow(self, client: TestClient):
        # 1. Create Assessment
        res = client.post("/api/physical-assessments", json={
            "assessment_date": "2026-07-29",
            "title": "Avaliação Mensal",
            "weight_kg": 76.2,
        })
        assert res.status_code == 201
        created = res.json()
        assessment_id = created["id"]

        # 2. Upload Photo
        img_bytes = _make_dummy_image("JPEG")
        upload_res = client.post(
            f"/api/physical-assessments/{assessment_id}/photos",
            files={"files": ("frente.jpg", img_bytes, "image/jpeg")},
            data={"angle": "front", "body_state": "relaxed"},
        )
        assert upload_res.status_code == 201
        photos = upload_res.json()
        assert len(photos) == 1
        photo_id = photos[0]["id"]
        assert photos[0]["content_url"] == f"/api/physical-assessments/{assessment_id}/photos/{photo_id}/content"

        # 3. Stream Content
        content_res = client.get(photos[0]["content_url"])
        assert content_res.status_code == 200
        assert content_res.headers["content-type"] == "image/jpeg"

        # 4. List Assessments
        list_res = client.get("/api/physical-assessments")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 5. Delete Assessment (Cascade)
        del_res = client.delete(f"/api/physical-assessments/{assessment_id}")
        assert del_res.status_code == 204
