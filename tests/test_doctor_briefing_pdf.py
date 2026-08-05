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
