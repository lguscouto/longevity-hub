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

GOOGLE_CONFIG_DIR = BASE_DIR.parent / "google health" / "config"
GOOGLE_TOKEN_FILE = GOOGLE_CONFIG_DIR / "google_token.json"
GOOGLE_HEALTH_TOKEN_FILE = get_default_token_path()
GOOGLE_DATA_DIR = BASE_DIR.parent / "google health" / "data"

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

    # Tenta extrair peso do google_weight.json se ainda ausente
    if latest_weight is None and (GOOGLE_DATA_DIR / "google_weight.json").is_file():
        try:
            payload = json.loads((GOOGLE_DATA_DIR / "google_weight.json").read_text(encoding="utf-8"))
            for b in reversed(payload.get("bucket", [])):
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        for val in pt.get("value", []):
                            v = val.get("fpVal") or val.get("intVal")
                            if v:
                                latest_weight = float(v)
                                break
                    if latest_weight: break
                if latest_weight: break
        except Exception:
            pass

    # Tenta extrair altura do google_height.json se presente
    google_height_cm = None
    if (GOOGLE_DATA_DIR / "google_height.json").is_file():
        try:
            payload = json.loads((GOOGLE_DATA_DIR / "google_height.json").read_text(encoding="utf-8"))
            for b in reversed(payload.get("bucket", [])):
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        for val in pt.get("value", []):
                            v = val.get("fpVal") or val.get("intVal")
                            if v:
                                # Se estiver em metros (ex: 1.70), converte para cm (170.0)
                                google_height_cm = float(v) * 100.0 if float(v) < 3.0 else float(v)
                                break
                    if google_height_cm: break
                if google_height_cm: break
        except Exception:
            pass

    current_weight = latest_weight or profile.get("current_weight_kg")
    height_cm = google_height_cm or profile.get("height_cm") or 170.0

    # Cálculo do IMC
    bmi = None
    if current_weight and height_cm and height_cm > 0:
        height_m = height_cm / 100.0
        bmi = round(current_weight / (height_m * height_m), 1)

    # Cálculo da Idade Cronológica via Data de Nascimento
    birthdate_str = profile.get("birthdate") or "1994-03-22"
    chrono_age = 32.0
    if birthdate_str:
        try:
            bdate = date.fromisoformat(birthdate_str[:10])
            today = date.today()
            chrono_age = float(today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day)))
        except Exception:
            chrono_age = float(profile.get("chronological_age") or 32.0)

    google_token_present = GOOGLE_HEALTH_TOKEN_FILE.is_file() or GOOGLE_TOKEN_FILE.is_file()

    return {
        "name": profile.get("name") or "Paciente Longevidade",
        "email": profile.get("email") or "googlefit@longevidade.local",
        "birthdate": birthdate_str,
        "chronological_age": chrono_age,
        "height_cm": height_cm,
        "current_weight_kg": current_weight,
        "target_weight_kg": profile.get("target_weight_kg") or 75.0,
        "bmi": bmi,
        "gender": profile.get("gender") or "Masculino",
        "avatar_url": profile.get("avatar_url"),
        "google_connected": google_token_present,
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
