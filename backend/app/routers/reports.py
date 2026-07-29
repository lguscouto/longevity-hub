from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing import generate_doctor_briefing

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class DoctorBriefingRequest(BaseModel):
    patient_name: Optional[str] = "Paciente"
    patient_age: Optional[float] = 40.0

@router.get("/doctor-briefing")
def get_doctor_briefing(name: str = "Paciente", age: float = 40.0):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    markdown_content = generate_doctor_briefing(repo, patient_name=name, patient_age=age)
    return {"markdown": markdown_content}

@router.post("/doctor-briefing")
def post_doctor_briefing(req: DoctorBriefingRequest):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    markdown_content = generate_doctor_briefing(repo, patient_name=req.patient_name or "Paciente", patient_age=req.patient_age or 40.0)
    return {"markdown": markdown_content}
