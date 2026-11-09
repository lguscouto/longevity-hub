from fastapi.testclient import TestClient
import pytest


def test_personal_login_success_with_willian(client: TestClient):
    """Testa login bem-sucedido com usuário willian e senha 1234."""
    response = client.post(
        "/api/personal/login",
        json={"username": "willian", "password": "1234"},
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
        json={"username": "Willian", "password": "1234"},
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
        json={"username": "outro_usuario", "password": "1234"},
    )
    assert response.status_code == 401


def test_personal_session_verification_and_logout(client: TestClient):
    """Testa fluxo completo de login, verificação de sessão ativa e logout."""
    # 1. Login
    login_resp = client.post(
        "/api/personal/login",
        json={"username": "willian", "password": "1234"},
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
