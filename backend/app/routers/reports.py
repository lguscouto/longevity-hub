from typing import Annotated

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing import generate_doctor_briefing
from longevidade.reports.doctor_briefing_pdf import generate_doctor_briefing_pdf

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class DoctorBriefingRequest(BaseModel):
    patient_name: str | None = None
    patient_age: float | None = None
    questions: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=list, max_length=10)

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
