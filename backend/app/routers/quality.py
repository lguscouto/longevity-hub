from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/quality", tags=["Data Quality & Coverage"])


class MetricQualityItem(BaseModel):
    date_ref: str
    metric_key: str
    source: str
    sample_count: Optional[int] = None
    coverage_pct: Optional[float] = None
    quality_status: str
    warnings: List[str] = []


class DailyQualitySummaryResponse(BaseModel):
    date_ref: str
    coverage_pct: float
    confidence: str  # "high", "medium", "low", "unavailable"
    metrics_available: int
    metrics_expected: int
    warnings: List[str]
    sources: List[str]
    items: List[MetricQualityItem]


@router.get("/daily", response_model=DailyQualitySummaryResponse)
def get_daily_quality_summary(date_ref: str):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    items_raw = repo.get_daily_metric_quality(date_ref)
    metric_items = [
        MetricQualityItem(
            date_ref=i["date_ref"],
            metric_key=i["metric_key"],
            source=i.get("source", "Zepp"),
            sample_count=i.get("sample_count"),
            coverage_pct=i.get("coverage_pct"),
            quality_status=i.get("quality_status", "high"),
            warnings=i.get("warnings") or [],
        )
        for i in items_raw
    ]

    expected_metrics = ["hrv_ms", "rhr_bpm", "steps", "sleep_minutes", "spo2_avg_pct", "respiratory_rate_rpm", "pai_score"]
    metrics_available = len([item for item in metric_items if item.quality_status != "unavailable"])
    
    total_coverage = sum(item.coverage_pct for item in metric_items if item.coverage_pct is not None)
    coverage_pct = round(total_coverage / len(metric_items), 1) if metric_items else 0.0

    all_warnings = []
    for item in metric_items:
        all_warnings.extend(item.warnings)
    
    sources = list(set(item.source for item in metric_items)) or ["Zepp"]

    if metrics_available >= 5 and coverage_pct >= 75.0:
        confidence = "high"
    elif metrics_available >= 3 and coverage_pct >= 40.0:
        confidence = "medium"
    elif metrics_available > 0:
        confidence = "low"
    else:
        confidence = "unavailable"

    return DailyQualitySummaryResponse(
        date_ref=date_ref,
        coverage_pct=coverage_pct,
        confidence=confidence,
        metrics_available=metrics_available,
        metrics_expected=len(expected_metrics),
        warnings=list(set(all_warnings)),
        sources=sources,
        items=metric_items,
    )
