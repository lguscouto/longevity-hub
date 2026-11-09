from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/checkins", tags=["Daily Check-ins"])


class DailyCheckinInput(BaseModel):
    date_ref: str
    energy_score: Optional[int] = Field(None, ge=1, le=5)
    mood_score: Optional[int] = Field(None, ge=1, le=5)
    perceived_stress: Optional[int] = Field(None, ge=1, le=5)
    soreness_score: Optional[int] = Field(None, ge=1, le=5)
    pain_score: Optional[int] = Field(None, ge=1, le=5)
    symptom_severity: Optional[int] = Field(None, ge=1, le=5)
    illness: Optional[int] = 0
    alcohol_units: Optional[float] = 0.0
    caffeine_last_at: Optional[str] = None
    bedtime_target_met: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []


@router.get("/{date_ref}")
def get_daily_checkin(date_ref: str):
    db_path = get_db_path()
    empty_payload = {
        "date_ref": date_ref,
        "energy_score": None,
        "mood_score": None,
        "perceived_stress": None,
        "soreness_score": None,
        "pain_score": None,
        "symptom_severity": None,
        "illness": 0,
        "alcohol_units": 0.0,
        "caffeine_last_at": None,
        "bedtime_target_met": None,
        "notes": None,
        "tags": [],
    }
    try:
        repo = LongevityRepository(db_path)
        item = repo.get_daily_checkin(date_ref)
        return item if item is not None else empty_payload
    except FileNotFoundError:
        return empty_payload


@router.put("/{date_ref}")
def upsert_daily_checkin(date_ref: str, input_data: DailyCheckinInput):
    if input_data.date_ref != date_ref:
        raise HTTPException(status_code=400, detail="Data da URL diverge do corpo da requisição")

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    repo.upsert_daily_checkin(input_data.model_dump())

    return {"status": "ok", "message": "Check-in salvo com sucesso", "date_ref": date_ref}


@router.get("")
def list_daily_checkins(days: int = 90):
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return repo.list_daily_checkins(days=days)
    except FileNotFoundError:
        return []
