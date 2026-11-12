from typing import Annotated

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing import generate_doctor_briefing
from longevidade.reports.doctor_briefing_pdf import generate_doctor_briefing_pdf

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get('/measurements-export')
def export_measurements():
    from longevidade.reports.portable_export import create_portable_export
    try:
        content = create_portable_export(LongevityRepository(get_db_path()))
    except FileNotFoundError as exc:
        raise HTTPException(503, 'Banco de dados indisponível para exportação.') from exc
    return Response(content=content, media_type='application/zip', headers={
        'Content-Disposition': 'attachment; filename="longevidade-medicoes.zip"',
        'Cache-Control': 'no-store',
    })

class DoctorBriefingRequest(BaseModel):
    patient_name: str | None = None
    patient_age: float | None = None
    questions: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=list, max_length=10)
    selected_lab_ids: list[int] | None = Field(default=None, max_length=500)
    selected_event_ids: list[Annotated[str, Field(max_length=100)]] | None = Field(default=None, max_length=500)


@router.get('/doctor-briefing/options')
def doctor_briefing_options(response: Response):
    from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS
    response.headers['Cache-Control'] = 'no-store'
    try:
        repo = LongevityRepository(get_db_path())
        labs = repo.get_lab_results(limit=500, record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS)
        with repo._get_connection() as conn:
            events = [dict(row) for row in conn.execute('SELECT id, date_ref, title, source FROM health_events ORDER BY date_ref DESC, id LIMIT 500')]
        return {'labs': [{'id': row['id'], 'metric_name': row['metric_name'], 'collected_at': row['collected_at'], 'record_origin': row['record_origin']} for row in labs], 'events': events}
    except FileNotFoundError:
        return {'labs': [], 'events': []}

@router.get("/doctor-briefing")
def get_doctor_briefing(response: Response, name: str | None = None, age: float | None = None):
    return post_doctor_briefing(DoctorBriefingRequest(patient_name=name, patient_age=age), response)

@router.post("/doctor-briefing")
def post_doctor_briefing(req: DoctorBriefingRequest, response: Response):
    response.headers["Cache-Control"] = "no-store"
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        markdown_content = generate_doctor_briefing(
            repo, patient_name=req.patient_name, patient_age=req.patient_age, questions=req.questions,
            selected_lab_ids=req.selected_lab_ids, selected_event_ids=req.selected_event_ids,
        )
    except FileNotFoundError:
        return {"markdown": "# 🏥 Relatório Sintético de Longevidade\n\n(Sem banco de dados inicializado)"}
    return {"markdown": markdown_content}


@router.get("/doctor-briefing/pdf")
def get_doctor_briefing_pdf(name: str | None = None, age: float | None = None):
    return post_doctor_briefing_pdf(DoctorBriefingRequest(patient_name=name, patient_age=age))


@router.post("/doctor-briefing/pdf")
def post_doctor_briefing_pdf(req: DoctorBriefingRequest):
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        pdf_bytes = generate_doctor_briefing_pdf(
            repo, patient_name=req.patient_name, patient_age=req.patient_age, questions=req.questions,
            selected_lab_ids=req.selected_lab_ids, selected_event_ids=req.selected_event_ids,
        )
    except FileNotFoundError as exc:
        raise HTTPException(503, "Banco de dados indisponível para gerar o PDF.") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="doctor_briefing_longevidade.pdf"',
            "Cache-Control": "no-store",
        },
    )
