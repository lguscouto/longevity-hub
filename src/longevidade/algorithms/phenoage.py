"""
Algoritmo de Morgan Levine (PhenoAge) para estimativa de idade biológica
baseado em 9 marcadores de exames de sangue.

Referência: Levine, M. E., et al. (2018). An epigenetic biomarker of aging for
lifespan and healthspan. Aging Cell, 17(4), e12784.
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
    chrono_age = float(data.get("chronological_age", 40.0))
    return {
        "status": "incomplete",
        "reason": "missing_required_biomarkers",
        "pheno_age": None,
        "chronological_age": round(chrono_age, 2),
        "age_delta": None,
        "mortality_risk_10yr_pct": None,
        "missing_biomarkers": missing,
        "missing": missing,
        "biomarkers_used": used,
        "required_biomarkers": list(PHENOAGE_REQUIRED_MARKERS),
    }


def calculate_phenoage(data: PhenoAgeInput) -> dict[str, Any]:
    """Calcula a PhenoAge ou retorna estado incompleto explícito.

    A função não preenche biomarcadores laboratoriais ausentes com defaults. Isso
    evita gerar uma idade biológica enganosa a partir de painel parcial.
    """
    validation = validate_phenoage_inputs(data)
    if validation["status"] != "complete":
        return _incomplete_phenoage(data, validation["missing"], validation["biomarkers_used"])

    values = validation["values"]
    chrono_age = float(data.get("chronological_age", 40.0))

    # Conversão de unidades padrão da literatura
    glucose = float(values["glucose_mgdl"]) * 0.0555
    creatinine = float(values["creatinine_mgdl"]) * 88.4
    albumin = float(values["albumin_gdl"]) * 10.0
    hscrp_mgdl = max(0.001, float(values["hscrp_mgl"]) / 10.0)
    lymph = float(values["lymphocyte_pct"])
    mcv = float(values["mcv_fl"])
    rdw = float(values["rdw_pct"])
    alk_phos = float(values["alk_phos_ul"])
    wbc = float(values["wbc_1000ul"])

    ln_crp = math.log(hscrp_mgdl)
    ref_ln_crp = math.log(_REF_CRP_MGDL)

    # Desvio relativo de risco (delta_xb) em relação ao baseline de referência.
    delta_xb = (
        + 0.02688 * (mcv - _REF_MCV_FL)
        + 0.3306 * (rdw - _REF_RDW_PCT)
        + 0.00188 * (alk_phos - _REF_ALP_UL)
        + 0.0554 * (wbc - _REF_WBC_1000UL)
        - 0.0120 * (lymph - _REF_LYMPH_PCT)
        + 0.1953 * (glucose - _REF_GLUCOSE_MMOL)
        - 0.0336 * (albumin - _REF_ALBUMIN_GL)
        + 0.0095 * (creatinine - _REF_CREATININE_UMOL)
        + 0.0954 * (ln_crp - ref_ln_crp)
    )

    # Coeficiente de avanço biológico por unidade de desvio de risco.
    pheno_age = chrono_age + (delta_xb / 0.09165)
    age_delta = pheno_age - chrono_age

    # Risco de mortalidade estimado proporcional.
    mortality_risk_pct = max(0.1, min(99.0, 5.0 * math.exp(delta_xb)))

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
    }
