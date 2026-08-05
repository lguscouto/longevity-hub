from fastapi import APIRouter
from backend.app.config import get_db_path
from longevidade.analytics.correlations import analyze_metric_correlations
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/correlations", tags=["Correlations Engine"])


@router.get("")
def get_correlations(target_metric: str = "hrv_ms", max_lag_days: int = 2, days: int = 90):
    db_path = get_db_path()
    repo = LongevityRepository(db_path)

    metrics = []
    try:
        metrics = repo.get_daily_metrics(days=days)
    except FileNotFoundError:
        metrics = []

    # Merge checkins into daily metrics for unified correlation analysis
    sql = "SELECT * FROM daily_checkins ORDER BY date_ref DESC LIMIT ?;"
    checkin_map = {}
    try:
        with repo._get_connection() as conn:
            rows = conn.execute(sql, (days,)).fetchall()
            for r in rows:
                item = dict(r)
                checkin_map[item["date_ref"]] = item
    except FileNotFoundError:
        pass
    except Exception as exc:
        print(f"[Correlations] Aviso ao carregar check-ins: {exc}")

    merged_records = []
    for m in metrics:
        d_ref = m["date_ref"]
        rec = dict(m)
        if d_ref in checkin_map:
            c = checkin_map[d_ref]
            rec["energy_score"] = c.get("energy_score")
            rec["perceived_stress"] = c.get("perceived_stress")
            rec["alcohol_units"] = c.get("alcohol_units")
        merged_records.append(rec)

    correlations = analyze_metric_correlations(merged_records, target_metric=target_metric, max_lag_days=max_lag_days)
    return {
        "target_metric": target_metric,
        "max_lag_days": max_lag_days,
        "correlations": correlations,
    }
