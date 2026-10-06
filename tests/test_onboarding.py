import pytest
from fastapi.testclient import TestClient


def test_get_profile_initial_onboarding_status(client: TestClient):
    """Verifica se o perfil em um banco novo inicializa com onboarding_completed = False."""
    res = client.get("/api/profile")
    assert res.status_code == 200
    data = res.json()
    assert "onboarding_completed" in data
    assert data["onboarding_completed"] is False


def test_complete_onboarding_endpoint(client: TestClient):
    """Verifica se a rota /api/profile/onboarding-complete atualiza o status para True."""
    # Inicialmente False
    res = client.get("/api/profile")
    assert res.status_code == 200
    assert res.json()["onboarding_completed"] is False

    # Conclui onboarding
    post_res = client.post("/api/profile/onboarding-complete")
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "ok"

    # Confirma que ficou True
    res2 = client.get("/api/profile")
    assert res2.status_code == 200
    assert res2.json()["onboarding_completed"] is True


def test_update_profile_with_onboarding_data(client: TestClient):
    """Verifica atualização de dados antropométricos, metas e conclusão de onboarding."""
    payload = {
        "name": "Dr. Carlos Silva",
        "birthdate": "1988-06-15",
        "gender": "Masculino",
        "height_cm": 178.0,
        "current_weight_kg": 76.5,
        "target_weight_kg": 74.0,
        "longevity_goals": ["cardiovascular", "hypertrophy"],
        "onboarding_completed": True,
    }
    update_res = client.post("/api/profile", json=payload)
    assert update_res.status_code == 200

    profile_res = client.get("/api/profile")
    assert profile_res.status_code == 200
    p = profile_res.json()
    assert p["name"] == "Dr. Carlos Silva"
    assert p["height_cm"] == 178.0
    assert p["current_weight_kg"] == 76.5
    assert p["target_weight_kg"] == 74.0
    assert p["gender"] == "Masculino"
    assert p["longevity_goals"] == ["cardiovascular", "hypertrophy"]
    assert p["onboarding_completed"] is True
    assert p["chronological_age"] is not None


def test_zepp_status_and_credentials_endpoints(client: TestClient, tmp_path, monkeypatch):
    """Verifica leitura e escrita de credenciais Zepp."""
    test_zepp_config = tmp_path / "zepp_config.json"
    monkeypatch.setenv("ZEPP_CONFIG_PATH", str(test_zepp_config))

    # Inicialmente não configurado
    status_res = client.get("/api/zepp/status")
    assert status_res.status_code == 200
    s_data = status_res.json()
    assert s_data["configured"] is False
    assert s_data["masked_app_token"] is None

    # Salva credenciais válidas
    cred_payload = {
        "app_token": "token_zepp_segredo_12345",
        "user_id": "987654321",
        "host": "api-mifit-us3.zepp.com",
    }
    save_res = client.post("/api/zepp/credentials", json=cred_payload)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["status"] == "ok"
    assert "token_" in save_data["masked_app_token"]
    assert save_data["user_id"] == "987654321"

    # Agora status_res deve indicar configurado
    status_res2 = client.get("/api/zepp/status")
    assert status_res2.status_code == 200
    s2 = status_res2.json()
    assert s2["configured"] is True
    assert s2["user_id"] == "987654321"
    assert s2["has_app_token"] is True


def test_zepp_credentials_validation(client: TestClient):
    """Valida erro 400 ao enviar campos vazios no Zepp."""
    res = client.post("/api/zepp/credentials", json={"app_token": "", "user_id": ""})
    assert res.status_code == 400
