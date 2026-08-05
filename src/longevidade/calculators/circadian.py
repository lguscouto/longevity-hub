"""
Calculador Circadiano e Assistente de Janela de Cafeína e Luz Matinal.
Estima a janela limite de consumo de cafeína (10 horas antes do horário-alvo de dormir).
"""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any, Dict, Optional


def calculate_circadian_windows(
    wake_time_str: Optional[str] = "07:00",
    target_bedtime_str: Optional[str] = "23:00",
) -> Dict[str, Any]:
    """Calcula horários ideais de exposição solar e horário limite de cafeína (Cutoff)."""
    try:
        wake_t = datetime.strptime(wake_time_str or "07:00", "%H:%M").time()
    except ValueError:
        wake_t = time(7, 0)

    try:
        bed_t = datetime.strptime(target_bedtime_str or "23:00", "%H:%M").time()
    except ValueError:
        bed_t = time(23, 0)

    dummy_date = datetime(2026, 1, 1)
    wake_dt = datetime.combine(dummy_date, wake_t)
    bed_dt = datetime.combine(dummy_date, bed_t)
    if bed_dt <= wake_dt:
        bed_dt += timedelta(days=1)

    # Luz matinal: primeiros 30-60 min pós-despertar
    morning_sun_start = wake_dt.strftime("%H:%M")
    morning_sun_end = (wake_dt + timedelta(minutes=45)).strftime("%H:%M")

    # Limite cafeína: 10 horas antes de dormir
    caffeine_cutoff = (bed_dt - timedelta(hours=10)).strftime("%H:%M")

    # Início do desaceleramento noturno (wind-down): 2 horas antes de dormir
    wind_down_start = (bed_dt - timedelta(hours=2)).strftime("%H:%M")

    return {
        "wake_time": wake_t.strftime("%H:%M"),
        "target_bedtime": bed_t.strftime("%H:%M"),
        "morning_sun_window": f"{morning_sun_start} às {morning_sun_end}",
        "caffeine_cutoff_time": caffeine_cutoff,
        "wind_down_start_time": wind_down_start,
        "recommendation": f"Consuma seu último café até as {caffeine_cutoff} para não prejudicar a VFC noturna.",
    }
