"""
Calculadora de Idade Biológica pelo Método Klemera-Doubal (KDM Biological Age).
Algoritmo consagrado em medicina da longevidade para estimar o ritmo de envelhecimento fisiológico.
"""

from __future__ import annotations
from typing import Dict, Any

# Biomarcadores de referência do modelo KDM com parâmetros de regressão linear (inclinação k, intercepto q, variância s2)
KDM_BIOMARKER_PARAMS = {
    "systolic_bp": {"k": 0.35, "q": 105.0, "s2": 150.0},
    "glucose_mgdl": {"k": 0.45, "q": 72.0, "s2": 120.0},
    "creatinine_mgdl": {"k": 0.005, "q": 0.70, "s2": 0.05},
    "albumin_gdl": {"k": -0.015, "q": 5.1, "s2": 0.08},
    "hscrp_mgl": {"k": 0.03, "q": 0.2, "s2": 1.2},
    "rdw_pct": {"k": 0.04, "q": 11.2, "s2": 0.8},
    "alk_phos_ul": {"k": 0.4, "q": 48.0, "s2": 180.0},
    "wbc_1000ul": {"k": 0.02, "q": 5.0, "s2": 1.5},
    "rhr_bpm": {"k": 0.15, "q": 58.0, "s2": 64.0}
}

def calculate_kdm_biological_age(chronological_age: float, lab_and_metric_data: Dict[str, float]) -> Dict[str, Any]:
    """
    Calcula a Idade Biológica KDM baseada nos biomarcadores fornecidos.
    Fórmula KDM: BA_kdm = [ sum( (x_i - q_i)/k_i * (k_i^2 / s_i^2) ) + CA/s_CA^2 ] / [ sum( k_i^2 / s_i^2 ) + 1/s_CA^2 ]
    """
    s2_chrono = 144.0  # Variância cronológica padrão (12 anos^2)
    
    num_sum = 0.0
    den_sum = 0.0
    biomarkers_used = []

    for key, val in lab_and_metric_data.items():
        if key in KDM_BIOMARKER_PARAMS and val is not None:
            p = KDM_BIOMARKER_PARAMS[key]
            k = p["k"]
            q = p["q"]
            s2 = p["s2"]
            
            if k != 0 and s2 > 0:
                weight = (k * k) / s2
                x_age_est = (val - q) / k
                num_sum += x_age_est * weight
                den_sum += weight
                biomarkers_used.append(key)

    # Se nenhum biomarcador for válido, retorna a própria idade cronológica
    if den_sum == 0.0:
        return {
            "kdm_age": round(chronological_age, 1),
            "chronological_age": round(chronological_age, 1),
            "kdm_delta": 0.0,
            "biomarkers_count": 0,
            "biomarkers_used": []
        }

    # Adiciona o termo cronológico de ancoragem
    num_sum += chronological_age / s2_chrono
    den_sum += 1.0 / s2_chrono

    kdm_age = round(num_sum / den_sum, 1)
    kdm_delta = round(kdm_age - chronological_age, 1)

    return {
        "kdm_age": kdm_age,
        "chronological_age": round(chronological_age, 1),
        "kdm_delta": kdm_delta,
        "biomarkers_count": len(biomarkers_used),
        "biomarkers_used": biomarkers_used
    }
