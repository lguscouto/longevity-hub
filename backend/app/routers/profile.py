from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
from pathlib import Path
from datetime import date, datetime

from backend.app.config import get_db_path, BASE_DIR
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.google_health_client import get_default_token_path

router = APIRouter(prefix="/api/profile", tags=["Profile"])

GOOGLE_HEALTH_TOKEN_FILE = get_default_token_path()

class UserProfileInput(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    birthdate: Optional[str] = None
    chronological_age: Optional[float] = None
    height_cm: Optional[float] = None
    target_weight_kg: Optional[float] = None
    gender: Optional[str] = None

@router.get("", response_model=Dict[str, Any])
def get_profile():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        profile = repo.get_user_profile()
        daily = repo.get_daily_metrics(days=30)
    except FileNotFoundError:
        profile = {}
        daily = []
    latest_weight = next((m["weight_kg"] for m in daily if m.get("weight_kg") is not None), None)

    current_weight = latest_weight or profile.get("current_weight_kg")
    height_cm = profile.get("height_cm")

    # Cálculo do IMC (somente quando dados clínicos reais estão presentes)
    bmi = None
    if current_weight and height_cm and height_cm > 0:
        height_m = height_cm / 100.0
        bmi = round(current_weight / (height_m * height_m), 1)

    # Cálculo da Idade Cronológica via Data de Nascimento ou perfil
    birthdate_str = profile.get("birthdate")
    chrono_age = None
    if birthdate_str:
        try:
            bdate = date.fromisoformat(birthdate_str[:10])
            today = date.today()
            chrono_age = float(today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day)))
        except Exception:
            chrono_age = float(profile["chronological_age"]) if profile.get("chronological_age") is not None else None
    elif profile.get("chronological_age") is not None:
        chrono_age = float(profile["chronological_age"])

    google_connected = GOOGLE_HEALTH_TOKEN_FILE.is_file()

    return {
        "name": profile.get("name") or "Paciente",
        "email": profile.get("email"),
        "birthdate": birthdate_str,
        "chronological_age": chrono_age,
        "height_cm": height_cm,
        "current_weight_kg": current_weight,
        "target_weight_kg": profile.get("target_weight_kg"),
        "bmi": bmi,
        "gender": profile.get("gender"),
        "avatar_url": profile.get("avatar_url"),
        "google_connected": google_connected,
        "source": "Google Health API & Hub Longevidade"
    }

@router.post("")
def update_profile(input_data: UserProfileInput):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    data = input_data.model_dump(exclude_unset=True)
    if "birthdate" in data and data["birthdate"] and "chronological_age" not in data:
        try:
            bdate = date.fromisoformat(data["birthdate"][:10])
            today = date.today()
            data["chronological_age"] = float(today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day)))
        except Exception:
            pass
    repo.upsert_user_profile(data)
    return {"status": "ok", "message": "Perfil atualizado com sucesso"}
