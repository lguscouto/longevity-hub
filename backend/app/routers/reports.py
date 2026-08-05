from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing import generate_doctor_briefing

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class DoctorBriefingRequest(BaseModel):
    patient_name: Optional[str] = "Paciente"
    patient_age: Optional[float] = 40.0

@router.get("/doctor-briefing")
def get_doctor_briefing(name: str = "Paciente", age: float = 40.0):
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        markdown_content = generate_doctor_briefing(repo, patient_name=name, patient_age=age)
    except FileNotFoundError:
        return {"markdown": "# 🏥 Relatório Sintético de Longevidade\n\n(Sem banco de dados inicializado)"}
    return {"markdown": markdown_content}

@router.post("/doctor-briefing")
def post_doctor_briefing(req: DoctorBriefingRequest):
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
    except FileNotFoundError:
        return {"markdown": "# 🏥 Relatório Sintético de Longevidade\n\n(Sem banco de dados inicializado)"}
    markdown_content = generate_doctor_briefing(repo, patient_name=req.patient_name or "Paciente", patient_age=req.patient_age or 40.0)
    return {"markdown": markdown_content}


@router.get("/doctor-briefing/pdf")
def get_doctor_briefing_pdf(name: str = "Paciente", age: float = 32.0):
    from fastapi.responses import Response
    from longevidade.reports.doctor_briefing_pdf import generate_doctor_briefing_pdf

    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        pdf_bytes = generate_doctor_briefing_pdf(repo, patient_name=name, patient_age=age)
    except FileNotFoundError:
        pdf_bytes = b""

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="doctor_briefing_longevidade.pdf"'},
    )
