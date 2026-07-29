from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import DB_PATH, ZEPP_DATA_DIR, BASE_DIR
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.zepp_importer import import_zepp_data
from longevidade.ingestion.google_importer import import_google_health_data

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

GOOGLE_DATA_DIR = BASE_DIR.parent / "google health" / "data"

class DailyMetricInput(BaseModel):
    date_ref: str
    steps: Optional[int] = None
    sleep_minutes: Optional[int] = None
    sleep_deep_min: Optional[int] = None
    sleep_light_min: Optional[int] = None
    sleep_rem_min: Optional[int] = None
    rhr_bpm: Optional[float] = None
    avg_hr_bpm: Optional[float] = None
    hrv_ms: Optional[float] = None
    readiness_score: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    waist_cm: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    grip_strength_kg: Optional[float] = None
    vo2_max: Optional[float] = None

@router.get("", response_model=List[Dict[str, Any]])
def get_metrics(days: int = Query(30, ge=1, le=365)):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_daily_metrics(days=days)

@router.post("")
def add_or_update_metric(input_data: DailyMetricInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    data = input_data.model_dump(exclude_unset=True)
    repo.upsert_daily_metric(data)
    return {"status": "ok", "message": f"Métrica para {input_data.date_ref} salva com sucesso"}

@router.post("/sync/zepp")
def sync_all_sources():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    # 1. Importa dados do Zepp (Fonte primária de wearable)
    zepp_count = import_zepp_data(ZEPP_DATA_DIR, repo, days=30)

    # 2. Importa/Reconcilia dados do Google Fit / Health Connect (Passos, PA, Frequência Cardíaca)
    google_count = import_google_health_data(GOOGLE_DATA_DIR, repo)

    return {
        "status": "ok",
        "zepp_records_imported": zepp_count,
        "google_fit_records_imported": google_count,
        "total_sources": 2
    }
