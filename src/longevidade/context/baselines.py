"""
Cálculo de baselines pessoais móveis com estatística robusta (Mediana e MAD).
Implementa critérios híbridos por métrica com pisos clínicos e direções fisiológicas relevantes.
"""

from __future__ import annotations

import math
import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class BaselineResult:
    metric: str
    date_ref: str
    observed_value: float
    baseline_value: float       # Mediana do baseline
    mad_value: float            # Median Absolute Deviation
    robust_z_score: float
    delta_absolute: float
    delta_percent: float
    valid_days_count: int
    confidence: str             # 'low', 'moderate', 'high', 'insufficient_history'
    significance: str           # 'normal', 'notável', 'significativa'
    direction_relevant: bool    # Se a mudança ocorreu na direção fisiológica de estresse/piora
    status_message: str


METRIC_SPECS = {
    "hrv_ms": {
        "name": "HRV",
        "unit": "ms",
        "direction": "down",     # Queda no HRV é o sinal de estresse
        "min_delta_abs": 5.0,    # Pelo menos 5 ms de queda
        "min_delta_pct": -15.0,  # Pelo menos 15% de queda
        "z_threshold_notable": -1.2,
        "z_threshold_significant": -1.5,
    },
    "rhr_bpm": {
        "name": "Frequência Cardíaca de Repouso",
        "unit": "bpm",
        "direction": "up",       # Aumento na FC de repouso é sinal de estresse
        "min_delta_abs": 5.0,    # Pelo menos +5 bpm
        "min_delta_pct": 8.0,    # Pelo menos +8%
        "z_threshold_notable": 1.2,
        "z_threshold_significant": 1.5,
    },
    "sleep_minutes": {
        "name": "Duração do Sono",
        "unit": "min",
        "direction": "down",     # Déficit de sono é o estressor principal
        "min_delta_abs": 60.0,   # Pelo menos 1 hora a menos
        "min_delta_pct": -15.0,
        "z_threshold_notable": -1.2,
        "z_threshold_significant": -1.5,
    },
    "weight_kg": {
        "name": "Peso Corporal",
        "unit": "kg",
        "direction": "both",     # Variação em ambas as direções
        "min_delta_abs": 1.2,
        "min_delta_pct": 1.5,
        "z_threshold_notable": 1.2,
        "z_threshold_significant": 1.5,
    },
}


