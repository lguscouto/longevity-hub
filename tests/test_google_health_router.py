from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.main import app
from longevidade.ingestion.google_health_client import GoogleHealthCredentials

def test_google_health_status_unauthenticated(client: TestClient, tmp_path: Path):
    with patch("backend.app.routers.google_health.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.get("/api/google-health/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is False
        assert data["authenticated"] is False
        assert data["reauthentication_required"] is False
        assert "authorized_scopes" in data
        assert data["service"] == "Google Health API"
        assert data["api_version"] == "v4"


def test_google_health_sync_unauthenticated(client: TestClient, tmp_path: Path):
    with patch("backend.app.routers.google_health.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.post("/api/google-health/sync", json={"days": 7})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["records_inserted"] == 0
        assert "Google Health API" in data["summary"]


def test_google_health_sync_dry_run(client: TestClient, tmp_path: Path):
    with patch("backend.app.routers.google_health.get_default_token_path", return_value=tmp_path / "absent.json"):
        resp = client.post("/api/google-health/sync", json={"days": 7, "dry_run": True})
        assert resp.status_code == 200
        data = resp.json()
        assert data["dry_run"] is True
        assert data["records_inserted"] == 0


def test_google_health_save_credentials(client: TestClient, tmp_path: Path):
    with patch("backend.app.routers.google_health.get_default_token_path", return_value=tmp_path / "token.json"):
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


def test_google_health_callback_error(client: TestClient):
    resp = client.get("/api/google-health/callback?error=access_denied")
    assert resp.status_code == 400
    assert "Falha na Autorização" in resp.text
    assert "access_denied" in resp.text


def test_google_health_disconnect(client: TestClient, tmp_path: Path):
    token_file = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="tok_123", client_id="cid")
    creds.save_to_file(token_file)

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        resp = client.post("/api/google-health/disconnect")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

        # Confirma que token foi removido
        status_resp = client.get("/api/google-health/status")
        assert status_resp.json()["connected"] is False


def test_google_health_status_partial_consent(client: TestClient, tmp_path: Path):
    from longevidade.ingestion.google_health_registry import SCOPE_ACTIVITY, SCOPE_SLEEP

    token_file = tmp_path / "partial_token.json"
    creds = GoogleHealthCredentials(
        client_id="cid_123",
        access_token="tok_valid",
        scopes=[SCOPE_ACTIVITY, SCOPE_SLEEP],
    )
    creds.save_to_file(token_file)

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        resp = client.get("/api/google-health/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is True
        assert data["authenticated"] is True
        assert data["token_valid"] is True
        assert data["scopes"] == {
            "activity": True,
            "health_metrics": False,
            "sleep": True,
            "nutrition": False,
        }


def test_google_health_auth_url_incremental_scopes(client: TestClient, tmp_path: Path):
    with patch("backend.app.routers.google_health.get_default_token_path", return_value=tmp_path / "token.json"):
        url_resp = client.get("/api/google-health/auth-url?client_id=test_cid.apps.googleusercontent.com")
        assert url_resp.status_code == 200
        url_data = url_resp.json()
        assert url_data["status"] == "ok"
        assert "include_granted_scopes=true" in url_data["auth_url"]
        assert "prompt=consent" in url_data["auth_url"]
        assert "access_type=offline" in url_data["auth_url"]


def test_google_health_callback_partial_consent_success(client: TestClient, tmp_path: Path):
    import json
    from unittest.mock import MagicMock
    from longevidade.ingestion.google_health_registry import SCOPE_ACTIVITY

    token_file = tmp_path / "token.json"
    initial_creds = GoogleHealthCredentials(client_id="cid", client_secret="secret")
    initial_creds.save_to_file(token_file)

    token_response = {
        "access_token": "ya29.partial_token",
        "refresh_token": "1//refresh_token_xyz",
        "expires_in": 3600,
        "token_type": "Bearer",
        "scope": SCOPE_ACTIVITY,
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(token_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = False

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        with patch("backend.app.routers.google_health.urlopen", return_value=mock_resp):
            resp = client.get("/api/google-health/callback?code=mock_code_123")
            assert resp.status_code == 200
            assert "Conectado com Sucesso" in resp.text

            saved_creds = GoogleHealthCredentials.from_file(token_file)
            assert saved_creds is not None
            assert saved_creds.access_token == "ya29.partial_token"
            assert saved_creds.token_type == "Bearer"
            assert saved_creds.scopes == [SCOPE_ACTIVITY]
            assert saved_creds.has_scope("activity") is True
            assert saved_creds.has_scope("sleep") is False

