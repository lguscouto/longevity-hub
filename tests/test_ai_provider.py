import pytest
import os
import tempfile
import gc
from pathlib import Path
from unittest.mock import patch

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.provider_factory import generate_llm_response, validate_provider_connection


def test_ai_db_settings_and_history():
    db_file = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
    db_path = Path(db_file.name)
    db_file.close()

    try:
        initialize_db(db_path)
        repo = LongevityRepository(db_path)

        # 1. Configurações de IA Padrão
        settings = repo.get_ai_settings()
        assert settings["active_provider"] == "openrouter"
        assert settings["selected_model"] == "deepseek/deepseek-v4-pro"

        # 2. Atualiza Configurações
        repo.upsert_ai_settings({
            "active_provider": "openai",
            "selected_model": "gpt-4o-mini",
            "openai_api_key": "sk-proj-testkey123456"
        })

        updated = repo.get_ai_settings()
        assert updated["active_provider"] == "openai"
        assert updated["selected_model"] == "gpt-4o-mini"
        assert updated["openai_api_key"] == "sk-proj-testkey123456"

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
            "optimal_target": 60.0
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
        model="deepseek/deepseek-v4-pro",
        system_prompt="Prompt do sistema",
        user_prompt="Prompt do usuário"
    )

    assert err is None
    assert "HRV excelente" in res
