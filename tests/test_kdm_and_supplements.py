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

def test_supplement_update_and_audit_logs():
    # 1. Adiciona um composto (Hormônio)
    add_payload = {
        "name": "Testosterona Gel 1%",
        "dosage": "50 mg",
        "category": "Hormônio",
        "timing": "Manhã"
    }
    res_add = client.post("/api/supplements", json=add_payload)
    assert res_add.status_code == 200
    supp_id = res_add.json()["id"]

    # 2. Atualiza a dose
    update_payload = {
        "supplement_id": supp_id,
        "dosage": "100 mg",
        "category": "Hormônio"
    }
    res_update = client.post("/api/supplements/update", json=update_payload)
    assert res_update.status_code == 200

    # 3. Consulta histórico auditável
    res_audit = client.get("/api/supplements/audit-logs")
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert isinstance(logs, list)
    assert len(logs) >= 2
    actions = [l["action_type"] for l in logs]
    assert "ADICIONADO" in actions
    assert "DOSE_ALTERADA" in actions

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
