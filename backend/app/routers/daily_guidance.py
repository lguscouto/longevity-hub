from fastapi import APIRouter
from backend.app.config import get_db_path
from longevidade.algorithms.daily_guidance import generate_daily_guidance
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/daily-guidance", tags=["Daily Guidance"])


@router.get("")
def get_daily_guidance(date_ref: str):
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        today_metric = repo.get_daily_metric_by_date(date_ref)
        all_metrics = repo.get_daily_metrics(days=60)
        # Temporal leakage protection: only use metrics from dates strictly before date_ref
        history_metrics = [m for m in all_metrics if m.get("date_ref") and m["date_ref"] < date_ref]
    except FileNotFoundError:
        today_metric = None
        history_metrics = []
        repo = None
    
    checkin = None
    if repo:
        try:
            sql = "SELECT * FROM daily_checkins WHERE date_ref = ?;"
            with repo._get_connection() as conn:
                row = conn.execute(sql, (date_ref,)).fetchone()
                if row:
                    checkin = dict(row)
        except Exception:
            pass

    return generate_daily_guidance(today_metric, history_metrics, checkin)
