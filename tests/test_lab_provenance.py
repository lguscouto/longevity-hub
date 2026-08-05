from __future__ import annotations

import json

import longevidade.reports.doctor_briefing_pdf as pdf_module
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS, UNVERIFIED_LAB_ORIGIN
from longevidade.reports.doctor_briefing import generate_doctor_briefing
from longevidade.reports.doctor_briefing_pdf import generate_doctor_briefing_pdf
from longevidade.reports.lab_selection import get_clinical_lab_snapshot


PHENOAGE_VALUES = {
    "glucose_mgdl": 88.0,
    "creatinine_mgdl": 0.85,
    "albumin_gdl": 4.6,
    "hscrp_mgl": 0.4,
    "lymphocyte_pct": 32.0,
    "mcv_fl": 89.0,
    "rdw_pct": 12.2,
    "alk_phos_ul": 62.0,
    "wbc_1000ul": 5.5,
}


def _lab(metric_key: str, metric_name: str, value: float, origin: str, collected_at: str) -> dict:
    return {
        "collected_at": collected_at,
        "metric_key": metric_key,
        "metric_name": metric_name,
        "value": value,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 100.0,
        "record_origin": origin,
    }


def _pheno(pheno_age: float, origin: str, calculated_at: str) -> dict:
    return {
        "calculated_at": calculated_at,
        "chronological_age": 40.0,
        "pheno_age": pheno_age,
        "age_delta": pheno_age - 40.0,
        "record_origin": origin,
    }


def _captured_pdf_text(monkeypatch, repo: LongevityRepository) -> str:
    captured = []

    class CapturingDocument:
        def __init__(self, buffer, **_kwargs):
            self.buffer = buffer

        def build(self, elements):
            captured.extend(elements)
            self.buffer.write(b"%PDF-1.4 capture")

    monkeypatch.setattr(pdf_module, "SimpleDocTemplate", CapturingDocument)
    pdf = generate_doctor_briefing_pdf(repo)
    assert pdf.startswith(b"%PDF")

    text = []
    for element in captured:
        if hasattr(element, "getPlainText"):
            text.append(element.getPlainText())
        for row in getattr(element, "_cellvalues", []):
            for cell in row:
                if hasattr(cell, "getPlainText"):
                    text.append(cell.getPlainText())
                else:
                    text.append(str(cell))
    return "\n".join(text)


def test_shared_clinical_snapshot_excludes_synthetic_from_markdown_and_pdf(tmp_path, monkeypatch):
    db_path = tmp_path / "provenance.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    repo.upsert_user_profile({"name": "Paciente de Teste", "chronological_age": 40.0})

    repo.add_lab_result(_lab("fasting_glucose", "Glicose clínica", 88.0, "patient_lab", "2026-08-01"))
    repo.add_lab_result(_lab("fasting_glucose", "Marcador sintético", 999.0, "synthetic", "2026-08-02"))
    repo.add_phenoage_record(_pheno(39.0, "patient_lab", "2026-08-01"))
    repo.add_phenoage_record(_pheno(99.0, "synthetic", "2026-08-02"))

    snapshot = get_clinical_lab_snapshot(repo)

    assert snapshot.latest_labs["fasting_glucose"]["value"] == 88.0
    assert snapshot.latest_phenoage is not None
    assert snapshot.latest_phenoage["pheno_age"] == 39.0
    assert snapshot.excluded_lab_results == 1
    assert snapshot.excluded_phenoage_records == 1

    markdown = generate_doctor_briefing(repo)
    assert "Glicose clínica" in markdown
    assert "88.0 mg/dL" in markdown
    assert "Marcador sintético" not in markdown
    assert "999.0" not in markdown
    assert "99.0 anos" not in markdown

    pdf_text = _captured_pdf_text(monkeypatch, repo)
    assert "Glicose clínica" in pdf_text
    assert "88.0 mg/dL" in pdf_text
    assert "Marcador sintético" not in pdf_text
    assert "999.0" not in pdf_text


