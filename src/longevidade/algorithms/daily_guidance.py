"""
Motor determinístico de Orientação Diária (Daily Guidance).
Analisa VFC, RHR, Sono e Check-in para indicar o estado do dia, fatores determinantes e ação recomendada.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from longevidade.algorithms.personal_baseline import calculate_personal_baseline


def generate_daily_guidance(
    today_metric: Optional[Dict[str, Any]],
    historical_metrics: List[Dict[str, Any]],
    today_checkin: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Gera recomendação determinística do dia baseada no desvio da linha de base."""
    if not today_metric:
        return {
            "state": "insufficient_data",
            "label": "Dados insuficientes para a data",
            "confidence": "unavailable",
            "score": None,
            "factors": [],
            "primary_action": "Sincronize seu dispositivo ou registre os dados do dia.",
            "limitations": ["Nenhuma métrica fisiológica encontrada para a data de referência."],
        }

    hrv_series = [m.get("hrv_ms") for m in historical_metrics if m.get("hrv_ms") is not None]
    rhr_series = [m.get("rhr_bpm") for m in historical_metrics if m.get("rhr_bpm") is not None]
    sleep_series = [m.get("sleep_minutes") for m in historical_metrics if m.get("sleep_minutes") is not None]

    hrv_base = calculate_personal_baseline(hrv_series, minimum_observations=7)
    rhr_base = calculate_personal_baseline(rhr_series, minimum_observations=7)
    sleep_base = calculate_personal_baseline(sleep_series, minimum_observations=7)

    valid_bases = [b for b in (hrv_base, rhr_base, sleep_base) if b["status"] == "ok"]

    if not valid_bases:
        return {
            "state": "insufficient_data",
            "label": "Linha de Base Insuficiente",
            "confidence": "unavailable",
            "score": None,
            "factors": [],
            "primary_action": "Mantenha o uso diário para acumular histórico de linha de base (mínimo de 7 dias).",
            "limitations": ["Sem medições históricas suficientes (mínimo 7 dias) para calcular baseline pessoal."],
        }

    factors = []
    today_hrv = today_metric.get("hrv_ms")
    today_rhr = today_metric.get("rhr_bpm")
    today_sleep = today_metric.get("sleep_minutes")

    # P1 Guardrail: Cobertura de sinais fisiológicos de recuperação no dia
    observed_signals = []
    missing_signals = []

    if today_hrv is not None and hrv_base["status"] == "ok":
        observed_signals.append("hrv_ms")
    else:
        missing_signals.append("hrv_ms")

    if today_rhr is not None and rhr_base["status"] == "ok":
        observed_signals.append("rhr_bpm")
    else:
        missing_signals.append("rhr_bpm")

    if today_sleep is not None and sleep_base["status"] == "ok":
        observed_signals.append("sleep_minutes")
    else:
        missing_signals.append("sleep_minutes")

    if len(observed_signals) == 0:
        return {
            "state": "insufficient_data",
            "label": "Dados do Dia Insuficientes",
            "confidence": "unavailable",
            "score": None,
            "factors": [],
            "primary_action": "Sincronize seu dispositivo para coletar dados fisiológicos de recuperação (VFC, FC de repouso ou Sono) do dia.",
            "limitations": ["Nenhuma medição atual de recuperação (VFC, FC de repouso ou Sono) disponível para a data consultada."],
            "observed_signals": [],
            "missing_signals": missing_signals,
        }

    readiness_score = 75.0

    if today_hrv is not None and hrv_base["status"] == "ok":
        med = hrv_base["median"]
        diff_pct = round(((today_hrv - med) / med) * 100.0, 1) if med else 0.0
        if diff_pct < -10.0:
            readiness_score -= 15
            factors.append({"metric": "hrv_ms", "label": "VFC Noturna", "change_pct": diff_pct, "impact": "negative"})
        elif diff_pct > 10.0:
            readiness_score += 10
            factors.append({"metric": "hrv_ms", "label": "VFC Noturna", "change_pct": diff_pct, "impact": "positive"})

    if today_rhr is not None and rhr_base["status"] == "ok":
        med = rhr_base["median"]
        diff_pct = round(((today_rhr - med) / med) * 100.0, 1) if med else 0.0
        if diff_pct > 5.0:
            readiness_score -= 15
            factors.append({"metric": "rhr_bpm", "label": "FC de Repouso", "change_pct": diff_pct, "impact": "negative"})
        elif diff_pct < -5.0:
            readiness_score += 10
            factors.append({"metric": "rhr_bpm", "label": "FC de Repouso", "change_pct": diff_pct, "impact": "positive"})

    if today_sleep is not None and sleep_base["status"] == "ok":
        med = sleep_base["median"]
        diff_pct = round(((today_sleep - med) / med) * 100.0, 1) if med else 0.0
        if diff_pct < -15.0:
            readiness_score -= 15
            factors.append({"metric": "sleep_minutes", "label": "Duração do Sono", "change_pct": diff_pct, "impact": "negative"})
        elif diff_pct > 10.0:
            readiness_score += 10
            factors.append({"metric": "sleep_minutes", "label": "Duração do Sono", "change_pct": diff_pct, "impact": "positive"})

    # Ajuste por percepção subjetiva do check-in
    if today_checkin and today_checkin.get("energy_score"):
        e_score = today_checkin["energy_score"]
        if e_score <= 2:
            readiness_score -= 10
            factors.append({"metric": "energy_perceived", "label": "Disposição Percebida Baixa", "change_pct": 0, "impact": "negative"})
        elif e_score >= 4:
            readiness_score += 5

    limitations = []

    # Se apenas 1 sinal fisiológico estiver disponível hoje, limitar score máximo a 70 (impedir optimal e treino intenso)
    if len(observed_signals) == 1:
        readiness_score = min(readiness_score, 70.0)
        confidence = "low"
        limitations.append(f"Apenas 1 de 3 sinais de recuperação disponível hoje ({observed_signals[0]}). Recomendação conservadora sem treino intenso.")
    elif len(observed_signals) == 2:
        confidence = "medium"
        limitations.append(f"Falta o sinal de recuperação {missing_signals[0]} para cobertura fisiológica completa.")
    else:
        confidence = "high"

    final_score = int(max(0, min(100, readiness_score)))

    if final_score >= 75:
        state = "optimal"
        label = "Prontidão Elevada"
        primary_action = "Excelente dia para treinos mais intensos de força ou VO2 Max."
    elif final_score >= 50:
        state = "moderate"
        label = "Manutenção & Equilíbrio"
        primary_action = "Mantenha treinos leves/médios de Zona 2 e regularidade na rotina."
    else:
        state = "recover"
        label = "Priorize Recuperação"
        primary_action = "Reduza a carga física hoje, hidrate-se bem e antecipe o horário de ir para a cama."

    return {
        "state": state,
        "label": label,
        "confidence": confidence,
        "score": final_score,
        "factors": factors,
        "primary_action": primary_action,
        "limitations": limitations,
        "observed_signals": observed_signals,
        "missing_signals": missing_signals,
    }
