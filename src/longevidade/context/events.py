"""
Adaptadores e construtores de eventos de saúde a partir de entidades canônicas do sistema.
Garante idempotência através de chaves únicas e padronização temporal no fuso horário do usuário.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4
from zoneinfo import ZoneInfo

from longevidade.context.models import HealthEvent


DEFAULT_TIMEZONE = "America/Sao_Paulo"


def get_user_timezone(tz_name: Optional[str] = None) -> ZoneInfo:
    """Retorna o ZoneInfo do usuário com fallback seguro para America/Sao_Paulo."""
    try:
        return ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except Exception:
        return ZoneInfo(DEFAULT_TIMEZONE)


def format_iso_utc(dt: datetime) -> str:
    """Garante datetime em UTC no formato ISO 8601 com sufixo Z."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def resolve_local_date_and_time(
    iso_timestamp: str,
    user_tz_name: Optional[str] = None,
) -> tuple[str, Optional[str]]:
    """Converte um timestamp ISO para date_ref (YYYY-MM-DD) e time_ref (HH:MM) no fuso local."""
    tz = get_user_timezone(user_tz_name)
    try:
        cleaned = iso_timestamp.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        local_dt = dt.astimezone(tz)
        return local_dt.strftime("%Y-%m-%d"), local_dt.strftime("%H:%M")
    except Exception:
        # Fallback ingênuo se formato for string simples YYYY-MM-DD
        if len(iso_timestamp) >= 10:
            return iso_timestamp[:10], None
        return datetime.now(tz).strftime("%Y-%m-%d"), None


