import gc
import json
import os
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from backend.app.config import get_db_path
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.provider_factory import generate_llm_response, validate_provider_connection
from longevidade.ai.secrets_store import MemorySecretsStore, mask_secret
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_ai_db_settings_and_history():
    db_file = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
    db_path = Path(db_file.name)
    db_file.close()

    try:
        initialize_db(db_path)
        secret_store = MemorySecretsStore()
        repo = LongevityRepository(db_path, secrets_store=secret_store)

        # 1. Configurações de IA Padrão sem segredos em texto claro
        settings = repo.get_ai_settings()
        assert settings["active_provider"] == "openrouter"
        assert settings["selected_model"] == "deepseek/deepseek-v4-flash-0731"
        assert settings["has_openai_key"] is False
        assert "openai_api_key" not in settings

        # 2. Atualiza Configurações: a chave vai para o cofre, não para o SQLite
        repo.upsert_ai_settings({
            "active_provider": "openai",
            "selected_model": "gpt-4o-mini",
            "privacy_mode": "minimal",
            "openai_api_key": "fixture-secret-value"
        })

        updated = repo.get_ai_settings()
        assert updated["active_provider"] == "openai"
        assert updated["selected_model"] == "gpt-4o-mini"
        assert updated["privacy_mode"] == "minimal"
        assert updated["has_openai_key"] is True
        assert repo.get_ai_secret("openai") == "fixture-secret-value"
        assert secret_store.get("openai") == "fixture-secret-value"

        with sqlite3.connect(db_path) as conn:
            row = conn.execute("SELECT openai_api_key, has_openai_key FROM ai_settings WHERE id = 1;").fetchone()
            assert row[0] is None
            assert row[1] == 1

        # 3. Salva Insight no Histórico
        insight_id = repo.save_ai_insight({
            "provider_used": "openai",
            "model_used": "gpt-4o-mini",
            "category": "sono_hrv",
            "headline": "HRV Otimizada",
            "insight_text": "Sua HRV noturna subiu para 68ms.",
            "actionable_steps": "Manter janela de sono consistente.",
            "user_prompt": "Análise automatizada"
        })
        assert insight_id > 0

        history = repo.get_ai_insights_history()
        assert len(history) == 1
        assert history[0]["category"] == "sono_hrv"
        assert history[0]["headline"] == "HRV Otimizada"

    finally:
        gc.collect()
        if db_path.exists():
            try:
                os.unlink(db_path)
            except OSError:
                pass


def test_ai_settings_route_masks_secret_store_values(client, monkeypatch):
    from backend.app.routers import ai as ai_router

    secret_store = MemorySecretsStore()
    monkeypatch.setattr(ai_router, "get_ai_secrets_store", lambda: secret_store)

    response = client.post(
        "/api/ai/settings",
        json={
            "active_provider": "openai",
            "selected_model": "gpt-4o-mini",
            "privacy_mode": "minimal",
            "openai_api_key": "fixture-secret-value",
        },
    )
    assert response.status_code == 200
    assert secret_store.get("openai") == "fixture-secret-value"

    settings_response = client.get("/api/ai/settings")
    assert settings_response.status_code == 200
    payload = settings_response.json()
    assert payload["has_openai_key"] is True
    assert payload["privacy_mode"] == "minimal"
    assert payload["openai_api_key_masked"] == mask_secret("fixture-secret-value")
    assert "fixture-secret-value" not in settings_response.text

    with sqlite3.connect(get_db_path()) as conn:
        row = conn.execute("SELECT openai_api_key, has_openai_key FROM ai_settings WHERE id = 1;").fetchone()
        assert row[0] is None
        assert row[1] == 1


def test_clinical_context_builder():
    db_file = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
    db_path = Path(db_file.name)
    db_file.close()

    try:
        initialize_db(db_path)
        repo = LongevityRepository(db_path)

        # Adiciona dados simulados
        repo.add_lab_result({
            "collected_at": "2026-07-28",
            "metric_key": "apob",
            "metric_name": "Apolipoproteína B",
            "value": 58.0,
            "unit": "mg/dL",
            "optimal_target": 60.0,
            "record_origin": "patient_lab",
        })

        context = build_patient_clinical_context(db_path)
        assert "PERFIL DO PACIENTE" in context
        assert "Apolipoproteína B: 58.0 mg/dL" in context
        assert "IDADE EPIGENÉTICA E BIOLÓGICA (PHENOAGE + KDM)" in context

    finally:
        gc.collect()
        if db_path.exists():
            try:
                os.unlink(db_path)
            except OSError:
                pass