def calculate_median(values: List[float]) -> float:
    """Calcula a mediana exata de uma lista de floats."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mid = n // 2
    if n % 2 == 1:
        return float(sorted_vals[mid])
    return float((sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0)


def calculate_mad(values: List[float], median_val: float) -> float:
    """Calcula o Median Absolute Deviation (MAD)."""
    if not values:
        return 0.0
    deviations = [abs(x - median_val) for x in values]
    return calculate_median(deviations)


def calculate_robust_z_score(value: float, median_val: float, mad_val: float) -> float:
    """Calcula o Robust Z-Score: (x - median) / (1.4826 * (MAD + epsilon))."""
    epsilon = 1e-6
    scale = 1.4826 * (mad_val + epsilon)
    return (value - median_val) / scale


def fetch_metric_history(
    conn: sqlite3.Connection,
    metric_col: str,
    target_date: str,
    window_days: int = 30,
) -> Tuple[Optional[float], List[float]]:
    """Busca o valor observado no target_date e a série histórica prévia de window_days."""
    # Valor observado na data-alvo
    cur = conn.execute(
        f"SELECT {metric_col} FROM daily_metrics WHERE date_ref = ? LIMIT 1;",
        (target_date,),
    )
    target_row = cur.fetchone()
    observed: Optional[float] = None
    if target_row and target_row[0] is not None:
        try:
            observed = float(target_row[0])
        except (ValueError, TypeError):
            observed = None

    # Histórico prévio estritamente anterior à data-alvo (t-30 até t-1)
    history_cur = conn.execute(
        f"""
        SELECT {metric_col}
        FROM daily_metrics
        WHERE date_ref < ? AND {metric_col} IS NOT NULL
        ORDER BY date_ref DESC
        LIMIT ?;
        """,
        (target_date, window_days),
    )
    history_vals = [float(r[0]) for r in history_cur.fetchall() if r[0] is not None]
    return observed, history_vals


def calculate_moving_average_weight(
    conn: sqlite3.Connection,
    target_date: str,
    days: int = 7,
) -> Optional[float]:
    """Calcula a média móvel de peso dos últimos N dias até target_date."""
    cur = conn.execute(
        """
        SELECT weight_kg
        FROM daily_metrics
        WHERE date_ref <= ? AND weight_kg IS NOT NULL
        ORDER BY date_ref DESC
        LIMIT ?;
        """,
        (target_date, days),
    )
    weights = [float(r[0]) for r in cur.fetchall() if r[0] is not None]
    if not weights:
        return None
    return sum(weights) / len(weights)


def evaluate_metric_baseline(
    conn: sqlite3.Connection,
    metric_name: str,
    target_date: str,
    baseline_days: int = 30,
) -> BaselineResult:
    """Avalia o desvio de uma métrica em relação ao baseline pessoal de 30 dias."""
    spec = METRIC_SPECS.get(metric_name)
    if not spec:
        raise ValueError(f"Métrica não suportada pelo motor de baselines: {metric_name}")

    metric_col = metric_name
    observed, history = fetch_metric_history(conn, metric_col, target_date, baseline_days)

    if observed is None:
        return BaselineResult(
            metric=metric_name,
            date_ref=target_date,
            observed_value=0.0,
            baseline_value=0.0,
            mad_value=0.0,
            robust_z_score=0.0,
            delta_absolute=0.0,
            delta_percent=0.0,
            valid_days_count=len(history),
            confidence="insufficient_history",
            significance="normal",
            direction_relevant=False,
            status_message="Dado ausente para esta data.",
        )

    # Para peso, usamos a média móvel de 7 dias como valor observado para evitar ruído hídrico diário
    if metric_name == "weight_kg":
        ma_7 = calculate_moving_average_weight(conn, target_date, 7)
        if ma_7 is not None:
            observed = ma_7

    valid_days = len(history)

    # Menos de 7 dias: Histórico insuficiente
    if valid_days < 7:
        return BaselineResult(
            metric=metric_name,
            date_ref=target_date,
            observed_value=round(observed, 2),
            baseline_value=round(calculate_median(history), 2) if history else 0.0,
            mad_value=0.0,
            robust_z_score=0.0,
            delta_absolute=0.0,
            delta_percent=0.0,
            valid_days_count=valid_days,
            confidence="insufficient_history",
            significance="normal",
            direction_relevant=False,
            status_message=f"Histórico insuficiente ({valid_days}/30 dias). São necessários pelo menos 7 dias para avaliar baseline.",
        )

    baseline_median = calculate_median(history)
    mad = calculate_mad(history, baseline_median)
    robust_z = calculate_robust_z_score(observed, baseline_median, mad)

    delta_abs = observed - baseline_median
    delta_pct = (delta_abs / baseline_median * 100.0) if baseline_median != 0 else 0.0

    # Determina se a alteração está na direção fisiológica relevante
    direction_relevant = False
    if spec["direction"] == "down":
        direction_relevant = (delta_abs < 0)
    elif spec["direction"] == "up":
        direction_relevant = (delta_abs > 0)
    else:  # both
        direction_relevant = (abs(delta_abs) >= spec["min_delta_abs"])

    # Avaliação de significância com piso clínico
    significance = "normal"
    confidence = "high" if valid_days >= 14 else "low"

    if direction_relevant:
        if spec["direction"] == "down":
            is_significant_stat = robust_z <= spec["z_threshold_significant"]
            is_notable_stat = robust_z <= spec["z_threshold_notable"]
            passes_clinical_floor = (abs(delta_abs) >= spec["min_delta_abs"]) and (delta_pct <= spec["min_delta_pct"])

            if is_significant_stat and passes_clinical_floor:
                significance = "significativa"
            elif is_notable_stat or (abs(delta_abs) >= spec["min_delta_abs"]):
                significance = "notável"

        elif spec["direction"] == "up":
            is_significant_stat = robust_z >= spec["z_threshold_significant"]
            is_notable_stat = robust_z >= spec["z_threshold_notable"]
            passes_clinical_floor = (delta_abs >= spec["min_delta_abs"]) and (delta_pct >= spec["min_delta_pct"])

            if is_significant_stat and passes_clinical_floor:
                significance = "significativa"
            elif is_notable_stat or (delta_abs >= spec["min_delta_abs"]):
                significance = "notável"

        else:  # both
            is_significant_stat = abs(robust_z) >= spec["z_threshold_significant"]
            is_notable_stat = abs(robust_z) >= spec["z_threshold_notable"]
            passes_clinical_floor = abs(delta_abs) >= spec["min_delta_abs"]

            if is_significant_stat and passes_clinical_floor:
                significance = "significativa"
            elif is_notable_stat or passes_clinical_floor:
                significance = "notável"

    # Se confiança for baixa (7-13 dias), mantemos a classificação porém sinalizamos
    status_msg = f"{significance.capitalize()} (Z-Score: {robust_z:.2f}, delta: {delta_pct:+.1f}%)"
    if confidence == "low":
        status_msg += " • Atenção: Confiança baixa devido a histórico reduzido (7–13 dias)."

    return BaselineResult(
        metric=metric_name,
        date_ref=target_date,
        observed_value=round(observed, 2),
        baseline_value=round(baseline_median, 2),
        mad_value=round(mad, 2),
        robust_z_score=round(robust_z, 2),
        delta_absolute=round(delta_abs, 2),
        delta_percent=round(delta_pct, 1),
        valid_days_count=valid_days,
        confidence=confidence,
        significance=significance,
        direction_relevant=direction_relevant,
        status_message=status_msg,
    )
