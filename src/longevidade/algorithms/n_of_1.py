"""
Motor de Estatística para Experimentos N-of-1 (A/B Testing em Saúde).
Compara métricas entre período de controle (14 dias) e tratamento (14 dias).
Calcula d de Cohen (tamanho de efeito) e p-value (teste t).
"""

from __future__ import annotations

import math
from typing import Sequence
import numpy as np
from scipy import stats


def analyze_n_of_1(
    control_values: Sequence[float],
    treatment_values: Sequence[float]
) -> dict[str, float | bool | str]:
    """Compara estatisticamente dois períodos de observação N-of-1.

    Retorna:
    - control_mean: Média da métrica no período de controle
    - treatment_mean: Média no período de intervenção
    - diff_mean: Diferença absoluta (tratamento - controle)
    - diff_pct: Variabilidade percentual (%)
    - cohens_d: Tamanho do efeito (Cohen's d)
    - p_value: Valor p do teste t bicaudal
    - statistically_significant: True se p < 0.05
    - effect_interpretation: 'Desprezível', 'Pequeno', 'Médio', 'Grande'
    """
    c = np.array([x for x in control_values if x is not None and not math.isnan(x)], dtype=float)
    t = np.array([x for x in treatment_values if x is not None and not math.isnan(x)], dtype=float)

    if len(c) < 3 or len(t) < 3:
        return {
            "control_mean": round(float(np.mean(c)), 2) if len(c) > 0 else 0.0,
            "treatment_mean": round(float(np.mean(t)), 2) if len(t) > 0 else 0.0,
            "diff_mean": 0.0,
            "diff_pct": 0.0,
            "cohens_d": 0.0,
            "p_value": 1.0,
            "statistically_significant": False,
            "effect_interpretation": "Amostras insuficientes (< 3 observações)",
        }

    c_mean = float(np.mean(c))
    t_mean = float(np.mean(t))
    c_std = float(np.std(c, ddof=1))
    t_std = float(np.std(t, ddof=1))

    diff_mean = t_mean - c_mean
    diff_pct = (diff_mean / c_mean * 100.0) if c_mean != 0 else 0.0

    # Desvio padrão pooled
    n_c, n_t = len(c), len(t)
    s_pooled = math.sqrt(((n_c - 1) * c_std**2 + (n_t - 1) * t_std**2) / (n_c + n_t - 2)) if (n_c + n_t - 2) > 0 else 1.0
    cohens_d = (diff_mean / s_pooled) if s_pooled > 0 else 0.0

    # Teste t independente (Welch's t-test)
    t_stat, p_val = stats.ttest_ind(t, c, equal_var=False)

    abs_d = abs(cohens_d)
    if abs_d < 0.2:
        interp = "Desprezível"
    elif abs_d < 0.5:
        interp = "Pequeno"
    elif abs_d < 0.8:
        interp = "Médio"
    else:
        interp = "Grande"

    return {
        "control_mean": round(c_mean, 2),
        "treatment_mean": round(t_mean, 2),
        "diff_mean": round(diff_mean, 2),
        "diff_pct": round(diff_pct, 2),
        "cohens_d": round(cohens_d, 2),
        "p_value": round(float(p_val), 4),
        "statistically_significant": bool(p_val < 0.05),
        "effect_interpretation": interp,
    }
