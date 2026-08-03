from __future__ import annotations

from datetime import date, timedelta


def test_phenoage_endpoint_does_not_save_incomplete_calculations(client):
    response = client.post(
        "/api/phenoage/calculate",
        json={"chronological_age": 40.0, "glucose_mgdl": 90.0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "incomplete"
    assert body["saved"] is False
    assert body["id"] is None
    assert body["result"]["pheno_age"] is None
    assert "creatinine_mgdl" in body["result"]["missing_biomarkers"]

    history = client.get("/api/phenoage/history").json()
    assert history == []


def test_kdm_endpoint_returns_explicit_incomplete_when_fit_history_missing(client):
    response = client.post(
        "/api/kdm/calculate",
        json={
            "chronological_age": 42.0,
            "glucose_mgdl": 99.0,
            "creatinine_mgdl": 1.03,
            "albumin_gdl": 4.25,
            "hscrp_mgl": 1.9,
            "rdw_pct": 13.6,
            "alk_phos_ul": 77.0,
            "wbc_1000ul": 6.5,
            "rhr_bpm": 63.0,
            "systolic_bp": 133.0,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "incomplete"
    assert body["saved"] is False
    assert body["id"] is None
    assert body["result"]["kdm_age"] is None
    assert body["result"]["reason"] in {"insufficient_historical_data", "historical_fit_unavailable"}

    history = client.get("/api/kdm/history").json()
    assert history == []


def test_kdm_endpoint_calculates_and_persists_real_history_based_result(client):
    current_age = 50.0
    client.post("/api/profile", json={"birthdate": None, "chronological_age": current_age})

    today = date.today()
    history_rows = [
        (30.0, 80.0, 0.78, 4.80, 0.4, 12.0, 55.0, 5.0, 54.0, 110),
        (35.0, 86.0, 0.83, 4.62, 0.7, 12.2, 61.0, 5.5, 57.0, 114),
        (40.0, 89.0, 0.91, 4.55, 0.8, 12.8, 65.0, 5.7, 58.0, 121),
        (45.0, 96.0, 0.94, 4.33, 1.5, 13.0, 73.0, 6.3, 62.0, 125),
        (50.0, 99.0, 1.03, 4.25, 1.9, 13.6, 77.0, 6.5, 63.0, 133),
    ]

    for row in history_rows:
        target_age, glucose, creatinine, albumin, hscrp, rdw, alk_phos, wbc, rhr, systolic = row
        days_ago = round((current_age - target_age) * 365.2425)
        collected_at = (today - timedelta(days=days_ago)).isoformat()
        lab_payload = {
            "chronological_age": current_age,
            "records": [
                {"collected_at": collected_at, "metric_key": "fasting_glucose", "value": glucose, "unit": "mg/dL"},
                {"collected_at": collected_at, "metric_key": "creatinine", "value": creatinine, "unit": "mg/dL"},
                {"collected_at": collected_at, "metric_key": "albumin", "value": albumin, "unit": "g/dL"},
                {"collected_at": collected_at, "metric_key": "hscrp", "value": hscrp, "unit": "mg/L"},
                {"collected_at": collected_at, "metric_key": "rdw", "value": rdw, "unit": "%"},
                {"collected_at": collected_at, "metric_key": "alk_phos", "value": alk_phos, "unit": "U/L"},
                {"collected_at": collected_at, "metric_key": "wbc", "value": wbc, "unit": "10^3/uL"},
            ],
        }
        labs_response = client.post("/api/labs/batch", json=lab_payload)
        assert labs_response.status_code == 200

        metric_response = client.post(
            "/api/metrics",
            json={"date_ref": collected_at, "rhr_bpm": rhr, "systolic_bp": systolic},
        )
        assert metric_response.status_code == 200

    response = client.post("/api/kdm/calculate", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["saved"] is True
    assert isinstance(body["id"], int)
    assert body["result"]["status"] == "complete"
    assert isinstance(body["result"]["kdm_age"], float)
    assert body["result"]["fit_biomarkers_count"] >= 7
    assert body["result"]["fit_observations"] >= 5

    history = client.get("/api/kdm/history").json()
    assert len(history) == 1
    assert history[0]["kdm_age"] == body["result"]["kdm_age"]
