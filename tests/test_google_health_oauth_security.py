from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.app.routers.google_health import OAuthStateManager, oauth_state_manager
from longevidade.ingestion.google_health_client import GoogleHealthCredentials


def test_oauth_state_generation(client: TestClient):
    auth_resp = client.get("/api/google-health/auth-url?client_id=test_id")
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    state = data.get("state")
    assert state is not None
    assert len(state) >= 32
    assert f"state={state}" in data["auth_url"]


def test_oauth_state_validation_and_single_use(client: TestClient):
    auth_resp = client.get("/api/google-health/auth-url?client_id=test_id")
    state = auth_resp.json()["state"]

    # 1. Primeira chamada com state válido (retorna 400 por código ausente, mas state é validado e consumido)
    resp1 = client.get(f"/api/google-health/callback?state={state}")
    assert resp1.status_code == 400
    assert "Código de autorização ausente" in resp1.text

    # 2. Reutilização do mesmo state (deve ser rejeitado por uso único)
    resp2 = client.get(f"/api/google-health/callback?state={state}&error=replayed")
    assert resp2.status_code == 400
    assert "Falha de validação CSRF (state)" in resp2.text
    assert "já utilizado" in resp2.text or "inválido" in resp2.text


def test_oauth_state_missing_rejected(client: TestClient):
    resp = client.get("/api/google-health/callback?error=some_error")
    assert resp.status_code == 400
    assert "Falha de validação CSRF (state)" in resp.text
    assert "Parâmetro state ausente" in resp.text


def test_oauth_state_invalid_rejected(client: TestClient):
    resp = client.get("/api/google-health/callback?state=fake_state_12345&error=test")
    assert resp.status_code == 400
    assert "Falha de validação CSRF (state)" in resp.text
    assert "inválido" in resp.text


def test_oauth_state_expiration(client: TestClient):
    manager = OAuthStateManager(ttl_seconds=1)
    st = manager.generate_state()

    # Simula passagem de tempo acima do TTL
    with manager._lock:
        manager._states[st] = datetime.now(timezone.utc) - timedelta(seconds=5)

    valid, reason = manager.validate_and_consume(st)
    assert valid is False
    assert "expirado" in reason or "inválido" in reason


def test_callback_xss_sanitization(client: TestClient):
    auth_resp = client.get("/api/google-health/auth-url?client_id=test_id")
    state = auth_resp.json()["state"]

    xss_payload = "<script>alert('pwned')</script>\"'\\<img src=x onerror=alert(1)>"
    resp = client.get("/api/google-health/callback", params={"state": state, "error": xss_payload})

    assert resp.status_code == 400
    # O script malicioso não deve existir literal e desescapado no HTML
    assert "<script>alert('pwned')</script>" not in resp.text
    assert "&lt;script&gt;alert(&#x27;pwned&#x27;)&lt;/script&gt;" in resp.text or "&lt;script&gt;" in resp.text
    # O postMessage deve conter JSON seguro com escapes de caracteres de script
    from backend.app.routers.google_health import safe_json_for_script
    assert safe_json_for_script(xss_payload) in resp.text


def test_post_message_origin_restricted(client: TestClient, tmp_path: Path):
    auth_resp = client.get("/api/google-health/auth-url?client_id=test_cid&client_secret=test_sec")
    state = auth_resp.json()["state"]

    token_file = tmp_path / "token_sec.json"
    initial_creds = GoogleHealthCredentials(client_id="test_cid", client_secret="test_sec")
    initial_creds.save_to_file(token_file)

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps({"access_token": "ya29.valid", "expires_in": 3600}).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = False

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        with patch("backend.app.routers.google_health.urlopen", return_value=mock_resp):
            resp = client.get(f"/api/google-health/callback?code=mock_code&state={state}")
            assert resp.status_code == 200
            # Verifica que o postMessage restringe a origem usando window.location.origin
            assert "window.location.origin" in resp.text
            assert "postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin)" in resp.text
