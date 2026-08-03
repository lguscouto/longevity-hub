"""
Calculadora de Razões e Índices Cardiovasculares Avançados.
Baseado nas diretrizes de cardiologia de longevidade (Dr. Peter Attia & Protocolo Blueprint).
"""

from __future__ import annotations
from typing import Dict, Any, Optional

from longevidade.ingestion.lab_normalization import normalize_lab_map


def calculate_cardiovascular_ratios(labs_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcula ApoB/ApoA1, Triglicerídeos/HDL e Colesterol Remanescente usando
    chaves canônicas. Aliases legados como `hdl` e `ldl` são normalizados antes
    do cálculo para evitar indicadores vazios com dados disponíveis.
    """
    canonical_labs = normalize_lab_map(labs_map)

    def get_val(key: str) -> Optional[float]:
        item = canonical_labs.get(key)
        if item and item.get("value") is not None:
            try:
                return float(item["value"])
            except Exception:
                return None
        return None

    apob = get_val("apob")
    apoa1 = get_val("apoa1")
    tg = get_val("triglycerides")
    hdl = get_val("hdl_cholesterol")
    total_chol = get_val("total_cholesterol")
    ldl = get_val("ldl_cholesterol")

    # 1. Razão ApoB / ApoA1
    apob_apoa1 = None
    apob_apoa1_status = "N/A"
    if apob is not None and apoa1 is not None and apoa1 > 0:
        apob_apoa1 = round(apob / apoa1, 2)
        if apob_apoa1 < 0.60:
            apob_apoa1_status = "Excelente (Protegido)"
        elif apob_apoa1 <= 0.80:
            apob_apoa1_status = "Moderado"
        else:
            apob_apoa1_status = "Elevado Risco"

    # 2. Razão Triglicerídeos / HDL
    tg_hdl = None
    tg_hdl_status = "N/A"
    if tg is not None and hdl is not None and hdl > 0:
        tg_hdl = round(tg / hdl, 2)
        if tg_hdl < 1.5:
            tg_hdl_status = "Ótimo (Sensibilidade à Insulina Alta)"
        elif tg_hdl <= 3.0:
            tg_hdl_status = "Aceitável"
        else:
            tg_hdl_status = "Resistência à Insulina Provável"

    # 3. Colesterol Remanescente (Total - HDL - LDL)
    remnant_chol = None
    remnant_status = "N/A"
    if total_chol is not None and hdl is not None and ldl is not None:
        remnant_chol = round(total_chol - hdl - ldl, 1)
        if remnant_chol < 15.0:
            remnant_status = "Excelente (< 15 mg/dL)"
        elif remnant_chol <= 25.0:
            remnant_status = "Fronteiriço"
        else:
            remnant_status = "Elevado Aterogênico"

    return {
        "apob_apoa1_ratio": apob_apoa1,
        "apob_apoa1_status": apob_apoa1_status,
        "tg_hdl_ratio": tg_hdl,
        "tg_hdl_status": tg_hdl_status,
        "remnant_cholesterol": remnant_chol,
        "remnant_status": remnant_status,
    }