@patch("longevidade.ai.provider_factory._http_post")
def test_mock_llm_generation(mock_post):
    mock_post.return_value = ({
        "choices": [{"message": {"content": "Análise concluída com sucesso: HRV excelente."}}]
    }, None)

    res, err = generate_llm_response(
        provider="openrouter",
        api_key="sk-or-v1-mockkey",
        model="deepseek/deepseek-v4-flash-0731",
        system_prompt="Prompt do sistema",
        user_prompt="Prompt do usuário"
    )

    assert err is None
    assert "HRV excelente" in res


def test_test_connection_falls_back_to_secret_store(client, monkeypatch):
    from backend.app.routers import ai as ai_router

    secret_store = MemorySecretsStore()
    secret_store.set("openai", "stored-secret-key")
    monkeypatch.setattr(ai_router, "get_ai_secrets_store", lambda: secret_store)

    with patch("backend.app.routers.ai.validate_provider_connection") as mock_val:
        mock_val.return_value = (True, "Conexão validada")
        response = client.post(
            "/api/ai/test-connection",
            json={
                "provider": "openai",
                "api_key": "sk-proj-****masked****",
                "model": "gpt-4o",
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "message": "Conexão validada"}
        mock_val.assert_called_once_with(
            provider="openai",
            api_key="stored-secret-key",
            model="gpt-4o",
        )


def test_ai_reports_endpoints(client, monkeypatch):
    from backend.app.config import get_db_path

    repo = LongevityRepository(get_db_path())

    # 1. Quando vazio
    res = client.get("/api/ai/reports/latest")
    assert res.status_code == 200
    assert res.json() == {"status": "empty", "result": None}

    # 2. Salva um relatório
    report_id = repo.save_ai_report({
        "provider": "openrouter",
        "model": "deepseek/deepseek-v4-flash-0731",
        "privacy_mode": "minimal",
        "summary": "Excelente recuperação autonômica.",
        "report_json": {
            "summary": "Excelente recuperação autonômica.",
            "insights": [
                {
                    "category": "sono_hrv",
                    "headline": "HRV Alta",
                    "insight_text": "HRV de 75ms.",
                    "actionable_steps": "Mantenha o horário de sono."
                }
            ]
        }
    })
    assert report_id > 0

    # 3. Consulta latest
    res_latest = client.get("/api/ai/reports/latest")
    assert res_latest.status_code == 200
    payload = res_latest.json()
    assert payload["id"] == report_id
    assert payload["summary"] == "Excelente recuperação autonômica."
    assert payload["result"]["insights"][0]["headline"] == "HRV Alta"

    # 4. Lista relatórios
    res_list = client.get("/api/ai/reports")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 5. Consulta por id
    res_single = client.get(f"/api/ai/reports/{report_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == report_id


def test_generate_insights_with_time_windows(client, monkeypatch):
    from backend.app.config import get_db_path
    from backend.app.routers import ai as ai_router
    from longevidade.ai.safety_policy import TrainingSafetyDecision

    secret_store = MemorySecretsStore()
    secret_store.set("openrouter", "mock-openrouter-key")
    monkeypatch.setattr(ai_router, "get_ai_secrets_store", lambda: secret_store)
    monkeypatch.setattr(
        ai_router,
        "_current_training_safety",
        lambda repo: TrainingSafetyDecision(
            restricted=False,
            reason_code=None,
            guidance={"state": "green", "confidence": "high"},
            energy={"status": "optimal"},
        ),
    )

    mock_llm_response = (
        json.dumps({
            "summary": "Análise semanal positiva.",
            "insights": [
                {
                    "category": "sono_hrv",
                    "headline": "Semana com bom sono",
                    "insight_text": "Média de 7.8h de sono.",
                    "actionable_steps": "Continue a rotina.",
                }
            ],
        }),
        None,
    )

    with patch("backend.app.routers.ai.generate_llm_response", return_value=mock_llm_response) as mock_llm:
        res = client.post("/api/ai/generate-insights", json={"time_window": "7d"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["time_window"] == "7d"
        assert data["id"] > 0
        assert data["result"]["summary"] == "Análise semanal positiva."

        call_kwargs = mock_llm.call_args[1]
        assert "MÉDIA SEMANAL" in call_kwargs["user_prompt"]

        repo = LongevityRepository(get_db_path())
        saved_report = repo.get_ai_report_by_id(data["id"])
        assert saved_report["time_window"] == "7d"



