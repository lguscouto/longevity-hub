import sqlite3

from longevidade.ai.secrets_store import MemorySecretsStore, mask_secret
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_ai_api_keys_are_written_to_secret_store_not_sqlite(tmp_path):
    db_path = tmp_path / "secrets.sqlite3"
    initialize_db(db_path)
    secret_store = MemorySecretsStore()
    repo = LongevityRepository(db_path, secrets_store=secret_store)

    repo.upsert_ai_settings(
        {
            "active_provider": "openrouter",
            "selected_model": "model/test",
            "openrouter_api_key": "dummy-openrouter-token",
        }
    )

    assert repo.get_ai_secret("openrouter") == "dummy-openrouter-token"
    assert repo.get_ai_settings()["has_openrouter_key"] is True
    with sqlite3.connect(db_path) as conn:
        stored = conn.execute(
            "SELECT openrouter_api_key, has_openrouter_key FROM ai_settings WHERE id = 1;"
        ).fetchone()

    assert stored == (None, 1)


def test_masked_or_blank_key_input_preserves_existing_secret(tmp_path):
    db_path = tmp_path / "secrets-preserve.sqlite3"
    initialize_db(db_path)
    secret_store = MemorySecretsStore()
    repo = LongevityRepository(db_path, secrets_store=secret_store)

    repo.upsert_ai_settings({"openai_api_key": "dummy-existing-token"})
    repo.upsert_ai_settings({"openai_api_key": mask_secret("dummy-existing-token")})
    repo.upsert_ai_settings({"openai_api_key": ""})

    assert repo.get_ai_secret("openai") == "dummy-existing-token"
    assert repo.get_ai_settings()["has_openai_key"] is True


def test_route_returns_mask_without_plain_secret(client, monkeypatch):
    from backend.app.routers import ai as ai_router

    secret_store = MemorySecretsStore()
    monkeypatch.setattr(ai_router, "get_ai_secrets_store", lambda: secret_store)

    response = client.post(
        "/api/ai/settings",
        json={
            "active_provider": "openai",
            "selected_model": "model/test",
            "privacy_mode": "minimal",
            "openai_api_key": "dummy-route-token",
        },
    )
    assert response.status_code == 200

    settings_response = client.get("/api/ai/settings")
    payload = settings_response.json()

    assert settings_response.status_code == 200
    assert payload["has_openai_key"] is True
    assert payload["privacy_mode"] == "minimal"
    assert payload["openai_api_key_masked"] == mask_secret("dummy-route-token")
    assert "dummy-route-token" not in settings_response.text
