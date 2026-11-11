from fastapi.testclient import TestClient

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing_pdf import generate_doctor_briefing_pdf


def test_generate_doctor_briefing_pdf(tmp_path):
    db_file = tmp_path / "test_pdf.sqlite3"
    initialize_db(db_file)
    repo = LongevityRepository(db_file)

    pdf_bytes = generate_doctor_briefing_pdf(repo, patient_name="Teste PDF", patient_age=35.0)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")


def test_report_routes_use_profile_and_omit_invented_goals(client: TestClient):
    from backend.app.config import get_db_path

    repo = LongevityRepository(get_db_path())
    for response in (
        client.get("/api/reports/doctor-briefing"),
        client.post("/api/reports/doctor-briefing", json={}),
    ):
        markdown = response.json()["markdown"]
        assert "Idade não informada" in markdown
        assert "Objetivos registrados" not in markdown

    repo.upsert_user_profile({
        "name": "Perfil sintético",
        "chronological_age": 57,
        "longevity_goals": ["Revisar meu histórico de sono"],
    })
    for response in (
        client.get("/api/reports/doctor-briefing"),
        client.post("/api/reports/doctor-briefing", json={}),
    ):
        markdown = response.json()["markdown"]
        assert "Perfil sintético (57 anos)" in markdown
        assert "Revisar meu histórico de sono" in markdown

    response = client.get("/api/reports/doctor-briefing/pdf")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.content.startswith(b"%PDF")


def test_report_context_and_questions_match_pdf_without_writing(client: TestClient, monkeypatch):
    from datetime import date, timedelta

    from reportlab import rl_config
    from backend.app.config import get_db_path

    monkeypatch.setattr(rl_config, "pageCompression", 0)
    repo = LongevityRepository(get_db_path())
    today = date.today()

    def day(offset):
        return (today + timedelta(days=offset)).isoformat()

    for offset, steps in ((-90, 99000), (-89, 1000), (-29, 2000), (-6, 4000), (0, 6000), (1, 99999)):
        repo.upsert_daily_metric({"date_ref": day(offset), "steps": steps, "source": "Zepp"})
    repo.upsert_daily_checkin({"date_ref": day(-1), "symptom_severity": 2, "tags": ["Sintoma sintético"]})
    repo.add_intervention({"name": "Intervenção sintética", "category": "Rotina", "start_date": day(-3)})
    repo.add_supplement({"name": "Composto sintético", "dosage": "Dose sintética", "category": "Hormônio"})
    repo.add_n_of_1_experiment({
        "title": "Experimento sintético", "metric_key": "steps", "control_start": day(-10),
        "control_end": day(-8), "treatment_start": day(-7), "treatment_end": day(-5), "p_value": 0.2,
    })
    repo.save_kdm_record({"calculated_at": day(-1), "chronological_age": 40, "kdm_age": 39,
                         "kdm_delta": -1, "biomarkers_used": ["Peso"]})
    repo.add_phenoage_record({"calculated_at": day(-2), "chronological_age": 40, "pheno_age": 38,
                             "age_delta": -2, "glucose_mgdl": 90, "record_origin": "patient_lab"})

    with repo._get_connection() as conn:
        before = list(conn.iterdump())

    body = {"questions": ["Como revisar meu sono?", " "]}
    result = client.post("/api/reports/doctor-briefing", json=body)
    assert result.status_code == 200
    assert result.headers["cache-control"] == "no-store"
    markdown = result.json()["markdown"]
    for snippet in (
        "4/90 dias", "Zepp", "7 dias: média 5000.0 passos (2/7 dias)",
        "30 dias: média 4000.0 passos (3/30 dias)", "90 dias: média 3250.0 passos (4/90 dias)",
        "Sintoma sintético", "Intervenção sintética", "Composto sintético",
        "Experimento sintético", "Confiança limitada", "KDM de", "Peso",
        "PhenoAge de", "Glicose: 90 mg/dL", "Como revisar meu sono?",
    ):
        assert snippet in markdown

    pdf = client.post("/api/reports/doctor-briefing/pdf", json=body)
    assert pdf.status_code == 200
    assert pdf.headers["cache-control"] == "no-store"
    assert b"Como revisar meu sono?" in pdf.content
    assert b"4/90 dias" in pdf.content
    assert client.post("/api/reports/doctor-briefing/pdf", json={"questions": ["x" * 301]}).status_code == 422
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before
