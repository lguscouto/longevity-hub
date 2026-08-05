"""
Motor de Correlações Locais com Análise de Defasagem Cronológica (Lag Analysis 0 a 3 dias).
Calcula o coeficiente de correlação de Spearman utilizando diferenças reais de datas de calendário.
"""

from __future__ import annotations

from datetime import date, datetime
import math
from typing import Any, Dict, List, Tuple

try:
    from scipy.stats import spearmanr
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


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
    """Retorna (rho, p_value) exato via scipy ou por aproximação."""
    n = len(series_x)
    if n < 5:
        return 0.0, 1.0

    if HAS_SCIPY:
        res = spearmanr(series_x, series_y)
        rho_val = float(res.statistic if hasattr(res, 'statistic') else res[0])
        p_val = float(res.pvalue if hasattr(res, 'pvalue') else res[1])
        return round(rho_val, 3), round(p_val, 4)

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
    min_sample_count: int = 15,
) -> List[Dict[str, Any]]:
    """Calcula correlações cronológicas entre causas e desfechos usando diferença de datas."""
    rec_by_date: Dict[date, Dict[str, Any]] = {}
    for r in records:
        d_str = r.get("date_ref")
        if d_str:
            try:
                d_obj = date.fromisoformat(d_str[:10])
                rec_by_date[d_obj] = r
            except ValueError:
                continue

    sorted_dates = sorted(rec_by_date.keys())
    potential_causes = ["steps", "sleep_minutes", "energy_score", "perceived_stress", "alcohol_units", "training_load_daily"]

    total_hypotheses = len(potential_causes) * (max_lag_days + 1)
    alpha_adj = 0.05 / max(1, total_hypotheses)  # Correção de Bonferroni

    results = []

    for cause_key in potential_causes:
        for lag in range(max_lag_days + 1):
            pair_x = []
            pair_y = []
            for d in sorted_dates:
                cause_date = d
                outcome_date = date.fromordinal(d.toordinal() + lag)
                if cause_date in rec_by_date and outcome_date in rec_by_date:
                    cause_val = rec_by_date[cause_date].get(cause_key)
                    outcome_val = rec_by_date[outcome_date].get(target_metric)
                    if cause_val is not None and outcome_val is not None:
                        pair_x.append(float(cause_val))
                        pair_y.append(float(outcome_val))

            if len(pair_x) >= min_sample_count:
                rho, p_val = calculate_spearman_correlation(pair_x, pair_y)
                if abs(rho) >= 0.25:
                    results.append({
                        "cause_metric": cause_key,
                        "outcome_metric": target_metric,
                        "lag_days": lag,
                        "spearman_rho": rho,
                        "p_value": p_val,
                        "sample_count": len(pair_x),
                        "direction": "positive" if rho > 0 else "negative",
                        "is_significant": p_val <= alpha_adj,
                    })

    results.sort(key=lambda item: abs(item["spearman_rho"]), reverse=True)
    return results
