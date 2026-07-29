from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import date

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository

router = APIRouter(prefix="/api/compliance", tags=["Compliance"])

class DailyComplianceInput(BaseModel):
    date_ref: Optional[str] = None
    sleep_schedule_ok: bool = False
    supplements_ok: bool = False
    exercise_ok: bool = False
    fasting_window_ok: bool = False
    notes: Optional[str] = None

@router.post("")
def save_compliance(input_data: DailyComplianceInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    data = input_data.model_dump()
    if not data.get("date_ref"):
        data["date_ref"] = date.today().isoformat()
    repo.save_daily_compliance(data)
    return {"status": "ok", "message": "Conformidade diária registrada com sucesso"}

@router.get("/history", response_model=List[Dict[str, Any]])
def get_compliance_history(days: int = 14):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_daily_compliance_history(days=days)
