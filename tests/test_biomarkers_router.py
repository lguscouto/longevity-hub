from __future__ import annotations

import pytest
from starlette.testclient import TestClient


def test_biomarkers_catalog_endpoint(client: TestClient):
    resp = client.get("/api/biomarkers/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    assert "categories" in data
    assert len(data["metrics"]) >= 64
    assert "biological_age" in data["categories"]
    assert "metabolic_insulin" in data["categories"]


def test_biomarkers_evaluate_adhoc_endpoint(client: TestClient):
    payload = {
        "raw_inputs": {
            "fasting_glucose": 90.0,
            "fasting_insulin": 10.0,
            "triglycerides": 150.0,
        },
    }
    resp = client.post("/api/biomarkers/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    results = data["metrics"]

    assert "homa_ir" in results
    assert results["homa_ir"]["status"] == "calculated"
    assert pytest.approx(results["homa_ir"]["value"], rel=1e-2) == 2.22

    assert "tyg_index" in results
    assert results["tyg_index"]["status"] == "calculated"
    assert pytest.approx(results["tyg_index"]["value"], rel=1e-2) == 8.82


def test_biomarkers_derived_empty_database(client: TestClient):
    resp = client.get("/api/biomarkers/derived")
    assert resp.status_code == 200
    data = resp.json()
    assert data["available_dates"] == []
    assert "metrics_by_category" in data


def test_biomarkers_derived_with_ingested_labs_and_persistence(client: TestClient):
    # 1. Configurar perfil com data de nascimento e antropometria
    client.post(
        "/api/profile",
        json={
            "name": "Paciente Teste Longevidade",
            "birthdate": "1980-05-15",
            "height_cm": 178.0,
            "current_weight_kg": 76.0,
            "waist_circumference_cm": 84.0,
            "biological_sex": "male",
            "diabetes": False,
            "hypertension": False,
        },
    )

    # 2. Ingerir lote de exames em uma data específica
    collection_date = "2026-03-10"
    batch_records = [
        {"collected_at": collection_date, "metric_key": "fasting_glucose", "value": 88.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "fasting_insulin", "value": 6.5, "unit": "uIU/mL"},
        {"collected_at": collection_date, "metric_key": "total_cholesterol", "value": 190.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "hdl_cholesterol", "value": 55.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "ldl_cholesterol", "value": 115.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "triglycerides", "value": 100.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "creatinine", "value": 0.9, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "albumin", "value": 4.6, "unit": "g/dL"},
        {"collected_at": collection_date, "metric_key": "hscrp", "value": 0.8, "unit": "mg/L"},
        {"collected_at": collection_date, "metric_key": "wbc", "value": 6.0, "unit": "10^3/uL"},
        {"collected_at": collection_date, "metric_key": "lymphocyte_pct", "value": 30.0, "unit": "%"},
        {"collected_at": collection_date, "metric_key": "mcv", "value": 89.0, "unit": "fL"},
        {"collected_at": collection_date, "metric_key": "rdw", "value": 12.3, "unit": "%"},
        {"collected_at": collection_date, "metric_key": "alk_phos", "value": 60.0, "unit": "U/L"},
        {"collected_at": collection_date, "metric_key": "ast", "value": 22.0, "unit": "U/L"},
        {"collected_at": collection_date, "metric_key": "alt", "value": 24.0, "unit": "U/L"},
        {"collected_at": collection_date, "metric_key": "ggt", "value": 20.0, "unit": "U/L"},
        {"collected_at": collection_date, "metric_key": "platelets", "value": 240.0, "unit": "10^3/uL"},
        {"collected_at": collection_date, "metric_key": "urea", "value": 28.0, "unit": "mg/dL"},
    ]

    post_resp = client.post("/api/labs/batch", json={"records": batch_records})
    assert post_resp.status_code == 200

    # 3. Chamar GET /api/biomarkers/derived para a data (deve ser idempotente, sem persistir)
    derived_resp = client.get(f"/api/biomarkers/derived?date={collection_date}")
    assert derived_resp.status_code == 200
    data = derived_resp.json()
    assert data.get("records_persisted") == 0

    # 3.1 Chamar POST /api/biomarkers/derived/recalculate para persistir explicitamente
    recalc_resp = client.post(f"/api/biomarkers/derived/recalculate?date={collection_date}")
    assert recalc_resp.status_code == 200
    assert recalc_resp.json().get("records_persisted", 0) > 0

    assert data["collected_at"] == collection_date
    assert collection_date in data["available_dates"]

    categories = data["metrics_by_category"]
    assert "biological_age" in categories
    assert "metabolic_insulin" in categories
    assert "hepatic" in categories
    assert "cardiovascular_renal" in categories
    assert "body_composition" in categories

    # Localizar HOMA-IR
    homa = next((m for m in categories["metabolic_insulin"] if m["metric_id"] == "homa_ir"), None)
    assert homa is not None
    assert homa["status"] == "calculated"
    # (88 * 6.5) / 405 = 1.412
    assert pytest.approx(homa["value"], rel=1e-2) == 1.41

    # Localizar PhenoAge
    pheno = next((m for m in categories["biological_age"] if m["metric_id"] == "phenoage"), None)
    assert pheno is not None
    assert pheno["status"] == "calculated"
    assert pheno["value"] is not None

    # Localizar Light BioAge
    light_bio = next((m for m in categories["biological_age"] if m["metric_id"] == "light_bioage"), None)
    assert light_bio is not None
    assert light_bio["status"] == "calculated"
    assert light_bio["value"] is not None

    # Localizar FIB-4
    fib4 = next((m for m in categories["hepatic"] if m["metric_id"] == "fib4"), None)
    assert fib4 is not None
    assert fib4["status"] == "calculated"

    # Localizar Non-HDL
    non_hdl = next((m for m in categories["cardiovascular_renal"] if m["metric_id"] == "non_hdl_cholesterol"), None)
    assert non_hdl is not None
    assert non_hdl["status"] == "calculated"
    assert non_hdl["value"] == 135.0  # 190 - 55

    # 4. Deletar os exames dessa data e conferir limpeza
    del_resp = client.post("/api/labs/delete", json={"collected_at": collection_date})
    assert del_resp.status_code == 200

    after_del_resp = client.get(f"/api/biomarkers/derived?date={collection_date}")
    assert after_del_resp.status_code == 200
    after_data = after_del_resp.json()
    assert collection_date not in after_data["available_dates"]


def test_biomarkers_derived_cohort_parameter_and_missing_inputs(client: TestClient):
    # Set profile
    client.post(
        "/api/profile",
        json={
            "name": "Paciente UKB Cohort",
            "birthdate": "1975-01-01",
            "height_cm": 175.0,
            "current_weight_kg": 75.0,
            "waist_circumference_cm": 85.0,
            "biological_sex": "female",
            "diabetes": False,
            "hypertension": False,
        },
    )

    collection_date = "2026-04-01"
    batch_records = [
        {"collected_at": collection_date, "metric_key": "fasting_glucose", "value": 90.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "fasting_insulin", "value": 7.0, "unit": "uIU/mL"},
        {"collected_at": collection_date, "metric_key": "total_cholesterol", "value": 180.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "hdl_cholesterol", "value": 60.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "triglycerides", "value": 110.0, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "creatinine", "value": 0.8, "unit": "mg/dL"},
        {"collected_at": collection_date, "metric_key": "albumin", "value": 4.5, "unit": "g/dL"},
        {"collected_at": collection_date, "metric_key": "hscrp", "value": 0.5, "unit": "mg/L"},
        {"collected_at": collection_date, "metric_key": "wbc", "value": 5.5, "unit": "10^3/uL"},
        {"collected_at": collection_date, "metric_key": "lymphocyte_pct", "value": 32.0, "unit": "%"},
        {"collected_at": collection_date, "metric_key": "mcv", "value": 88.0, "unit": "fL"},
        {"collected_at": collection_date, "metric_key": "rdw", "value": 12.0, "unit": "%"},
        {"collected_at": collection_date, "metric_key": "alk_phos", "value": 55.0, "unit": "U/L"},
        {"collected_at": collection_date, "metric_key": "urea", "value": 25.0, "unit": "mg/dL"},
    ]
    client.post("/api/labs/batch", json={"records": batch_records})

    # Test with cohort=ukb
    resp = client.get(f"/api/biomarkers/derived?date={collection_date}&cohort=ukb")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cohort_variant"] == "ukb"
    assert data["cohort"] == "ukb"

    # Verify light_bioage was calculated using ukb cohort
    categories = data["metrics_by_category"]
    light_bio = next((m for m in categories["biological_age"] if m["metric_id"] == "light_bioage"), None)
    assert light_bio is not None
    assert light_bio["status"] == "calculated"
    assert light_bio["value"] is not None

    # Verify missing_inputs field is returned on every item
    for cat, items in categories.items():
        for item in items:
            assert "missing_inputs" in item
            assert isinstance(item["missing_inputs"], list)


def test_biomarkers_derived_invalid_date_resilience(client: TestClient):
    # Should not crash with 500 when given an invalid date format
    resp = client.get("/api/biomarkers/derived?date=invalid-not-a-date")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics_by_category" in data

