"""
Definição de janelas temporais de influência e priors fisiológicos para atribuição contextual.
Mapeia o impacto retrospectivo de álcool, sono, carga de treino, sintomas, cafeína e intervenções.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from longevidade.context.events import get_user_timezone
from longevidade.context.models import HealthEvent
from longevidade.context.timeline import _row_to_event


@dataclass(frozen=True)
class CandidateFactorRule:
    factor_key: str
    display_name: str
    event_types: List[str]
    window_hours_before: float  # Quantas horas antes da métrica buscar
    priors: Dict[str, float]    # Plausibilidade biológica prévia por métrica (0.0 a 1.0)
    decay_lambda: float = 1.0   # Taxa de decaimento temporal


FACTOR_RULES: List[CandidateFactorRule] = [
    CandidateFactorRule(
        factor_key="alcohol",
        display_name="Consumo de álcool",
        event_types=["alcohol"],
        window_hours_before=36.0,
        priors={
            "hrv_ms": 0.85,
            "rhr_bpm": 0.80,
            "sleep_minutes": 0.70,
            "weight_kg": 0.30,
        },
        decay_lambda=1.2,
    ),
    CandidateFactorRule(
        factor_key="symptom",
        display_name="Sintomas / Doença / Resfriado",
        event_types=["symptom"],
        window_hours_before=72.0,
        priors={
            "hrv_ms": 0.90,
            "rhr_bpm": 0.85,
            "sleep_minutes": 0.75,
            "weight_kg": 0.40,
        },
        decay_lambda=0.8,
    ),
    CandidateFactorRule(
        factor_key="training_load",
        display_name="Treino intenso ou carga elevada",
        event_types=["workout"],
        window_hours_before=48.0,
        priors={
            "hrv_ms": 0.70,
            "rhr_bpm": 0.65,
            "sleep_minutes": 0.50,
            "weight_kg": 0.35,
        },
        decay_lambda=1.0,
    ),
    CandidateFactorRule(
        factor_key="caffeine",
        display_name="Cafeína tardia",
        event_types=["caffeine"],
        window_hours_before=14.0,
        priors={
            "sleep_minutes": 0.80,
            "rhr_bpm": 0.55,
            "hrv_ms": 0.40,
            "weight_kg": 0.10,
        },
        decay_lambda=1.5,
    ),
    CandidateFactorRule(
        factor_key="stress",
        display_name="Estresse elevado",
        event_types=["stress"],
        window_hours_before=48.0,
        priors={
            "hrv_ms": 0.75,
            "sleep_minutes": 0.70,
            "rhr_bpm": 0.60,
            "weight_kg": 0.20,
        },
        decay_lambda=1.0,
    ),
    CandidateFactorRule(
        factor_key="travel",
        display_name="Viagem ou alteração de fuso",
        event_types=["travel"],
        window_hours_before=96.0,
        priors={
            "sleep_minutes": 0.75,
            "hrv_ms": 0.60,
            "rhr_bpm": 0.50,
            "weight_kg": 0.25,
        },
        decay_lambda=0.7,
    ),
    CandidateFactorRule(
        factor_key="supplement",
        display_name="Início ou alteração de suplemento/protocolo",
        event_types=["supplement", "medication"],
        window_hours_before=336.0,  # até 14 dias
        priors={
            "hrv_ms": 0.45,
            "rhr_bpm": 0.45,
            "sleep_minutes": 0.50,
            "weight_kg": 0.30,
        },
        decay_lambda=0.4,
    ),
    CandidateFactorRule(
        factor_key="nutrition",
        display_name="Jantar pesado / Jejum / Dieta",
        event_types=["nutrition"],
        window_hours_before=24.0,
        priors={
            "sleep_minutes": 0.65,
            "rhr_bpm": 0.60,
            "hrv_ms": 0.50,
            "weight_kg": 0.50,
        },
        decay_lambda=1.2,
    ),
]


def evaluate_factor_dose(event: HealthEvent) -> float:
    """Calcula um fator multiplicador de dose/magnitude em [0.5, 1.0]."""
    meta = event.metadata or {}
    t = event.event_type.lower()

    if t == "alcohol":
        servings = meta.get("servings") or 1
        if servings >= 3:
            return 1.0
        elif servings == 2:
            return 0.85
        return 0.70

    if t == "symptom":
        sev = str(meta.get("severity") or "moderada").lower()
        if sev == "severa":
            return 1.0
        elif sev == "moderada":
            return 0.85
        return 0.65

    if t == "workout":
        volume = meta.get("volume_kg") or 0.0
        dur = meta.get("duration_min") or 0.0
        if volume > 3000 or dur >= 60:
            return 1.0
        elif volume > 1000 or dur >= 40:
            return 0.85
        return 0.70

    if t == "stress":
        level = str(meta.get("stress_level") or "").lower()
        if "extremo" in level:
            return 1.0
        if "elevado" in level:
            return 0.85
        return 0.70

    return 0.75


def find_candidate_events_for_metric(
    conn: sqlite3.Connection,
    target_metric: str,
    target_date: str,
    user_tz_name: Optional[str] = None,
) -> List[Tuple[CandidateFactorRule, HealthEvent, float]]:
    """Busca eventos que ocorreram dentro das janelas de influência prévias à métrica.

    Retorna lista de tuplas: (Regra, HealthEvent, horas_anteriores).
    """
    tz = get_user_timezone(user_tz_name)
    # Assume que a métrica do dia (sono, HRV matinal) foi registrada por volta das 08:00 locais do target_date
    try:
        ref_local = datetime.strptime(f"{target_date} 08:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)
    except Exception:
        ref_local = datetime.now(tz)

    candidates: List[Tuple[CandidateFactorRule, HealthEvent, float]] = []

    # Busca eventos nos últimos 14 dias para cobrir a maior janela possível
    min_date = (ref_local - timedelta(days=14)).strftime("%Y-%m-%d")
    cur = conn.execute(
        """
        SELECT * FROM health_events
        WHERE date_ref >= ? AND date_ref <= ?
        ORDER BY timestamp DESC;
        """,
        (min_date, target_date),
    )
    rows = cur.fetchall()

    for row in rows:
        ev = _row_to_event(row)
        # Parse timestamp do evento para calcular diferença em horas
        try:
            cleaned = ev.timestamp.replace("Z", "+00:00")
            ev_dt = datetime.fromisoformat(cleaned).astimezone(tz)
        except Exception:
            ev_dt = datetime.strptime(f"{ev.date_ref} 12:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)

        delta_hours = (ref_local - ev_dt).total_seconds() / 3600.0
        if delta_hours < -1.0:  # Eventos futuros em relação ao momento de medição da métrica
            continue

        # Garante não negativo para proximidade
        delta_hours = max(0.5, delta_hours)

        for rule in FACTOR_RULES:
            if ev.event_type in rule.event_types or ev.category in rule.event_types:
                if delta_hours <= rule.window_hours_before:
                    candidates.append((rule, ev, delta_hours))
                    break

    return candidates
