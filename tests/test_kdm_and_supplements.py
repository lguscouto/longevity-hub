import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from longevidade.calculators.kdm_age import calculate_kdm_biological_age
from longevidade.calculators.cardio_ratios import calculate_cardiovascular_ratios

client = TestClient(app)

def test_kdm_biological_age_calculation():
    labs = {
        "glucose_mgdl": 88.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.6,
        "hscrp_mgl": 0.4,
        "rdw_pct": 12.2,
        "alk_phos_ul": 62.0,
        "wbc_1000ul": 5.5,
        "rhr_bpm": 52.0
    }
    res = calculate_kdm_biological_age(32.0, labs)
    assert "kdm_age" in res
    assert "kdm_delta" in res
    assert res["biomarkers_count"] > 0
    assert isinstance(res["kdm_age"], float)

def test_cardiovascular_ratios():
    labs_map = {
        "apob": {"value": 58.0},
        "apoa1": {"value": 110.0},
        "triglycerides": {"value": 75.0},
        "hdl_cholesterol": {"value": 65.0},
        "total_cholesterol": {"value": 160.0},
        "ldl_cholesterol": {"value": 80.0}
    }
    res = calculate_cardiovascular_ratios(labs_map)
    assert res["apob_apoa1_ratio"] == 0.53
    assert res["apob_apoa1_status"] == "Excelente (Protegido)"
    assert res["tg_hdl_ratio"] == 1.15
    assert res["tg_hdl_status"] == "Ótimo (Sensibilidade à Insulina Alta)"
    assert res["remnant_cholesterol"] == 15.0

def test_supplements_endpoints():
    response = client.get("/api/supplements")
    assert response.status_code == 200
    supps = response.json()
    assert isinstance(supps, list)
    assert len(supps) > 0

def test_compliance_endpoints():
    payload = {
        "date_ref": "2026-07-29",
        "sleep_schedule_ok": True,
        "supplements_ok": True,
        "exercise_ok": True,
        "fasting_window_ok": True
    }
    res_post = client.post("/api/compliance", json=payload)
    assert res_post.status_code == 200

    res_get = client.get("/api/compliance/history?days=7")
    assert res_get.status_code == 200
    history = res_get.json()
    assert isinstance(history, list)