def workout_to_health_event(
    row: Dict[str, Any],
    user_tz_name: Optional[str] = None,
) -> HealthEvent:
    """Projeta um registro da tabela workouts como HealthEvent idempotente."""
    workout_id = str(row["id"])
    workout_date = str(row["workout_date"])
    workout_time = str(row.get("workout_time") or "12:00")
    if len(workout_time) == 5:
        workout_time += ":00"

    tz = get_user_timezone(user_tz_name)
    try:
        local_dt = datetime.strptime(f"{workout_date} {workout_time}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
        utc_ts = format_iso_utc(local_dt)
    except Exception:
        utc_ts = format_iso_utc(datetime.now(timezone.utc))

    category = row.get("category") or "Musculação"
    activity = row.get("activity_type") or category
    title_raw = row.get("title")
    title = f"Treino: {title_raw}" if title_raw else f"Treino: {activity.capitalize()}"

    duration = row.get("duration_min") or 0
    calories = row.get("calories") or 0
    volume_kg = row.get("volume_kg") or 0.0
    sets = row.get("sets_count") or 0
    reps = row.get("reps_count") or 0

    desc_parts = []
    if duration:
        desc_parts.append(f"{int(duration)} min")
    if calories:
        desc_parts.append(f"{int(calories)} kcal")
    if volume_kg and volume_kg > 0:
        desc_parts.append(f"Volume: {volume_kg:.0f} kg ({sets} séries, {reps} reps)")
    description = " • ".join(desc_parts) if desc_parts else "Treino registrado"

    significance = "notável" if (volume_kg > 1000 or duration >= 45) else "normal"

    metadata = {
        "workout_id": workout_id,
        "category": category,
        "activity_type": activity,
        "duration_min": duration,
        "calories": calories,
        "volume_kg": volume_kg,
        "sets_count": sets,
        "reps_count": reps,
        "source": row.get("source") or "Zepp",
    }

    return HealthEvent(
        id=str(uuid4()),
        timestamp=utc_ts,
        date_ref=workout_date,
        time_ref=workout_time[:5],
        event_type="workout",
        category="exercise",
        title=title,
        description=description,
        source=str(row.get("source") or "Zepp").lower(),
        source_type="workout",
        source_id=workout_id,
        source_key=f"workout:{workout_id}",
        confidence="high",
        significance=significance,
        metadata=metadata,
        created_at=str(row.get("created_at") or utc_ts),
    )


def lab_result_to_health_event(
    row: Dict[str, Any],
    user_tz_name: Optional[str] = None,
) -> HealthEvent:
    """Projeta um registro de lab_results como HealthEvent idempotente."""
    lab_id = str(row["id"])
    collected_at = str(row["collected_at"])
    tz = get_user_timezone(user_tz_name)

    try:
        if "T" in collected_at or " " in collected_at:
            cleaned = collected_at.replace(" ", "T")
            if not cleaned.endswith("Z") and "+" not in cleaned and "-" not in cleaned[10:]:
                local_dt = datetime.fromisoformat(cleaned).replace(tzinfo=tz)
                utc_ts = format_iso_utc(local_dt)
                date_ref = local_dt.strftime("%Y-%m-%d")
                time_ref = local_dt.strftime("%H:%M")
            else:
                date_ref, time_ref = resolve_local_date_and_time(cleaned, user_tz_name)
                utc_ts = format_iso_utc(datetime.fromisoformat(cleaned))
        else:
            date_ref = collected_at[:10]
            local_dt = datetime.strptime(f"{date_ref} 08:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
            utc_ts = format_iso_utc(local_dt)
            time_ref = "08:00"
    except Exception:
        date_ref = collected_at[:10] if len(collected_at) >= 10 else datetime.now(tz).strftime("%Y-%m-%d")
        utc_ts = format_iso_utc(datetime.now(timezone.utc))
        time_ref = "08:00"

    metric_name = row.get("metric_name") or row.get("metric_key") or "Exame"
    value = row.get("value")
    unit = row.get("unit") or ""
    ref_min = row.get("ref_min")
    ref_max = row.get("ref_max")
    optimal = row.get("optimal_target")

    val_str = f"{value:g}" if isinstance(value, (int, float)) else str(value)
    title = f"Exame: {metric_name}"
    description = f"{val_str} {unit}".strip()

    significance = "normal"
    if isinstance(value, (int, float)):
        if (ref_min is not None and value < ref_min) or (ref_max is not None and value > ref_max):
            significance = "significativa"
            description += " (Fora da referência)"

    metadata = {
        "lab_id": lab_id,
        "metric_key": row.get("metric_key"),
        "metric_name": metric_name,
        "value": value,
        "unit": unit,
        "ref_min": ref_min,
        "ref_max": ref_max,
        "optimal_target": optimal,
        "category": row.get("category"),
    }

    return HealthEvent(
        id=str(uuid4()),
        timestamp=utc_ts,
        date_ref=date_ref,
        time_ref=time_ref,
        event_type="lab_result",
        category="clinical",
        title=title,
        description=description,
        source=str(row.get("record_origin") or "lab_import").lower(),
        source_type="lab_result",
        source_id=lab_id,
        source_key=f"lab_result:{lab_id}",
        confidence="high",
        significance=significance,
        metadata=metadata,
        created_at=str(row.get("created_at") or utc_ts),
    )


def supplement_to_health_event(
    row: Dict[str, Any],
    user_tz_name: Optional[str] = None,
) -> HealthEvent:
    """Projeta um registro de supplement_stack como HealthEvent (início de suplementação)."""
    supp_id = str(row["id"])
    start_date = str(row["start_date"])
    tz = get_user_timezone(user_tz_name)

    try:
        local_dt = datetime.strptime(f"{start_date} 09:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
        utc_ts = format_iso_utc(local_dt)
    except Exception:
        utc_ts = format_iso_utc(datetime.now(timezone.utc))

    name = row.get("name") or "Suplemento"
    dosage = row.get("dosage") or ""
    timing = row.get("timing") or "Diário"
    category_raw = row.get("category") or "Suplemento"

    title = f"Protocolo: Início de {name}"
    description = f"{dosage} • {timing}".strip(" •")

    metadata = {
        "supplement_id": supp_id,
        "name": name,
        "dosage": dosage,
        "category": category_raw,
        "frequency": row.get("frequency"),
        "timing": timing,
        "notes": row.get("notes"),
    }

    return HealthEvent(
        id=str(uuid4()),
        timestamp=utc_ts,
        date_ref=start_date,
        time_ref="09:00",
        event_type="supplement",
        category="intervention",
        title=title,
        description=description,
        source="system",
        source_type="supplement_stack",
        source_id=supp_id,
        source_key=f"supplement:{supp_id}:{start_date}",
        confidence="high",
        significance="notável",
        metadata=metadata,
        created_at=str(row.get("created_at") or utc_ts),
    )


def manual_entry_to_health_event(
    row: Dict[str, Any],
    user_tz_name: Optional[str] = None,
) -> HealthEvent:
    """Projeta um registro de manual_entries (como álcool, sintomas ou peso manual)."""
    entry_id = str(row["id"])
    entry_date = str(row["entry_date"])
    tz = get_user_timezone(user_tz_name)

    try:
        local_dt = datetime.strptime(f"{entry_date} 20:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
        utc_ts = format_iso_utc(local_dt)
    except Exception:
        utc_ts = format_iso_utc(datetime.now(timezone.utc))

    metric_key = str(row.get("metric_key") or "manual")
    value = row.get("value")
    unit = row.get("unit") or ""
    notes = row.get("notes") or ""

    if "alcohol" in metric_key.lower():
        title = "Consumo de álcool"
        event_type = "alcohol"
        category = "lifestyle"
        description = f"{value:g} {unit or 'doses'}" if isinstance(value, (int, float)) else str(value)
        if notes:
            description += f" ({notes})"
    else:
        title = f"Registro: {metric_key}"
        event_type = metric_key
        category = "lifestyle"
        val_str = f"{value:g}" if isinstance(value, (int, float)) else str(value)
        description = f"{val_str} {unit}".strip()
        if notes:
            description += f" — {notes}"

    metadata = {
        "manual_entry_id": entry_id,
        "metric_key": metric_key,
        "value": value,
        "unit": unit,
        "notes": notes,
    }

    return HealthEvent(
        id=str(uuid4()),
        timestamp=utc_ts,
        date_ref=entry_date,
        time_ref="20:00",
        event_type=event_type,
        category=category,
        title=title,
        description=description,
        source="manual",
        source_type="manual_entry",
        source_id=entry_id,
        source_key=f"manual_entry:{entry_id}",
        confidence="high",
        significance="notável",
        metadata=metadata,
        created_at=str(row.get("created_at") or utc_ts),
    )
