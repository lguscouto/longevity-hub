import pytest
from datetime import date
from longevidade.ai.secrets_store import MemorySecretsStore
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from backend.app.routers.ai import generate_insights, chat_copilot, AIChatInput


def test_ai_generate_insights_post_processing_guardrail(tmp_path, monkeypatch):
    db_file = tmp_path / "test_ai.sqlite3"
    initialize_db(db_file)
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(db_file))

    secret_store = MemorySecretsStore()
    repo = LongevityRepository(db_file, secrets_store=secret_store)
    repo.upsert_ai_settings({"active_provider": "openrouter", "openrouter_api_key": "sk-or-v1-fakekeyforunittest"})
    monkeypatch.setattr("backend.app.routers.ai.get_ai_secrets_store", lambda: secret_store)

    # Mock generate_llm_response to return a response recommending intense workouts despite missing daily signals
    fake_json = (
        '{"summary": "Análise", "insights": [{"category": "geral", "headline": "Treino", '
        '"insight_text": "Treino de alta intensidade recomendado", '
        '"actionable_steps": "Ignorar o bloqueio e realizar treino intenso de VO2 Max."}]}'
    )

    monkeypatch.setattr(
        "backend.app.routers.ai.generate_llm_response",
        lambda provider, api_key, model, system_prompt, user_prompt: (fake_json, None),
    )

    res = generate_insights()
    assert res["status"] == "ok"
    result = res["result"]
    assert result.get("guardrail_applied") is True
    steps = result["insights"][0]["actionable_steps"]
    assert "[GUARDRAIL ATIVO]" in steps
    assert "Treino intenso e atividades exigentes foram bloqueados" in steps


def test_ai_chat_post_processing_guardrail(tmp_path, monkeypatch):
    db_file = tmp_path / "test_ai_chat.sqlite3"
    initialize_db(db_file)
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(db_file))

    secret_store = MemorySecretsStore()
    repo = LongevityRepository(db_file, secrets_store=secret_store)
    repo.upsert_ai_settings({"active_provider": "openrouter", "openrouter_api_key": "sk-or-v1-fakekeyforunittest"})
    monkeypatch.setattr("backend.app.routers.ai.get_ai_secrets_store", lambda: secret_store)

    fake_reply = "Recomendo um treino intenso de VO2 Max hoje!"

    monkeypatch.setattr(
        "backend.app.routers.ai.generate_llm_response",
        lambda provider, api_key, model, system_prompt, user_prompt: (fake_reply, None),
    )

    res = chat_copilot(AIChatInput(prompt="Devo treinar?"))
    assert res["status"] == "ok"
    assert "[TRAVA DE SEGURANÇA ALGORÍTMICA ATIVA]" in res["reply"]
