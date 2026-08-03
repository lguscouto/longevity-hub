from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_minimal_privacy_context_removes_direct_identifiers(tmp_path):
    db_path = tmp_path / "privacy.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    repo.upsert_user_profile(
        {
            "name": "Pessoa Ficticia Teste",
            "email": "pessoa.ficticia@example.invalid",
            "birthdate": "1990-01-02",
            "chronological_age": 36.0,
            "height_cm": 180.0,
        }
    )
    repo.upsert_daily_metric(
        {
            "date_ref": "2026-07-29",
            "steps": 7100,
            "sleep_minutes": 420,
            "rhr_bpm": 58,
            "hrv_ms": 61.2,
            "source": "fixture",
        }
    )

    context = build_patient_clinical_context(db_path, privacy_mode="minimal")

    assert "Modo de privacidade aplicado: minimal" in context
    assert "Identificadores diretos removidos" in context
    assert "Pessoa Ficticia Teste" not in context
    assert "pessoa.ficticia@example.invalid" not in context
    assert "1990-01-02" not in context
    assert "ÚLTIMOS 3 DIAS" in context
    assert "Omitido por privacy_mode=minimal" in context


def test_full_privacy_context_is_explicit_opt_in_for_identifiers(tmp_path):
    db_path = tmp_path / "privacy-full.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    repo.upsert_user_profile(
        {
            "name": "Pessoa Ficticia Teste",
            "email": "pessoa.ficticia@example.invalid",
            "birthdate": "1990-01-02",
            "chronological_age": 36.0,
        }
    )
    repo.upsert_daily_metric(
        {
            "date_ref": "2026-07-29",
            "steps": 5300,
            "sleep_minutes": 390,
            "rhr_bpm": 60,
            "hrv_ms": 49.1,
            "source": "fixture",
        }
    )

    context = build_patient_clinical_context(db_path, privacy_mode="full")

    assert "Modo de privacidade aplicado: full" in context
    assert "Pessoa Ficticia Teste" in context
    assert "1990-01-02" in context
    assert "ÚLTIMOS 14 DIAS" in context
