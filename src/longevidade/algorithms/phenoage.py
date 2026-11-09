"""
Algoritmo de Morgan Levine (PhenoAge) para estimativa de idade biológica
baseado em 9 marcadores de exames de sangue.

Referência: Levine, M. E., et al. (2018). An epigenetic biomarker of aging for
lifespan and healthspan. Aging (Albany NY), 10(4), 573–591. DOI: 10.18632/aging.101414.
"""

from __future__ import annotations

import math
from typing import Any, TypedDict

from longevidade.ingestion.lab_normalization import (
    PHENOAGE_REQUIRED_MARKERS,
    validate_phenoage_inputs,
)


class PhenoAgeInput(TypedDict, total=False):
    chronological_age: float
    glucose_mgdl: float      # Glicose em mg/dL (convertido p/ mmol/L)
    creatinine_mgdl: float   # Creatinina em mg/dL (convertido p/ umol/L)
    albumin_gdl: float       # Albumina em g/dL (convertido p/ g/L)
    hscrp_mgl: float         # Proteína C-Reativa ultrassensível em mg/L (convertido p/ mg/dL)
    lymphocyte_pct: float    # Linfócitos %
    mcv_fl: float            # MCV em fL
    rdw_pct: float           # RDW %
    alk_phos_ul: float       # Fosfatase Alcalina em U/L
    wbc_1000ul: float        # Glóbulos brancos em 10^3/uL


# Médias populacionais de referência (NHANES / Levine 2018)
_REF_GLUCOSE_MMOL = 5.3       # ~95 mg/dL
_REF_CREATININE_UMOL = 84.0   # ~0.95 mg/dL
_REF_ALBUMIN_GL = 45.0        # 4.5 g/dL
_REF_CRP_MGDL = 0.05          # 0.5 mg/L
_REF_LYMPH_PCT = 30.0
_REF_MCV_FL = 89.0
_REF_RDW_PCT = 12.5
_REF_ALP_UL = 65.0
_REF_WBC_1000UL = 6.0


def _incomplete_phenoage(data: PhenoAgeInput, missing: list[str], used: list[str]) -> dict[str, Any]:
    chrono_val = data.get("chronological_age")
    chrono_age = float(chrono_val) if chrono_val is not None else None
    return {
        "status": "incomplete",
        "reason": "missing_required_biomarkers",
        "pheno_age": None,
        "chronological_age": round(chrono_age, 2) if chrono_age is not None else None,
        "age_delta": None,
        "mortality_risk_10yr_pct": None,
        "missing_biomarkers": missing,
        "missing": missing,
        "biomarkers_used": used,
        "required_biomarkers": list(PHENOAGE_REQUIRED_MARKERS),
    }


def calculate_phenoage(data: PhenoAgeInput) -> dict[str, Any]:
    """Calcula a PhenoAge ou retorna estado incompleto explícito.

    Aplica a equação clínica Gompertz oficial de Levine et al. (2018) / BioAge.
    Rejeita valores não positivos (<= 0) sem truncamento silencioso.
    """
    validation = validate_phenoage_inputs(data)
    chrono_val = data.get("chronological_age")
    if chrono_val is None:
        missing = ["chronological_age"]
        for m in validation.get("missing", []):
            if m not in missing:
                missing.append(m)
        return _incomplete_phenoage(data, missing, validation.get("biomarkers_used", []))

    if validation["status"] != "complete":
        return _incomplete_phenoage(data, validation["missing"], validation["biomarkers_used"])

    values = validation["values"]
    chrono_age = float(chrono_val)

    # Validação estrita de domínio: nenhum biomarcador nem idade pode ser <= 0
    raw_vals = [
        chrono_age,
        values.get("glucose_mgdl"),
        values.get("creatinine_mgdl"),
        values.get("albumin_gdl"),
        values.get("hscrp_mgl"),
        values.get("lymphocyte_pct"),
        values.get("mcv_fl"),
        values.get("rdw_pct"),
        values.get("alk_phos_ul"),
        values.get("wbc_1000ul"),
    ]
    if any(v is None or float(v) <= 0 for v in raw_vals):
        return {
            "status": "incomplete",
            "reason": "invalid_biomarker_domain",
            "pheno_age": None,
            "chronological_age": round(chrono_age, 2),
            "age_delta": None,
            "mortality_risk_10yr_pct": None,
            "missing_biomarkers": [],
            "missing": [],
            "biomarkers_used": list(PHENOAGE_REQUIRED_MARKERS),
            "required_biomarkers": list(PHENOAGE_REQUIRED_MARKERS),
            "algorithm_version": "levine-2018-gompertz-v1",
        }

    # Conversão de unidades padrão da literatura oficial (Levine 2018)
    glucose = float(values["glucose_mgdl"]) * 0.0555       # mmol/L
    creatinine = float(values["creatinine_mgdl"]) * 88.4   # µmol/L
    albumin = float(values["albumin_gdl"]) * 10.0          # g/L
    hscrp_mgdl = float(values["hscrp_mgl"]) / 10.0         # mg/dL (para ln(CRP))
    lymph = float(values["lymphocyte_pct"])
    mcv = float(values["mcv_fl"])
    rdw = float(values["rdw_pct"])
    alk_phos = float(values["alk_phos_ul"])
    wbc = float(values["wbc_1000ul"])

    # Equação clínica Gompertz oficial de Morgan Levine (Levine et al., 2018 / BioAge)
    xb = (
        -19.90667
        - 0.03359355 * albumin
        + 0.009506491 * creatinine
        + 0.1953192 * glucose
        + 0.09536762 * math.log(hscrp_mgdl)
        - 0.01199984 * lymph
        + 0.02676401 * mcv
        + 0.3306156 * rdw
        + 0.001868778 * alk_phos
        + 0.05542406 * wbc
        + 0.08035356 * chrono_age
    )

    # Risco de mortalidade em 10 anos sob distribuição Gompertz (gamma = 0.007692696)
    gamma = 0.007692696
    exp_term = (-1.51714 * math.exp(xb)) / gamma
    clamped_exp_term = max(-100.0, min(100.0, exp_term))
    m = 1.0 - math.exp(clamped_exp_term)

    # Inversão para PhenoAge:
    # pheno_age = 141.50225 + ln(-0.0055305 * ln(1 - m)) / 0.090165
    # Como -0.0055305 * (-1.51714 * exp(xb) / gamma) = 1.0907155007815204 * exp(xb):
    # ln(1.0907155007815204 * exp(xb)) = math.log(1.0907155007815204) + xb
    pheno_age = 141.50225 + (math.log(1.0907155007815204) + xb) / 0.090165
    age_delta = pheno_age - chrono_age

    mortality_risk_pct = max(0.01, min(99.99, m * 100.0))

    return {
        "status": "complete",
        "reason": None,
        "pheno_age": round(pheno_age, 2),
        "chronological_age": round(chrono_age, 2),
        "age_delta": round(age_delta, 2),
        "mortality_risk_10yr_pct": round(mortality_risk_pct, 2),
        "missing_biomarkers": [],
        "missing": [],
        "biomarkers_used": list(PHENOAGE_REQUIRED_MARKERS),
        "required_biomarkers": list(PHENOAGE_REQUIRED_MARKERS),
        "algorithm_version": "levine-2018-gompertz-v1",
    }
