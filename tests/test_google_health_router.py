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
        assert data["connected"] is False
        assert data["authenticated"] is False
        assert data["reauthentication_required"] is False
        assert "authorized_scopes" in data
        assert data["service"] == "Google Health API"
        assert data["api_version"] == "v4"


def test_google_health_sync_unauthenticated(tmp_path: Path):
    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.post("/api/google-health/sync", json={"days": 7})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["records_inserted"] == 0
        assert "Google Health API" in data["summary"]


def test_google_health_sync_dry_run(tmp_path: Path):
    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.post("/api/google-health/sync", json={"days": 7, "dry_run": True})
        assert resp.status_code == 200
        data = resp.json()
        assert data["dry_run"] is True
        assert data["records_inserted"] == 0


def test_google_health_save_credentials(tmp_path: Path):
    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=tmp_path / "token.json"):
        resp = client.post(
            "/api/google-health/credentials",
            json={"client_id": "test_id_123.apps.googleusercontent.com", "client_secret": "test_secret_456"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["has_client_id"] is True

        # Testa geração da Auth URL
        url_resp = client.get("/api/google-health/auth-url")
        assert url_resp.status_code == 200
        url_data = url_resp.json()
        assert url_data["status"] == "ok"
        assert "accounts.google.com" in url_data["auth_url"]
        assert "test_id_123" in url_data["auth_url"]
        assert "googlehealth.sleep.readonly" in url_data["auth_url"]


def test_google_health_callback_error():
    resp = client.get("/api/google-health/callback?error=access_denied")
    assert resp.status_code == 400
    assert "Falha na Autorização" in resp.text
    assert "access_denied" in resp.text


def test_google_health_disconnect(tmp_path: Path):
    token_file = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="tok_123", client_id="cid")
    creds.save_to_file(token_file)

    with patch("longevidade.ingestion.google_health_client.get_default_token_path", return_value=token_file):
        resp = client.post("/api/google-health/disconnect")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

        # Confirma que token foi removido
        status_resp = client.get("/api/google-health/status")
        assert status_resp.json()["connected"] is False
