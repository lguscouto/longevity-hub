"""
Testes unitários e de integração para as novas seções de Linha do Tempo,
associações pessoais, treinos e carga no construtor de contexto de IA.
Respeita estritamente o AGENTS.md.
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.secrets_store import MemorySecretsStore
from longevidade.context.associations import ContextExplanation, FactorAttribution
from longevidade.context.explanations import synthesize_explanation_with_ai
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_context_builder_includes_timeline_workouts_and_associations(tmp_path):
    db_path = tmp_path / "test_context.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # 1. Popula perfil e métricas com carga de treino
    repo.upsert_user_profile({
        "name": "Paciente Teste",
        "birthdate": "1992-05-10",
        "chronological_age": 34.0,
        "height_cm": 178.0,
    })
    repo.upsert_daily_metric({
        "date_ref": "2026-09-25",
        "steps": 8500,
        "sleep_minutes": 440,
        "rhr_bpm": 62,
        "hrv_ms": 52.0,
        "training_load_daily": 45.0,
        "training_load_rolling": 210.0,
        "source": "zepp",
    })

    # 2. Popula treino recente
    repo.upsert_workouts([{
        "id": "workout-101",
        "workout_date": "2026-09-25",
        "workout_time": "18:30",
        "category": "Musculação",
        "activity_type": "Treino de Pernas",
        "duration_min": 45.0,
        "calories": 310.0,
        "volume_kg": 4500.0,
        "sets_count": 14,
        "reps_count": 140,
        "source": "Hevy",
    }])

    # 3. Popula evento de saúde na timeline
    with repo._get_connection() as conn:
        conn.execute(
            """
            INSERT INTO health_events (
                id, timestamp, date_ref, time_ref, event_type, category, title, description, source, source_type, source_id, source_key, significance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                "evt-101",
                "2026-09-25T21:00:00Z",
                "2026-09-25",
                "21:00",
                "alcohol",
                "lifestyle",
                "Consumo de Vinho",
                "2 taças de vinho tinto seco com amigos",
                "manual",
                "manual_entry",
                "evt-101",
                "manual:evt-101",
                "notável",
            ),
        )

        # 4. Popula associação pessoal aprendida
        conn.execute(
            """
            INSERT INTO personal_associations (
                id, target_metric, factor, window_hours, sample_size,
                effect_size, correlation, shrinkage_factor, confidence,
                data_coverage_pct, mean_delta_pct, metadata_json,
                first_observation_at, last_observation_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                "assoc-101",
                "hrv_ms",
                "acute_training_load",
                48,
                25,
                0.42,
                0.28,
                1.0,
                "high",
                60.0,
                -8.5,
                '{"cohens_d": 0.42, "window_hours": 48}',
                "2026-08-01",
                "2026-09-25",
                "2026-09-25 10:00:00",
                "2026-09-25 10:00:00",
            ),
        )
        conn.commit()

    # Teste no modo FULL
    ctx_full = build_patient_clinical_context(db_path, privacy_mode="full")
    assert "Carga de Treino: Aguda recente=45.0" in ctx_full
    assert "HISTÓRICO DE TREINOS RECENTES" in ctx_full
    assert "Treino de Pernas" in ctx_full
    assert "Volume: 4500 kg" in ctx_full
    assert "EVENTOS DE CONTEXTO E LINHA DO TEMPO" in ctx_full
    assert "Consumo de Vinho: 2 taças de vinho tinto seco com amigos" in ctx_full
    assert "PADRÕES PESSOAIS E ASSOCIAÇÕES APRENDIDAS" in ctx_full
    assert "HRV (VFC)" in ctx_full or "Carga de Treino Aguda" in ctx_full

    # Teste no modo MINIMAL (deve remover descrição livre / anotação de evento)
    ctx_min = build_patient_clinical_context(db_path, privacy_mode="minimal")
    assert "2 taças de vinho tinto seco com amigos" not in ctx_min
    assert "Consumo de Vinho (Significância: notável)" in ctx_min
    assert "Modo de privacidade aplicado: minimal" in ctx_min


def test_synthesize_explanation_with_secrets_store(tmp_path):
    db_path = tmp_path / "test_synth.sqlite3"
    initialize_db(db_path)

    # Configura segredo no MemorySecretsStore
    store = MemorySecretsStore()
    store.set("openrouter", "sk-mock-valid-key")

    repo = LongevityRepository(db_path, secrets_store=store)
    repo.upsert_ai_settings({
        "active_provider": "openrouter",
        "selected_model": "deepseek/deepseek-v4-pro",
        "openrouter_api_key": "sk-mock-valid-key",
    })

    exp = ContextExplanation(
        metric="hrv_ms",
        metric_name="Variabilidade da FC (HRV)",
        unit="ms",
        target_date="2026-09-25",
        baseline_value=55.0,
        observed_value=41.0,
        delta_absolute=-14.0,
        delta_percent=-25.5,
        robust_z_score=-2.1,
        significance="significativa",
        summary_headline="HRV apresentou queda de 25.5%",
        analysis_confidence="alta",
        data_coverage_days=30,
        total_baseline_days=30,
        structured_explanation="Queda associada ao consumo de álcool.",
        factors=[
            FactorAttribution(
                factor_name="Consumo de Álcool",
                factor_key="alcohol",
                strength="forte",
                strength_score=0.85,
                summary="2 doses registradas na noite anterior",
                window_hours=24.0,
            )
        ],
        disclaimer="Correlações temporais não provam causalidade.",
    )

    with patch("longevidade.context.explanations.generate_llm_response") as mock_llm:
        mock_llm.return_value = ("Análise contextual: a queda de HRV coincide com o consumo de álcool registrado.", None)

        with repo._get_connection() as conn:
            result = synthesize_explanation_with_ai(
                exp, conn, db_path=db_path, secrets_store=store
            )

        assert result["is_ai_generated"] is True
        assert result["provider"] == "openrouter"
        assert "Análise contextual" in result["text"]
        mock_llm.assert_called_once()
        call_args = mock_llm.call_args[0]
        assert call_args[1] == "sk-mock-valid-key"
