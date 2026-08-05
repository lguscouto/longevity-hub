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
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sql = "SELECT * FROM daily_checkins WHERE date_ref = ?;"
    with repo._get_connection() as conn:
        row = conn.execute(sql, (date_ref,)).fetchone()
        if not row:
            return {
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
        item = dict(row)
        item["tags"] = json.loads(item.get("tags_json") or "[]")
        return item


@router.put("/{date_ref}")
def upsert_daily_checkin(date_ref: str, input_data: DailyCheckinInput):
    if input_data.date_ref != date_ref:
        raise HTTPException(status_code=400, detail="Data da URL diverge do corpo da requisição")

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sql = """
    INSERT INTO daily_checkins (
        date_ref, energy_score, mood_score, perceived_stress, soreness_score, pain_score,
        symptom_severity, illness, alcohol_units, caffeine_last_at, bedtime_target_met, notes, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date_ref) DO UPDATE SET
        energy_score = excluded.energy_score,
        mood_score = excluded.mood_score,
        perceived_stress = excluded.perceived_stress,
        soreness_score = excluded.soreness_score,
        pain_score = excluded.pain_score,
        symptom_severity = excluded.symptom_severity,
        illness = excluded.illness,
        alcohol_units = excluded.alcohol_units,
        caffeine_last_at = excluded.caffeine_last_at,
        bedtime_target_met = excluded.bedtime_target_met,
        notes = excluded.notes,
        tags_json = excluded.tags_json,
        updated_at = CURRENT_TIMESTAMP;
    """

    values = (
        date_ref,
        input_data.energy_score,
        input_data.mood_score,
        input_data.perceived_stress,
        input_data.soreness_score,
        input_data.pain_score,
        input_data.symptom_severity,
        input_data.illness or 0,
        input_data.alcohol_units or 0.0,
        input_data.caffeine_last_at,
        input_data.bedtime_target_met,
        input_data.notes,
        json.dumps(input_data.tags or []),
    )

    with repo._get_connection() as conn:
        conn.execute(sql, values)
        conn.commit()

    return {"status": "ok", "message": "Check-in salvo com sucesso", "date_ref": date_ref}


@router.get("")
def list_daily_checkins(days: int = 90):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sql = "SELECT * FROM daily_checkins ORDER BY date_ref DESC LIMIT ?;"
    with repo._get_connection() as conn:
        rows = conn.execute(sql, (days,)).fetchall()
        result = []
        for r in rows:
            item = dict(r)
            item["tags"] = json.loads(item.get("tags_json") or "[]")
            result.append(item)
        return result