def test_synthetic_labs_are_excluded_from_phenoage_and_ai_context(client):
    from backend.app.config import get_db_path

    repo = LongevityRepository(get_db_path())
    records = [
        ("glucose_mgdl", "Glicose", 88.0, "mg/dL"),
        ("creatinine_mgdl", "Creatinina", 0.85, "mg/dL"),
        ("albumin_gdl", "Albumina", 4.6, "g/dL"),
        ("hscrp_mgl", "PCR-us", 0.4, "mg/L"),
        ("lymphocyte_pct", "Linfócitos", 32.0, "%"),
        ("mcv_fl", "MCV", 89.0, "fL"),
        ("rdw_pct", "RDW", 12.2, "%"),
        ("alk_phos_ul", "Fosfatase Alcalina", 62.0, "U/L"),
        ("wbc_1000ul", "Leucócitos", 5.5, "10^3/uL"),
    ]
    for key, name, value, unit in records:
        repo.add_lab_result(
            {
                "collected_at": "2026-08-01",
                "metric_key": key,
                "metric_name": f"Sintético {name}",
                "value": value,
                "unit": unit,
                "record_origin": "synthetic",
            }
        )

    response = client.post("/api/phenoage/calculate", json={"chronological_age": 40.0})

    assert response.status_code == 200
    assert response.json()["status"] == "incomplete"
    context = build_patient_clinical_context(get_db_path())
    assert "Sintético Glicose" not in context
    assert "Nenhum exame de sangue registrado." in context


def test_lab_batch_assigns_patient_lab_server_side_even_if_client_sends_origin(client):
    from backend.app.config import get_db_path

    response = client.post(
        "/api/labs/batch",
        json={
            "records": [
                {
                    "collected_at": "2026-08-01",
                    "metric_key": "fasting_glucose",
                    "metric_name": "Glicose de Jejum",
                    "value": 88.0,
                    "unit": "mg/dL",
                    "record_origin": "synthetic",
                }
            ]
        },
    )

    assert response.status_code == 200
    stored = LongevityRepository(get_db_path()).get_lab_results(limit=1)[0]
    assert stored["record_origin"] == "patient_lab"
    assert stored["record_origin"] in CLINICALLY_ELIGIBLE_LAB_ORIGINS
    assert json.loads(json.dumps(stored))["record_origin"] == "patient_lab"


def test_missing_record_origin_is_unverified_and_excluded_from_clinical_snapshot(tmp_path):
    db_path = tmp_path / "missing_origin.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    repo.add_lab_result(
        {
            "collected_at": "2026-08-01",
            "metric_key": "fasting_glucose",
            "metric_name": "Origem ausente",
            "value": 88.0,
            "unit": "mg/dL",
        }
    )

    stored = repo.get_lab_results(limit=1)[0]
    snapshot = get_clinical_lab_snapshot(repo)

    assert stored["record_origin"] == UNVERIFIED_LAB_ORIGIN
    assert snapshot.latest_labs == {}
    assert snapshot.excluded_lab_results == 1


def test_phenoage_rejects_markers_mixed_across_collection_dates(client):
    from backend.app.config import get_db_path

    repo = LongevityRepository(get_db_path())
    for index, (metric_key, value) in enumerate(PHENOAGE_VALUES.items()):
        repo.add_lab_result(
            {
                "collected_at": "2020-01-01" if index % 2 else "2026-08-01",
                "metric_key": metric_key,
                "metric_name": metric_key,
                "value": value,
                "unit": "unit",
                "record_origin": "patient_lab",
            }
        )

    response = client.post("/api/phenoage/calculate", json={"chronological_age": 40.0})

    assert response.status_code == 200
    assert response.json()["status"] == "incomplete"
    assert response.json()["result"]["reason"] == "no_complete_single_collection_panel"
    assert repo.get_phenoage_history() == []


def test_lab_batch_rejects_markers_mixed_across_collection_dates(client):
    from backend.app.config import get_db_path

    records = [
        {
            "collected_at": "2020-01-01" if index % 2 else "2026-08-01",
            "metric_key": metric_key,
            "value": value,
            "unit": "unit",
        }
        for index, (metric_key, value) in enumerate(PHENOAGE_VALUES.items())
    ]

    response = client.post(
        "/api/labs/batch",
        json={"chronological_age": 40.0, "records": records},
    )

    assert response.status_code == 200
    assert response.json()["phenoage"]["status"] == "incomplete"
    assert LongevityRepository(get_db_path()).get_phenoage_history() == []


def test_partial_manual_phenoage_override_does_not_mix_with_clinical_panel(client):
    from backend.app.config import get_db_path

    repo = LongevityRepository(get_db_path())
    for metric_key, value in PHENOAGE_VALUES.items():
        repo.add_lab_result(
            {
                "collected_at": "2026-08-01",
                "metric_key": metric_key,
                "metric_name": metric_key,
                "value": value,
                "unit": "unit",
                "record_origin": "patient_lab",
            }
        )

    response = client.post(
        "/api/phenoage/calculate",
        json={"chronological_age": 40.0, "glucose_mgdl": 90.0},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "incomplete"
    assert response.json()["saved"] is False
    assert repo.get_phenoage_history() == []
