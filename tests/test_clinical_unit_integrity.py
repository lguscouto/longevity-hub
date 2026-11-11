import pytest
from fastapi.testclient import TestClient

from backend.app.config import get_db_path
from longevidade.calculators.kdm_age import latest_kdm_biomarker_values, recalculate_kdm_silently
from longevidade.db.repository import LongevityRepository
from longevidade.metrics.engine import evaluate_all_metrics, evaluate_metric
from longevidade.metrics.unit_conversion import CANONICAL_UNITS, normalize_observation_inputs
from longevidade.metrics.derived_catalog import DERIVED_METRICS_CATALOG
from longevidade.algorithms.phenoage_panel import select_latest_complete_phenoage_panel


def test_all_derived_metric_input_keys_have_an_explicit_canonical_unit():
    inputs = {key for spec in DERIVED_METRICS_CATALOG.values() for key in spec.input_keys}
    assert inputs <= CANONICAL_UNITS.keys()


def test_egfr_without_body_surface_normalization_is_not_treated_as_equivalent():
    inputs = normalize_observation_inputs({"egfr": {"value": 90, "unit": "mL/min"}})
    assert "egfr" not in inputs
    normalized = normalize_observation_inputs({"egfr": {"value": 90, "unit": "mL/min/1.73m^2"}})
    assert normalized["egfr"].value == 90


def test_egfr_batch_requires_explicit_body_surface_normalization(client: TestClient):
    record = {"collected_at": "2026-11-01", "metric_key": "egfr", "value": 90, "unit": "mL/min"}
    assert client.post("/api/labs/batch", json={"records": [record]}).status_code == 422
    record["unit"] = "mL/min/1.73m²"
    assert client.post("/api/labs/batch", json={"records": [record]}).status_code == 200


def test_censored_egfr_is_not_persisted_as_an_exact_value(client: TestClient):
    response = client.post("/api/labs/batch", json={"records": [
        {"collected_at": "2026-11-01", "metric_key": "glucose", "value": 90, "unit": "mg/dL"},
        {"collected_at": "2026-11-01", "metric_key": "egfr", "value": 90,
         "raw_value": ">90", "unit": "mL/min/1.73m²"},
    ]})
    assert response.status_code == 422
    assert "limite" in response.json()["detail"]
    assert LongevityRepository(get_db_path()).get_lab_results() == []


@pytest.mark.parametrize("key", ["hdl", "ldl", "total_cholesterol", "triglycerides", "fasting_insulin", "hba1c", "platelets", "ast", "alt", "urea", "apob", "apoa1"])
def test_calculated_lab_inputs_reject_incompatible_units_before_batch_write(client: TestClient, key):
    response = client.post("/api/labs/batch", json={"records": [
        {"collected_at": "2026-11-01", "metric_key": "glucose", "value": 90, "unit": "mg/dL"},
        {"collected_at": "2026-11-01", "metric_key": key, "value": 5, "unit": "kg"},
    ]})
    assert response.status_code == 422
    assert key in response.json()["detail"]
    assert LongevityRepository(get_db_path()).get_lab_results() == []


def test_derived_metric_refuses_unknown_explicit_units():
    values = {"triglycerides": {"value": 100, "unit": "kg"}, "hdl": {"value": 50, "unit": "mg/dL"}}
    direct = evaluate_metric("tg_hdl_ratio", values)
    all_metrics = evaluate_all_metrics(values)
    for result in (direct, all_metrics["tg_hdl_ratio"]):
        assert result["status"] == "invalid_inputs"
        assert result["value"] is None
        assert any("triglycerides" in text for text in result["limitations"])


def test_evaluation_api_exposes_invalid_unit_in_metric_result(client: TestClient):
    response = client.post("/api/biomarkers/evaluate", json={"raw_inputs": {
        "triglycerides": {"value": 100, "unit": "kg"},
        "hdl": {"value": 50, "unit": "mg/dL"},
    }})
    assert response.status_code == 200
    result = response.json()["metrics"]["tg_hdl_ratio"]
    assert result["status"] == "invalid_inputs"
    assert result["value"] is None
    assert any("triglycerides" in limitation for limitation in result["limitations"])


