"""
Cálculo de métricas de variabilidade glicêmica para CGM (Continuous Glucose Monitor).
Faixas padrão Longevidade:
- Alvo Normal (TIR): 70 - 140 mg/dL
- Acima do Alvo (TAR): > 140 mg/dL
- Hipoglicemia (TBR): < 70 mg/dL
"""

from __future__ import annotations

import math
from typing import Sequence
import numpy as np


def calculate_cgm_summary(readings_mgdl: Sequence[float]) -> dict[str, float | int]:
    """Calcula estatísticas de glicemia contínua a partir de leituras em mg/dL.

    Retorna:
    - mean_glucose: Glicemia Média (mg/dL)
    - glucose_sd: Desvio Padrão da Glicemia
    - cv_pct: Coeficiente de Variação (%) = (SD / Média) * 100
    - time_in_range_pct: % de tempo entre 70 e 140 mg/dL (Alvo Longevidade)
    - time_above_range_pct: % de tempo > 140 mg/dL
    - time_below_range_pct: % de tempo < 70 mg/dL
    - total_readings: Número total de leituras processadas
    """
    valid = np.array([x for x in readings_mgdl if x is not None and not math.isnan(x) and x > 0], dtype=float)

    if len(valid) == 0:
        return {
            "mean_glucose": 0.0,
            "glucose_sd": 0.0,
            "cv_pct": 0.0,
            "time_in_range_pct": 0.0,
            "time_above_range_pct": 0.0,
            "time_below_range_pct": 0.0,
            "total_readings": 0,
        }

    mean_g = float(np.mean(valid))
    sd_g = float(np.std(valid, ddof=1)) if len(valid) > 1 else 0.0
    cv_pct = (sd_g / mean_g * 100.0) if mean_g > 0 else 0.0

    tir_count = np.sum((valid >= 70) & (valid <= 140))
    tar_count = np.sum(valid > 140)
    tbr_count = np.sum(valid < 70)

    total = len(valid)

    return {
        "mean_glucose": round(mean_g, 1),
        "glucose_sd": round(sd_g, 1),
        "cv_pct": round(cv_pct, 1),
        "time_in_range_pct": round(float(tir_count / total * 100.0), 1),
        "time_above_range_pct": round(float(tar_count / total * 100.0), 1),
        "time_below_range_pct": round(float(tbr_count / total * 100.0), 1),
        "total_readings": total,
    }
