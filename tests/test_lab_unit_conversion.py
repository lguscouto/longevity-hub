import json
from datetime import date
import pytest
from longevidade.db.repository import LongevityRepository
from backend.app.config import get_db_path
from longevidade.metrics.unit_conversion import convert_biomarker_unit, validate_phenoage_lab_unit


@pytest.mark.parametrize("marker", [
    "glucose_mgdl", "creatinine_mgdl", "albumin_gdl", "hscrp_mgl",
    "lymphocyte_pct", "mcv_fl", "rdw_pct", "alk_phos_ul", "wbc_1000ul",
])
def test_every_phenoage_marker_rejects_incompatible_units(marker):
    with pytest.raises(ValueError, match=marker):
        validate_phenoage_lab_unit(marker, "kg")


def test_whole_cell_units_are_converted_even_for_small_values():
    result = convert_biomarker_unit("wbc", 5, "cells/uL")
    assert result.value == pytest.approx(0.005)


@pytest.mark.parametrize("invalid_unit", [None, "", "g/L", "mmol/mol", "unidade desconhecida"])
def test_rejects_invalid_phenoage_units_before_inserting_any_record(client, invalid_unit):
    records = _full_phenoage_panel_raw_mmol()
    records[-1]["unit"] = invalid_unit
    response = client.post("/api/labs/batch", json={"records": records})
    assert response.status_code == 422
    assert "wbc_1000ul" in response.json()["detail"]
    assert LongevityRepository(get_db_path()).get_lab_results(limit=20) == []


def test_equivalent_panels_produce_same_phenoage_and_keep_raw_values(client):
    records = _full_phenoage_panel_raw_mmol()
    first = client.post("/api/labs/batch", json={"chronological_age": 40, "records": records})
    assert first.status_code == 200
    canonical = [dict(record) for record in records]
    for index, value, unit in [(0, 90.0, "mg/dL"), (1, 1.0, "mg/dL"), (2, 4.5, "g/dL"), (3, 1.5, "mg/L"), (8, 6.0, "10^3/uL")]:
        canonical[index].update(value=value, unit=unit)
    for record in canonical:
        record["collected_at"] = "2026-11-02"
    second = client.post("/api/labs/batch", json={"chronological_age": 40, "records": canonical})
    assert second.status_code == 200
    assert first.json()["phenoage"]["pheno_age"] == second.json()["phenoage"]["pheno_age"]
    labs = LongevityRepository(get_db_path()).get_lab_results(limit=20)
    glucose = next(r for r in labs if r["metric_key"] == "glucose_mgdl" and r["collected_at"] == "2026-11-01")
    assert glucose["raw_value"] == 4.995
    assert glucose["raw_unit"] == "mmol/L"


def _full_phenoage_panel_raw_mmol(collected_at: str = "2026-11-01"):
    return [
        {"collected_at": collected_at, "metric_key": "glucose", "value": 4.995, "unit": "mmol/L"},
        {"collected_at": collected_at, "metric_key": "creatinine", "value": 88.4, "unit": "umol/L"},
        {"collected_at": collected_at, "metric_key": "albumin", "value": 45.0, "unit": "g/L"},
        {"collected_at": collected_at, "metric_key": "hscrp", "value": 0.15, "unit": "mg/dL"},
        {"collected_at": collected_at, "metric_key": "lymphocyte_pct", "value": 30.0, "unit": "%"},
        {"collected_at": collected_at, "metric_key": "mcv", "value": 89.0, "unit": "fL"},
        {"collected_at": collected_at, "metric_key": "rdw", "value": 12.5, "unit": "%"},
        {"collected_at": collected_at, "metric_key": "alk_phos", "value": 65.0, "unit": "U/L"},
        {"collected_at": collected_at, "metric_key": "wbc", "value": 6000, "unit": "cells/ul"},
    ]


