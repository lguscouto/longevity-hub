from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
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
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    gender: Optional[str] = None

    # Ficha Médica e Segurança (Medical ID)
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_physician: Optional[str] = None

    # Identidade e Metas de Longevidade
    longevity_goals: Optional[List[str]] = None
    protocol_start_date: Optional[str] = None

    # Estilo de Vida e Hábitos
    fasting_window: Optional[str] = None
    chronotype: Optional[str] = None
    daily_water_target_ml: Optional[int] = None
    target_sleep_hours: Optional[float] = None
    target_body_fat_pct: Optional[float] = None
    onboarding_completed: Optional[bool] = None

@router.get("", response_model=Dict[str, Any])
def get_profile():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        profile = repo.get_user_profile()
        latest_meas = repo.get_latest_weight_measurement()
        bio_snapshot = repo.get_profile_biological_age_snapshot()
        golden = repo.get_profile_golden_metrics()
        active_supps = repo.get_active_supplements_count()
    except FileNotFoundError:
        profile = {}
        latest_meas = None
        bio_snapshot = None
        golden = {}
        active_supps = 0

    current_weight = profile.get("current_weight_kg")
    if latest_meas and latest_meas.get("weight_kg") is not None:
        meas_weight = latest_meas["weight_kg"]
        if current_weight != meas_weight:
            current_weight = meas_weight
            try:
                repo.upsert_user_profile({"current_weight_kg": current_weight})
            except Exception:
                pass

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

    # Cálculo da Relação Cintura-Estatura (WHtR)
    waist_cm = golden.get("waist_cm")
    whtr = None
    if waist_cm and height_cm and height_cm > 0:
        whtr = round(waist_cm / height_cm, 2)

    # Classificação simplificada de percentil do VO2 Max
    vo2 = golden.get("vo2_max")
    vo2_percentile = None
    if vo2 is not None:
        if vo2 >= 48:
            vo2_percentile = "Top 10%"
        elif vo2 >= 42:
            vo2_percentile = "Top 20%"
        elif vo2 >= 35:
            vo2_percentile = "Média Populacional"
        else:
            vo2_percentile = "Abaixo da Média"

    # Cálculo de streak do protocolo
    streak_days = None
    start_date_str = profile.get("protocol_start_date")
    if start_date_str:
        try:
            sdate = date.fromisoformat(start_date_str[:10])
            streak_days = max(0, (date.today() - sdate).days)
        except Exception:
            streak_days = None

    # Contato de Emergência
    emergency_name = profile.get("emergency_contact_name")
    emergency_phone = profile.get("emergency_contact_phone")
    emergency_contact = None
    if emergency_name or emergency_phone:
        emergency_contact = {
            "name": emergency_name,
            "phone": emergency_phone,
        }

    golden_metrics = {
        "date_ref": golden.get("date_ref"),
        "vo2_max": golden.get("vo2_max"),
        "vo2_max_date": golden.get("vo2_max_date"),
        "vo2_max_percentile": vo2_percentile,
        "rhr_bpm": golden.get("rhr_bpm"),
        "hrv_ms": golden.get("hrv_ms"),
        "body_fat_pct": golden.get("body_fat_pct"),
        "body_fat_date": golden.get("body_fat_date"),
        "body_fat_source": golden.get("body_fat_source"),
        "target_body_fat_pct": profile.get("target_body_fat_pct"),
        "waist_cm": golden.get("waist_cm"),
        "waist_date": golden.get("waist_date"),
        "whtr": whtr,
        "grip_strength_kg": golden.get("grip_strength_kg"),
        "spo2_avg_pct": golden.get("spo2_avg_pct"),
    }

    protocol = {
        "status": "Protocolo Ativo",
        "start_date": start_date_str,
        "streak_days": streak_days,
        "longevity_goals": profile.get("longevity_goals") or [],
    }

    medical_id = {
        "blood_type": profile.get("blood_type"),
        "allergies": profile.get("allergies"),
        "family_history": profile.get("family_history"),
        "chronic_conditions": profile.get("chronic_conditions"),
        "emergency_contact": emergency_contact,
        "emergency_contact_name": emergency_name,
        "emergency_contact_phone": emergency_phone,
        "primary_physician": profile.get("primary_physician"),
    }

    lifestyle = {
        "fasting_window": profile.get("fasting_window"),
        "chronotype": profile.get("chronotype"),
        "daily_water_target_ml": profile.get("daily_water_target_ml"),
        "target_sleep_hours": profile.get("target_sleep_hours"),
        "target_body_fat_pct": profile.get("target_body_fat_pct"),
        "active_supplements_count": active_supps,
    }

    return {
        # Campos raiz tradicionais (retrocompatibilidade)
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
        "source": "Google Health API & Hub Longevidade",

        # Campos diretos de conveniência
        "blood_type": profile.get("blood_type"),
        "allergies": profile.get("allergies"),
        "family_history": profile.get("family_history"),
        "chronic_conditions": profile.get("chronic_conditions"),
        "emergency_contact_name": emergency_name,
        "emergency_contact_phone": emergency_phone,
        "primary_physician": profile.get("primary_physician"),
        "longevity_goals": profile.get("longevity_goals") or [],
        "protocol_start_date": start_date_str,
        "fasting_window": profile.get("fasting_window"),
        "chronotype": profile.get("chronotype"),
        "daily_water_target_ml": profile.get("daily_water_target_ml"),
        "target_sleep_hours": profile.get("target_sleep_hours"),
        "target_body_fat_pct": profile.get("target_body_fat_pct"),
        "onboarding_completed": bool(profile.get("onboarding_completed", False)),

        # Blocos ricos agregados
        "protocol": protocol,
        "biological_age": bio_snapshot,
        "golden_metrics": golden_metrics,
        "medical_id": medical_id,
        "lifestyle": lifestyle,
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


@router.post("/onboarding-complete")
def complete_onboarding():
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    repo.upsert_user_profile({"onboarding_completed": 1})
    return {"status": "ok", "message": "Onboarding concluído com sucesso"}
