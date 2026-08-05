"""
Calculador Local de Bateria Corporal / Energy Bank.
Estima a recarga acumulada (qualidade/duração do sono e VFC noturna)
e o consumo diurno (estresse médio, passos e carga de treino).
"""

from __future__ import annotations

from typing import Any, Dict, Optional


def calculate_energy_bank(
    today_metric: Optional[Dict[str, Any]],
    checkin: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Calcula nivel de recarga, consumo e estado atual da bateria corporal (0-100%)."""
    if not today_metric or today_metric.get("sleep_minutes") is None or today_metric.get("hrv_ms") is None:
        return {
            "status": "unavailable",
            "current_level": None,
            "recharge": 0,
            "drain": 0,
            "recommendation": "Sincronize dados de sono e VFC noturna para calcular a bateria corporal.",
        }

    sleep_min = float(today_metric["sleep_minutes"])
    hrv = float(today_metric["hrv_ms"])
    rhr = float(today_metric.get("rhr_bpm") or 60.0)
    steps = float(today_metric.get("steps") or 0)
    training_load = float(today_metric.get("training_load_daily") or 0)

    # Recarga no sono (baseada em horas dormidas e VFC)
    sleep_hours = sleep_min / 60.0
    sleep_score_part = min(50, (sleep_hours / 8.0) * 50.0)
    hrv_score_part = min(50, (hrv / 50.0) * 50.0)
    recharge = int(min(100, sleep_score_part + hrv_score_part))

    # Consumo (passos + carga física + estresse)
    steps_drain = min(30, (steps / 10000.0) * 30.0)
    load_drain = min(30, (training_load / 150.0) * 30.0)
    stress_drain = 20 if rhr > 65 else 10

    if checkin and checkin.get("perceived_stress"):
        stress_drain += (checkin["perceived_stress"] - 1) * 5

    drain = int(min(90, steps_drain + load_drain + stress_drain))

    current_level = int(max(5, min(100, recharge - drain + 40)))

    if current_level >= 70:
        recommendation = "Nível de energia excelente. Bom momento para atividades exigentes."
    elif current_level >= 40:
        recommendation = "Bateria moderada. Alterne trabalho focado com pausas ativas."
    else:
        recommendation = "Energia em nível crítico. Evite cafeína tardia e priorize descanso."

    return {
        "status": "ok",
        "current_level": current_level,
        "recharge": recharge,
        "drain": drain,
        "recommendation": recommendation,
    }