def test_lab_batch_unit_conversion_and_raw_preservation(client):
    """Verifica que 4.995 mmol/L de glicose e outros biomarcadores são normalizados para mg/dL

    e que raw_value e raw_unit preservam exatamente o valor original.
    """
    repo = LongevityRepository(get_db_path())
    repo.upsert_user_profile({"id": 1, "birthdate": "1986-11-01", "name": "Paciente Teste"})

    payload = {
        "records": _full_phenoage_panel_raw_mmol("2026-11-01"),
    }

    res = client.post("/api/labs/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["inserted"] == 9

    # Verificar que PhenoAge foi calculado usando o valor normalizado
    pheno = data["phenoage"]
    assert pheno["status"] == "complete"
    assert pheno["chronological_age"] == 40.0  # (2026-1986)
    assert isinstance(pheno["pheno_age"], float)
    # Se glicose não tivesse sido convertida (4.995 mg/dL), o cálculo resultaria em anomalia severa
    assert 20.0 < pheno["pheno_age"] < 60.0

    # Inspecionar registros persistidos no SQLite
    stored_labs = repo.get_lab_results(limit=20)
    labs_by_key = {r["metric_key"]: r for r in stored_labs}

    # 1. Glicose: 4.995 mmol/L -> 90.0 mg/dL
    glucose_rec = labs_by_key["glucose_mgdl"]
    assert round(glucose_rec["value"], 1) == 90.0
    assert glucose_rec["unit"] == "mg/dL"
    assert glucose_rec["raw_value"] == 4.995
    assert glucose_rec["raw_unit"] == "mmol/L"

    # 2. Creatinina: 88.4 umol/L -> 1.0 mg/dL
    creat_rec = labs_by_key["creatinine_mgdl"]
    assert round(creat_rec["value"], 2) == 1.0
    assert creat_rec["unit"] == "mg/dL"
    assert creat_rec["raw_value"] == 88.4
    assert creat_rec["raw_unit"] == "umol/L"

    # 3. Albumina: 45.0 g/L -> 4.5 g/dL
    alb_rec = labs_by_key["albumin_gdl"]
    assert round(alb_rec["value"], 1) == 4.5
    assert alb_rec["unit"] == "g/dL"
    assert alb_rec["raw_value"] == 45.0
    assert alb_rec["raw_unit"] == "g/L"

    # 4. PCR-us: 0.15 mg/dL -> 1.5 mg/L
    crp_rec = labs_by_key["hscrp_mgl"]
    assert round(crp_rec["value"], 1) == 1.5
    assert crp_rec["unit"] == "mg/L"
    assert crp_rec["raw_value"] == 0.15
    assert crp_rec["raw_unit"] == "mg/dL"

    # 5. Leucócitos: 6000 cells/ul -> 6.0 10³/µL
    wbc_rec = labs_by_key["wbc_1000ul"]
    assert round(wbc_rec["value"], 1) == 6.0
    assert wbc_rec["raw_value"] == 6000


def test_phenoage_requires_age_and_never_defaults_to_40(client):
    """Sem birthdate e sem chronological_age no payload ou perfil, PhenoAge retorna incomplete

    com missing: ['chronological_age'] sem inventar 40.0.
    """
    repo = LongevityRepository(get_db_path())
    # Limpa birthdate e chronological_age do perfil
    repo.upsert_user_profile({"id": 1, "birthdate": None, "chronological_age": None, "name": "Sem Idade"})

    payload = {
        "records": _full_phenoage_panel_raw_mmol("2026-11-01"),
    }

    res = client.post("/api/labs/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["inserted"] == 9

    pheno = data["phenoage"]
    assert pheno["status"] == "incomplete"
    assert "chronological_age" in pheno["missing"]


def test_phenoage_uses_explicit_batch_age_when_profile_has_no_birthdate(client):
    """Se o lote traz chronological_age explícita, ela é utilizada se birthdate não existir."""
    repo = LongevityRepository(get_db_path())
    repo.upsert_user_profile({"id": 1, "birthdate": None, "chronological_age": None, "name": "Teste"})

    payload = {
        "chronological_age": 52.0,
        "records": _full_phenoage_panel_raw_mmol("2026-11-01"),
    }

    res = client.post("/api/labs/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    pheno = data["phenoage"]
    assert pheno["status"] == "complete"
    assert pheno["chronological_age"] == 52.0
