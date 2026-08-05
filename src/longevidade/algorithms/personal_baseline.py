"""
Cálculo de Baseline Pessoal Robusto (Mediana e MAD) de 14 a 28 dias.
Não utiliza zeros ou dados ausentes como medições reais.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


def calculate_personal_baseline(
    values: List[Optional[float]],
    minimum_observations: int = 14,
) -> Dict[str, Any]:
    """Calcula a mediana, MAD e intervalo habitual (p16 - p84) de uma série temporal."""
    valid_values = [float(v) for v in values if v is not None and not math.isnan(float(v))]

    if len(valid_values) < minimum_observations:
        return {
            "status": "insufficient_data",
            "count": len(valid_values),
            "minimum_required": minimum_observations,
            "median": None,
            "mad": None,
            "p16": None,
            "p84": None,
        }

    sorted_vals = sorted(valid_values)
    n = len(sorted_vals)

    def percentile(p: float) -> float:
        idx = p * (n - 1)
        lower = math.floor(idx)
        upper = math.ceil(idx)
        if lower == upper:
            return sorted_vals[int(idx)]
        weight = idx - lower
        return sorted_vals[lower] * (1.0 - weight) + sorted_vals[upper] * weight

    med = percentile(0.50)
    devs = sorted([abs(x - med) for x in valid_values])
    mad_n = len(devs)
    mad_val = devs[mad_n // 2] if mad_n % 2 == 1 else (devs[mad_n // 2 - 1] + devs[mad_n // 2]) / 2.0

    p16 = percentile(0.16)
    p84 = percentile(0.84)

    return {
        "status": "ok",
        "count": len(valid_values),
        "minimum_required": minimum_observations,
        "median": round(med, 2),
        "mad": round(mad_val, 2),
        "p16": round(p16, 2),
        "p84": round(p84, 2),
    }
