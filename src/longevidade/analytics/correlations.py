"""
Motor de Correlações Locais com Análise de Defasagem (Lag Analysis 0 a 3 dias).
Calcula o coeficiente de correlação de Spearman para evitar suposições paramétricas.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple


def _rank(vector: List[float]) -> List[float]:
    """Calcula os postos (ranks) com média para empates."""
    indexed = sorted(enumerate(vector), key=lambda x: x[1])
    ranks = [0.0] * len(vector)
    i = 0
    while i < len(vector):
        j = i
        while j < len(vector) - 1 and indexed[j + 1][1] == indexed[i][1]:
            j += 1
        avg_rank = (i + j + 2) / 2.0
        for k in range(i, j + 1):
            ranks[indexed[k][0]] = avg_rank
        i = j + 1
    return ranks


def calculate_spearman_correlation(
    series_x: List[float],
    series_y: List[float],
) -> Tuple[float, float]:
    """Retorna (rho, p_value_approx)."""
    n = len(series_x)
    if n < 5:
        return 0.0, 1.0

    rx = _rank(series_x)
    ry = _rank(series_y)

    mean_rx = sum(rx) / n
    mean_ry = sum(ry) / n

    num = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
    den_x = math.sqrt(sum((rx[i] - mean_rx) ** 2 for i in range(n)))
    den_y = math.sqrt(sum((ry[i] - mean_ry) ** 2 for i in range(n)))

    if den_x == 0 or den_y == 0:
        return 0.0, 1.0

    rho = num / (den_x * den_y)
    
    # Aproximação de t-Student para p-value
    if abs(rho) >= 1.0:
        p_val = 0.0
    else:
        t_stat = rho * math.sqrt((n - 2) / (1.0 - rho ** 2))
        p_val = 2.0 * (1.0 - 0.5 * (1.0 + math.erf(abs(t_stat) / math.sqrt(2.0))))

    return round(rho, 3), round(p_val, 4)


def analyze_metric_correlations(
    records: List[Dict[str, Any]],
    target_metric: str = "hrv_ms",
    max_lag_days: int = 2,
) -> List[Dict[str, Any]]:
    """Calcula correlações com defasagem entre hábitos/check-ins e métricas de longevidade."""
    sorted_recs = sorted(records, key=lambda r: r.get("date_ref") or "")
    n = len(sorted_recs)

    potential_causes = ["steps", "sleep_minutes", "energy_score", "perceived_stress", "alcohol_units", "training_load_daily"]

    results = []

    for cause_key in potential_causes:
        for lag in range(max_lag_days + 1):
            pair_x = []
            pair_y = []
            for i in range(lag, n):
                cause_val = sorted_recs[i - lag].get(cause_key)
                outcome_val = sorted_recs[i].get(target_metric)
                if cause_val is not None and outcome_val is not None:
                    pair_x.append(float(cause_val))
                    pair_y.append(float(outcome_val))

            if len(pair_x) >= 7:
                rho, p_val = calculate_spearman_correlation(pair_x, pair_y)
                if abs(rho) >= 0.20:
                    results.append({
                        "cause_metric": cause_key,
                        "outcome_metric": target_metric,
                        "lag_days": lag,
                        "spearman_rho": rho,
                        "p_value": p_val,
                        "sample_count": len(pair_x),
                        "direction": "positive" if rho > 0 else "negative",
                        "is_significant": p_val <= 0.05,
                    })

    results.sort(key=lambda item: abs(item["spearman_rho"]), reverse=True)
    return results
