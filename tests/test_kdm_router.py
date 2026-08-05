from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository


def _seed_kdm_history(repo: LongevityRepository) -> None:
    repo.upsert_user_profile({"chronological_age": 39.0})
    for date_ref, offset in (
        ("2023-07-01", 0.0),
        ("2024-07-01", 0.8),
        ("2025-07-01", 2.1),
        ("2026-07-01", 2.9),
    ):
        repo.upsert_daily_metric(
            {
                "date_ref": date_ref,
                "rhr_bpm": 50.0 + offset,
                "systolic_bp": 110 + int(offset * 2),
                "diastolic_bp": 72 + int(offset),
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "glucose_mgdl",
                "metric_name": "Glicose de Jejum",
                "value": 86.0 + offset,
                "unit": "mg/dL",
                "category": "Metabolismo",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "creatinine_mgdl",
                "metric_name": "Creatinina",
                "value": 0.82 + offset * 0.01,
                "unit": "mg/dL",
                "category": "Renal",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "albumin_gdl",
                "metric_name": "Albumina",
                "value": 4.8 - offset * 0.03,
                "unit": "g/dL",
                "category": "Hepático",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "hscrp_mgl",
                "metric_name": "PCR-us",
                "value": 0.30 + offset * 0.03,
                "unit": "mg/L",
                "category": "Inflamação",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "rdw_pct",
                "metric_name": "RDW",
                "value": 11.9 + offset * 0.08,
                "unit": "%",
                "category": "Hematologia",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "alk_phos_ul",
                "metric_name": "Fosfatase Alcalina",
                "value": 58.0 + offset * 1.5,
                "unit": "U/L",
                "category": "Hepático",
                "record_origin": "patient_lab",
            }
        )
        repo.add_lab_result(
            {
                "collected_at": date_ref,
                "metric_key": "wbc_1000ul",
                "metric_name": "Leucócitos",
                "value": 5.1 + offset * 0.08,
                "unit": "10^3/uL",
                "category": "Imunidade",
                "record_origin": "patient_lab",
            }
        )


from longevidade.db.schema import initialize_db


def test_kdm_router_calculates_and_persists_complete_result(client):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    _seed_kdm_history(repo)

    response = client.post("/api/kdm/calculate")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["result"]["status"] == "complete"
    assert body["result"]["kdm_age"] is not None
    assert body["result"]["kdm_delta"] is not None

    latest = client.get("/api/kdm/latest")
    assert latest.status_code == 200
    latest_body = latest.json()
    assert latest_body["status"] == "complete"
    assert latest_body["kdm_age"] == body["result"]["kdm_age"]
    assert isinstance(latest_body["biomarkers_used"], list)
