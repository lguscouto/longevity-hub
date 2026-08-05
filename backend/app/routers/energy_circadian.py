from fastapi import APIRouter
from backend.app.config import get_db_path
from longevidade.calculators.circadian import calculate_circadian_windows
from longevidade.calculators.energy_and_stress import calculate_energy_bank
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/energy-circadian", tags=["Energy & Circadian Assistant"])


@router.get("")
def get_energy_circadian(date_ref: str, wake_time: str = "07:00", target_bedtime: str = "23:00"):
    db_path = get_db_path()
    repo = LongevityRepository(db_path)

    today_metric = repo.get_daily_metric_by_date(date_ref)

    checkin = None
    try:
        sql = "SELECT * FROM daily_checkins WHERE date_ref = ?;"
        with repo._get_connection() as conn:
            row = conn.execute(sql, (date_ref,)).fetchone()
            if row:
                checkin = dict(row)
    except Exception:
        pass

    energy_res = calculate_energy_bank(today_metric, checkin)
    circadian_res = calculate_circadian_windows(wake_time, target_bedtime)

    return {
        "date_ref": date_ref,
        "energy_bank": energy_res,
        "circadian": circadian_res,
    }
