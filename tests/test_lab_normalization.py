from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository


def test_lab_batch_normalizes_aliases_and_reports_incomplete_phenoage(client):
    payload = {
        "chronological_age": 40.0,
        "records": [
            {"collected_at": "2026-07-29", "metric_key": "fasting_glucose", "metric_name": "Glicose de Jejum", "value": 88.0, "unit": "mg/dL"},
            {"collected_at": "2026-07-29", "metric_key": "creatinine", "metric_name": "Creatinina", "value": 0.85, "unit": "mg/dL"},
            {"collected_at": "2026-07-29", "metric_key": "albumin", "metric_name": "Albumina", "value": 4.6, "unit": "g/dL"},
            {"collected_at": "2026-07-29", "metric_key": "hscrp", "metric_name": "PCR-us", "value": 0.4, "unit": "mg/L"},
            {"collected_at": "2026-07-29", "metric_key": "mcv", "metric_name": "MCV", "value": 89.0, "unit": "fL"},
            {"collected_at": "2026-07-29", "metric_key": "rdw", "metric_name": "RDW", "value": 12.1, "unit": "%"},
            {"collected_at": "2026-07-29", "metric_key": "alk_phos", "metric_name": "Fosfatase Alcalina", "value": 62.0, "unit": "U/L"},
            {"collected_at": "2026-07-29", "metric_key": "wbc", "metric_name": "Leucócitos", "value": 5.4, "unit": "10^3/uL"},
        ],
    }

    response = client.post("/api/labs/batch", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["inserted"] == 8
    assert body["phenoage"]["status"] == "incomplete"
    assert "lymphocyte_pct" in body["phenoage"]["missing_biomarkers"]

    repo = LongevityRepository(get_db_path())
    latest = repo.get_latest_labs_by_key()
    expected_canonical_keys = {
        "glucose_mgdl",
        "creatinine_mgdl",
        "albumin_gdl",
        "hscrp_mgl",
        "mcv_fl",
        "rdw_pct",
        "alk_phos_ul",
        "wbc_1000ul",
    }
    assert expected_canonical_keys.issubset(latest.keys())


def test_phenoage_route_returns_incomplete_without_full_panel(client):
    response = client.post(
        "/api/phenoage/calculate",
        json={
            "chronological_age": 40.0,
            "glucose_mgdl": 88.0,
            "creatinine_mgdl": 0.85,
            "albumin_gdl": 4.6,
            "hscrp_mgl": 0.4,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "incomplete"
    assert body["saved"] is False
    assert "missing_biomarkers" in body["result"]
