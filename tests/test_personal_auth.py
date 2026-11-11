from fastapi.testclient import TestClient
import pytest
import importlib
import sqlite3
from datetime import datetime, timedelta


@pytest.fixture(autouse=True)
def nondefault_trainer_account(client: TestClient):
    auth = importlib.import_module("backend.app.routers.personal_auth")
    conn = auth._get_connection()
    try:
        auth._ensure_trainer_accounts_table(conn)
        conn.execute("UPDATE personal_trainer_accounts SET password_hash=? WHERE username=?", (auth.hash_password("test-trainer-password"), "willian"))
        conn.commit()
    finally:
        conn.close()


def test_personal_login_success_with_willian(client: TestClient):
    """Testa login bem-sucedido com usuário willian e senha 1234."""
    response = client.post(
        "/api/personal/login",
        json={"username": "willian", "password": "test-trainer-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["username"] == "willian"
    assert data["role"] == "personal_trainer"
    assert "token" in data
    assert len(data["token"]) >= 32


def test_personal_login_case_insensitive_username(client: TestClient):
    """Testa que o nome de usuário é tratado de forma insensível a maiúsculas."""
    response = client.post(
        "/api/personal/login",
        json={"username": "Willian", "password": "test-trainer-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["username"] == "willian"


def test_personal_login_invalid_password(client: TestClient):
    """Testa falha de autenticação com senha incorreta."""
    response = client.post(
        "/api/personal/login",
        json={"username": "willian", "password": "wrong_password"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "incorretos" in data["detail"]


def test_personal_login_unknown_user(client: TestClient):
    """Testa falha de autenticação com usuário inexistente."""
    response = client.post(
        "/api/personal/login",
        json={"username": "outro_usuario", "password": "test-trainer-password"},
    )
    assert response.status_code == 401


def test_personal_login_fails_closed_when_database_unavailable(client: TestClient, monkeypatch):
    personal_auth = importlib.import_module("backend.app.routers.personal_auth")

    def fail_database():
        raise sqlite3.OperationalError("database unavailable")

    monkeypatch.setattr(personal_auth, "_get_connection", fail_database)
    response = client.post("/api/personal/login", json={"username": "willian", "password": "test-trainer-password"})
    assert response.status_code == 503
    assert "token" not in response.json()


def test_expired_session_cannot_change_password(client: TestClient):
    personal_auth = importlib.import_module("backend.app.routers.personal_auth")
    login = client.post("/api/personal/login", json={"username": "willian", "password": "test-trainer-password"})
    assert login.status_code == 200
    token = login.json()["token"]
    personal_auth._ACTIVE_TRAINER_SESSIONS[token]["expires_at"] = (datetime.now() - timedelta(seconds=1)).isoformat()
    response = client.post("/api/personal/change-password", headers={"X-Personal-Token": token},
                           json={"current_password": "test-trainer-password", "new_password": "different-password"})
    assert response.status_code == 401
    assert token not in personal_auth._ACTIVE_TRAINER_SESSIONS
    assert client.post("/api/personal/login", json={"username": "willian", "password": "test-trainer-password"}).status_code == 200


def test_password_change_revokes_other_sessions(client: TestClient):
    credentials = {"username": "willian", "password": "test-trainer-password"}
    current = client.post("/api/personal/login", json=credentials).json()["token"]
    other = client.post("/api/personal/login", json=credentials).json()["token"]
    response = client.post("/api/personal/change-password", headers={"X-Personal-Token": current},
                           json={"current_password": "test-trainer-password", "new_password": "new-test-password"})
    assert response.status_code == 200
    assert client.get("/api/personal/session", headers={"X-Personal-Token": other}).status_code == 401
    assert client.get("/api/personal/session", headers={"X-Personal-Token": current}).status_code == 200
    assert client.post("/api/personal/login", json=credentials).status_code == 401


def test_personal_session_verification_and_logout(client: TestClient):
    """Testa fluxo completo de login, verificação de sessão ativa e logout."""
    # 1. Login
    login_resp = client.post(
        "/api/personal/login",
        json={"username": "willian", "password": "test-trainer-password"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]

    # 2. Verifica sessão com header X-Personal-Token
    sess_resp = client.get(
        "/api/personal/session",
        headers={"X-Personal-Token": token},
    )
    assert sess_resp.status_code == 200
    assert sess_resp.json()["authenticated"] is True
    assert sess_resp.json()["username"] == "willian"

    # 3. Verifica sessão com Bearer Authorization
    bearer_resp = client.get(
        "/api/personal/session",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bearer_resp.status_code == 200

    # 4. Logout
    logout_resp = client.post(
        "/api/personal/logout",
        headers={"X-Personal-Token": token},
    )
    assert logout_resp.status_code == 200

    # 5. Sessão após logout deve retornar 401
    after_logout = client.get(
        "/api/personal/session",
        headers={"X-Personal-Token": token},
    )
    assert after_logout.status_code == 401
