from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict

from fastapi import APIRouter

from backend.app.config import get_db_path
from longevidade.calculators.kdm_age import (
    build_kdm_history_rows,
    calculate_kdm_biological_age,
    latest_kdm_biomarker_values,
)
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/kdm", tags=["KDM"])


def _repo() -> LongevityRepository:
    db_path = get_db_path()
    return LongevityRepository(db_path)


@router.get("/latest", response_model=Dict[str, Any])
def get_latest_kdm() -> Dict[str, Any]:
    try:
        repo = _repo()
        record = repo.get_latest_kdm_record()
    except FileNotFoundError:
        record = None

    if not record:
        return {
            "status": "incomplete",
            "reason": "no_kdm_record",
            "kdm_age": None,
            "kdm_delta": None,
            "missing_biomarkers": [],
            "biomarkers_used": [],
        }

    biomarkers_used = record.get("biomarkers_used")
    if isinstance(biomarkers_used, str):
        try:
            record["biomarkers_used"] = json.loads(biomarkers_used)
        except json.JSONDecodeError:
            record["biomarkers_used"] = [item.strip() for item in biomarkers_used.split(",") if item.strip()]
    record["status"] = "complete"
    record.setdefault("missing_biomarkers", [])
    return record


@router.get("/history", response_model=list[Dict[str, Any]])
def get_kdm_history(limit: int = 30) -> list[Dict[str, Any]]:
    try:
        repo = _repo()
        history = repo.get_kdm_history(limit=limit)
    except FileNotFoundError:
        return []

    for record in history:
        biomarkers_used = record.get("biomarkers_used")
        if isinstance(biomarkers_used, str):
            try:
                record["biomarkers_used"] = json.loads(biomarkers_used)
            except json.JSONDecodeError:
                record["biomarkers_used"] = [item.strip() for item in biomarkers_used.split(",") if item.strip()]
    return history


@router.post("/calculate", response_model=Dict[str, Any])
def calculate_and_save_kdm() -> Dict[str, Any]:
    repo = _repo()
    profile = repo.get_user_profile()
    chronological_age = float(profile.get("chronological_age") or 40.0)
    lab_results = repo.get_lab_results(limit=1000)
    daily_metrics = repo.get_daily_metrics(days=365)

    latest_values = latest_kdm_biomarker_values(lab_results, daily_metrics)
    historical_rows = build_kdm_history_rows(lab_results, daily_metrics, chronological_age)
    result = calculate_kdm_biological_age(
        chronological_age,
        latest_values,
        historical_data=historical_rows,
    )

    response: Dict[str, Any] = {
        "status": "incomplete" if result.get("status") != "complete" else "ok",
        "result": result,
        "kdm": result,
        "biomarkers_used": result.get("biomarkers_used", []),
        "missing_biomarkers": result.get("missing_biomarkers", []),
        "historical_rows": len(historical_rows),
        "saved": False,
        "id": None,
        "calculated_at": None,
    }

    if result.get("status") == "complete":
        row_id = repo.save_kdm_record({
            "calculated_at": date.today().isoformat(),
            "chronological_age": result["chronological_age"],
            "kdm_age": result["kdm_age"],
            "kdm_delta": result["kdm_delta"],
            "biomarkers_used": json.dumps(result.get("biomarkers_used", []), ensure_ascii=False),
            "notes": f"KDM real via BioAge; fit_observations={result.get('fit_observations')}; fit_biomarkers={result.get('fit_biomarkers_count')}",
        })
        response["id"] = row_id
        response["calculated_at"] = date.today().isoformat()
        response["saved"] = True

    return response
