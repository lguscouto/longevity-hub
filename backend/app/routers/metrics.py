from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import get_db_path, ZEPP_DATA_DIR, GOOGLE_DATA_DIR, BASE_DIR
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.zepp_importer import import_zepp_data
from longevidade.ingestion.google_importer import import_google_health_data

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


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
    spo2_avg_pct: Optional[float] = None
    spo2_min_pct: Optional[float] = None
    respiratory_rate_rpm: Optional[float] = None
    pai_score: Optional[float] = None


@router.get("", response_model=List[Dict[str, Any]])
def get_metrics(days: int = Query(30, ge=1, le=365)):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_daily_metrics(days=days)


@router.post("")
def add_or_update_metric(input_data: DailyMetricInput):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    data = input_data.model_dump(exclude_unset=True)
    repo.upsert_daily_metric(data)
    return {"status": "ok", "message": f"Métrica para {input_data.date_ref} salva com sucesso"}


@router.post("/sync/zepp")
def sync_all_sources():
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # 1. Importa dados do Zepp (Fonte primária de wearable)
    zepp_result = import_zepp_data(ZEPP_DATA_DIR, repo, days=30)

    # Não mascarar falha de coleta Zepp como sucesso nem reconciliar fontes
    # secundárias sobre snapshots sabidamente antigos.
    if isinstance(zepp_result, dict) and zepp_result.get("status") == "ERRO":
        detail = zepp_result.get("summary") or "Não foi possível atualizar os dados do Zepp."
        raise HTTPException(status_code=502, detail=detail)

    # 2. Importa/Reconcilia dados do Google Fit / Health Connect (Passos, PA, Frequência Cardíaca)
    google_result = import_google_health_data(GOOGLE_DATA_DIR, repo)

    zepp_count = (
        zepp_result.get("records_inserted", 0)
        if isinstance(zepp_result, dict)
        else (zepp_result if isinstance(zepp_result, int) else 0)
    )
    google_count = (
        google_result.get("records_inserted", 0)
        if isinstance(google_result, dict)
        else (google_result if isinstance(google_result, int) else 0)
    )

    return {
        "status": "ok",
        "zepp": zepp_result,
        "google_fit": google_result,
        "zepp_records_imported": zepp_count,
        "google_fit_records_imported": google_count,
        "total_sources": 2,
    }