def test_equivalent_lipid_units_are_normalized_to_same_value():
    a = normalize_observation_inputs({"hdl": {"value": 38.67, "unit": "mg/dL"}})
    b = normalize_observation_inputs({"hdl": {"value": 1, "unit": "mmol/L"}})
    assert a["hdl_mg_dl"].value == pytest.approx(b["hdl_mg_dl"].value)


def test_batch_converts_reference_limits_with_value(client: TestClient):
    response = client.post("/api/labs/batch", json={"records": [{
        "collected_at": "2026-11-01", "metric_key": "glucose", "value": 5,
        "unit": "mmol/L", "ref_min": 4, "ref_max": 6,
    }]})
    assert response.status_code == 200
    lab = LongevityRepository(get_db_path()).get_lab_results(limit=1)[0]
    assert lab["value"] == pytest.approx(5 / 0.0555)
    assert lab["ref_min"] == pytest.approx(4 / 0.0555)
    assert lab["ref_max"] == pytest.approx(6 / 0.0555)
    assert lab["raw_value"] == 5
    assert lab["raw_unit"] == "mmol/L"


def test_reference_limits_use_declared_unit_when_raw_unit_differs(client: TestClient):
    response = client.post("/api/labs/batch", json={"records": [{
        "collected_at": "2026-11-01", "metric_key": "wbc", "value": 4.5,
        "unit": "10³/µL", "raw_value": 4500, "raw_unit": "/mm³",
        "ref_min": 3.6, "ref_max": 12.0, "optimal_target": 5.5,
    }]})
    assert response.status_code == 200
    lab = LongevityRepository(get_db_path()).get_lab_results(limit=1)[0]
    assert lab["value"] == pytest.approx(4.5)
    assert lab["ref_min"] == pytest.approx(3.6)
    assert lab["ref_max"] == pytest.approx(12.0)
    assert lab["optimal_target"] == pytest.approx(5.5)
    assert lab["raw_unit"] == "/mm³"


def test_brazilian_insulin_unit_alias_is_accepted(client: TestClient):
    response = client.post("/api/labs/batch", json={"records": [{
        "collected_at": "2026-11-01", "metric_key": "fasting_insulin", "value": 3,
        "unit": "uIU/mL", "raw_value": 3, "raw_unit": "µUI/mL",
    }]})
    assert response.status_code == 200
    lab = LongevityRepository(get_db_path()).get_lab_results(limit=1)[0]
    assert lab["raw_unit"] == "µUI/mL"


def test_kdm_converts_legacy_lab_units_and_excludes_unknown_unit():
    results = latest_kdm_biomarker_values([
        {"metric_key": "glucose", "value": 4.995, "unit": "mmol/L"},
        {"metric_key": "creatinine", "value": 5, "unit": "kg"},
    ], [])
    assert results["glucose_mgdl"] == pytest.approx(90)
    assert "creatinine_mgdl" not in results


def test_scheduled_kdm_without_age_never_uses_a_default(tmp_path):
    from longevidade.db.schema import initialize_db
    db = tmp_path / "kdm.sqlite3"
    initialize_db(db)
    repo = LongevityRepository(db)
    result = recalculate_kdm_silently(repo)
    assert result == {"status": "incomplete", "missing": ["chronological_age"]}
    assert repo.get_kdm_history() == []


def test_legacy_phenoage_panel_normalizes_units_and_rejects_unknown():
    rows = [
        {"metric_key": key, "value": value, "unit": unit, "collected_at": "2026-11-01"}
        for key, value, unit in [
            ("glucose", 4.995, "mmol/L"), ("creatinine", 1, "mg/dL"),
            ("albumin", 4.5, "g/dL"), ("hscrp", 1.5, "mg/L"),
            ("lymphocyte_pct", 30, "%"), ("mcv", 89, "fL"),
            ("rdw", 12.5, "%"), ("alk_phos", 65, "U/L"),
            ("wbc", 6, "10^3/uL"),
        ]
    ]
    panel = select_latest_complete_phenoage_panel(rows)
    assert panel is not None
    assert panel.values["glucose_mgdl"] == pytest.approx(90)
    rows[0]["unit"] = "kg"
    assert select_latest_complete_phenoage_panel(rows) is None
