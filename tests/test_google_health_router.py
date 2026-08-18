from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.main import app
from longevidade.ingestion.google_health_client import GoogleHealthCredentials

client = TestClient(app)


def test_google_health_status_unauthenticated(tmp_path: Path):
    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.get("/api/google-health/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["authenticated"] is False
        assert data["service"] == "Google Health API"
        assert data["api_version"] == "v4"


def test_google_health_sync_unauthenticated(tmp_path: Path):
    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.post("/api/google-health/sync", json={"days": 7})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "AVISO"
        assert data["records_inserted"] == 0
