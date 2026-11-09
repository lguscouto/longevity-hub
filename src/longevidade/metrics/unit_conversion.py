"""Módulo de normalização determinística de unidades e rastreabilidade de entradas.

Converte biomarcadores laboratoriais, medições antropométricas e sinais vitais
para as unidades canônicas requeridas pelos algoritmos clínicos, mantendo histórico
e rastreabilidade completa (valor bruto, unidade bruta, conversão aplicada e derivações).
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
import re
from typing import Any, Mapping

from longevidade.ingestion.lab_normalization import (
    normalize_lab_key,
    parse_numeric_or_censored,
)


@dataclass
class NormalizedInput:
    canonical_key: str
    value: float
    canonical_unit: str
    raw_value: Any = None
    raw_unit: str | None = None
    conversion_applied: str | None = None
    derived_from: list[str] | None = None
    measured_at: str | None = None
    censored: bool = False
    censored_op: str | None = None


# Mapeamento de chaves canônicas para sua unidade padrão
CANONICAL_UNITS: dict[str, str] = {
    "age_years": "years",
    "sex": "category",
    "weight_kg": "kg",
    "height_cm": "cm",
    "waist_cm": "cm",
    "hip_cm": "cm",
    "sbp_mmhg": "mmHg",
    "dbp_mmhg": "mmHg",
    "resting_hr_bpm": "bpm",
    "total_chol_mg_dl": "mg/dL",
    "hdl_mg_dl": "mg/dL",
    "ldl_mg_dl": "mg/dL",
    "triglycerides_mg_dl": "mg/dL",
    "fasting_glucose_mg_dl": "mg/dL",
    "fasting_insulin_uIU_ml": "µIU/mL",
    "hba1c_pct": "%",
    "creatinine_mg_dl": "mg/dL",
    "urea_mg_dl": "mg/dL",
    "bun_mg_dl": "mg/dL",
    "uric_acid_mg_dl": "mg/dL",
    "albumin_g_dl": "g/dL",
    "alp_u_l": "U/L",
    "alt_u_l": "U/L",
    "ast_u_l": "U/L",
    "ggt_u_l": "U/L",
    "hs_crp_mg_l": "mg/L",
    "hemoglobin_g_dl": "g/dL",
    "hematocrit_pct": "%",
    "wbc_k_ul": "10³/µL",
    "neutrophils_k_ul": "10³/µL",
    "lymphocytes_k_ul": "10³/µL",
    "monocytes_k_ul": "10³/µL",
    "platelets_k_ul": "10³/µL",
    "lymphocytes_pct": "%",
    "mcv_fl": "fL",
    "rdw_pct": "%",
    "total_testosterone_ng_dl": "ng/dL",
    "ast_uln_u_l": "U/L",
    "uacr_mg_g": "mg/g",
    "fev1_l": "L",
    "cmv_optical_density": "dimensionless",
    "diabetes": "boolean",
    "hypertension": "boolean",
    "current_smoker": "boolean",
    "antihypertensive_treatment": "boolean",
    "lipid_lowering_treatment": "boolean",
    "prior_cvd": "boolean",
}

# Aliases de mapeamento para as chaves canônicas do motor de métricas
INPUT_KEY_TO_CANONICAL: dict[str, str] = {
    # Demografia & Antropometria
    "age": "age_years",
    "age_years": "age_years",
    "chronological_age": "age_years",
    "sex": "sex",
    "gender": "sex",
    "biological_sex": "sex",
    "weight": "weight_kg",
    "weight_kg": "weight_kg",
    "current_weight_kg": "weight_kg",
    "height": "height_cm",
    "height_cm": "height_cm",
    "waist": "waist_cm",
    "waist_cm": "waist_cm",
    "waist_circumference": "waist_cm",
    "waist_circumference_cm": "waist_cm",
    "hip": "hip_cm",
    "hip_cm": "hip_cm",
    "hip_circumference": "hip_cm",
    "hip_circumference_cm": "hip_cm",
    # Sinais vitais
    "sbp": "sbp_mmhg",
    "sbp_mmhg": "sbp_mmhg",
    "systolic_bp": "sbp_mmhg",
    "dbp": "dbp_mmhg",
    "dbp_mmhg": "dbp_mmhg",
    "diastolic_bp": "dbp_mmhg",
    "resting_hr": "resting_hr_bpm",
    "resting_hr_bpm": "resting_hr_bpm",
    "rhr": "resting_hr_bpm",
    "rhr_bpm": "resting_hr_bpm",
    # Glicose & Metabolismo
    "glucose": "fasting_glucose_mg_dl",
    "fasting_glucose": "fasting_glucose_mg_dl",
    "glucose_mgdl": "fasting_glucose_mg_dl",
    "fasting_glucose_mg_dl": "fasting_glucose_mg_dl",
    "fasting_insulin": "fasting_insulin_uIU_ml",
    "fasting_insulin_uiu_ml": "fasting_insulin_uIU_ml",
    "insulin": "fasting_insulin_uIU_ml",
    "hba1c": "hba1c_pct",
    "hba1c_pct": "hba1c_pct",
    "uric_acid": "uric_acid_mg_dl",
    "uric_acid_mg_dl": "uric_acid_mg_dl",
    # Rim
    "creatinine": "creatinine_mg_dl",
    "creatinine_mgdl": "creatinine_mg_dl",
    "creatinine_mg_dl": "creatinine_mg_dl",
    "urea": "urea_mg_dl",
    "urea_mg_dl": "urea_mg_dl",
    "bun": "bun_mg_dl",
    "bun_mg_dl": "bun_mg_dl",
    # Fígado
    "albumin": "albumin_g_dl",
    "albumin_gdl": "albumin_g_dl",
    "albumin_g_dl": "albumin_g_dl",
    "alp": "alp_u_l",
    "alk_phos": "alp_u_l",
    "alk_phos_ul": "alp_u_l",
    "alp_u_l": "alp_u_l",
    "alt": "alt_u_l",
    "alt_u_l": "alt_u_l",
    "ast": "ast_u_l",
    "ast_u_l": "ast_u_l",
    "ggt": "ggt_u_l",
    "ggt_u_l": "ggt_u_l",
    "ast_uln": "ast_uln_u_l",
    "ast_uln_u_l": "ast_uln_u_l",
    # Inflamação
    "hscrp": "hs_crp_mg_l",
    "hscrp_mgl": "hs_crp_mg_l",
    "hs_crp": "hs_crp_mg_l",
    "hs_crp_mg_l": "hs_crp_mg_l",
    "crp": "hs_crp_mg_l",
    # Lipídios
    "total_chol": "total_chol_mg_dl",
    "total_cholesterol": "total_chol_mg_dl",
    "total_chol_mg_dl": "total_chol_mg_dl",
    "hdl": "hdl_mg_dl",
    "hdl_c": "hdl_mg_dl",
    "hdl_cholesterol": "hdl_mg_dl",
    "hdl_mg_dl": "hdl_mg_dl",
    "ldl": "ldl_mg_dl",
    "ldl_c": "ldl_mg_dl",
    "ldl_cholesterol": "ldl_mg_dl",
    "ldl_mg_dl": "ldl_mg_dl",
    "triglycerides": "triglycerides_mg_dl",
    "triglycerides_mg_dl": "triglycerides_mg_dl",
    "tg": "triglycerides_mg_dl",
    "apob": "apob_mg_dl",
    "apoa1": "apoa1_mg_dl",
    # Hemograma
    "hemoglobin": "hemoglobin_g_dl",
    "hemoglobin_g_dl": "hemoglobin_g_dl",
    "hb": "hemoglobin_g_dl",
    "hematocrit": "hematocrit_pct",
    "hematocrit_pct": "hematocrit_pct",
    "ht": "hematocrit_pct",
    "wbc": "wbc_k_ul",
    "wbc_1000ul": "wbc_k_ul",
    "wbc_k_ul": "wbc_k_ul",
    "neutrophils": "neutrophils_k_ul",
    "neutrophils_abs": "neutrophils_k_ul",
    "neutrophils_k_ul": "neutrophils_k_ul",
    "lymphocytes": "lymphocytes_k_ul",
    "lymphocytes_abs": "lymphocytes_k_ul",
    "lymphocytes_k_ul": "lymphocytes_k_ul",
    "monocytes": "monocytes_k_ul",
    "monocytes_abs": "monocytes_k_ul",
    "monocytes_k_ul": "monocytes_k_ul",
    "platelets": "platelets_k_ul",
    "platelets_k_ul": "platelets_k_ul",
    "lymphocyte_pct": "lymphocytes_pct",
    "lymphocytes_pct": "lymphocytes_pct",
    "neutrophils_pct": "neutrophils_pct",
    "neutrophil_pct": "neutrophils_pct",
    "monocytes_pct": "monocytes_pct",
    "monocyte_pct": "monocytes_pct",
    "mcv": "mcv_fl",
    "mcv_fl": "mcv_fl",
    "rdw": "rdw_pct",
    "rdw_pct": "rdw_pct",
    # Hormônios & outros
    "total_testosterone": "total_testosterone_ng_dl",
    "total_testosterone_ng_dl": "total_testosterone_ng_dl",
    "testosterone_total": "total_testosterone_ng_dl",
    "uacr": "uacr_mg_g",
    "uacr_mg_g": "uacr_mg_g",
    "fev1": "fev1_l",
    "fev1_l": "fev1_l",
    "cmv_optical_density": "cmv_optical_density",
    # Contexto clínico
    "diabetes": "diabetes",
    "hypertension": "hypertension",
    "current_smoker": "current_smoker",
    "antihypertensive_treatment": "antihypertensive_treatment",
    "lipid_lowering_treatment": "lipid_lowering_treatment",
    "prior_cvd": "prior_cvd",
}


def _clean_unit(unit_str: str | None) -> str:
    if not unit_str:
        return ""
    u = unit_str.strip().lower()
    u = u.replace(" ", "").replace("^", "").replace("³", "3").replace("µ", "u")
    return u


def normalize_observation_inputs(
    raw_inputs: Mapping[str, Any],
    measured_at: str | None = None,
) -> dict[str, NormalizedInput]:
    """Normaliza um conjunto de observações brutas aplicando conversões de unidade e derivações controladas."""
    normalized: dict[str, NormalizedInput] = {}

    for raw_k, raw_item in raw_inputs.items():
        if raw_item is None:
            continue

        raw_unit: str | None = None
        raw_val_any: Any = raw_item
        item_measured_at = measured_at

        if isinstance(raw_item, Mapping):
            raw_val_any = raw_item.get("value")
            raw_unit = raw_item.get("unit") or raw_item.get("raw_unit")
            item_measured_at = raw_item.get("measured_at") or raw_item.get("collected_at") or measured_at

        # Chave canônica intermediária e final
        k_slug = raw_k.strip().lower().replace("-", "_").replace(" ", "_")
        canonical_key = INPUT_KEY_TO_CANONICAL.get(k_slug)
        if not canonical_key:
            # Tenta resolver via normalize_lab_key
            intermediate = normalize_lab_key(raw_k)
            canonical_key = INPUT_KEY_TO_CANONICAL.get(intermediate, intermediate)

        # Contexto clínico booleano ou sexo
        if canonical_key in {
            "diabetes", "hypertension", "current_smoker",
            "antihypertensive_treatment", "lipid_lowering_treatment", "prior_cvd"
        }:
            if raw_val_any is not None and raw_val_any != "":
                bool_val = bool(raw_val_any) if not isinstance(raw_val_any, str) else raw_val_any.lower() in {"true", "1", "t", "sim", "yes"}
                normalized[canonical_key] = NormalizedInput(
                    canonical_key=canonical_key,
                    value=1.0 if bool_val else 0.0,
                    canonical_unit="boolean",
                    raw_value=raw_val_any,
                    raw_unit=raw_unit,
                    measured_at=item_measured_at,
                )
            continue

        if canonical_key == "sex":
            val_str = str(raw_val_any).strip().upper()
            sex_code = "M" if val_str in {"M", "MALE", "HOMEM", "1"} else "F" if val_str in {"F", "FEMALE", "MULHER", "0"} else val_str
            normalized["sex"] = NormalizedInput(
                canonical_key="sex",
                value=1.0 if sex_code == "M" else 0.0,
                canonical_unit="category",
                raw_value=sex_code,
                raw_unit=raw_unit,
                measured_at=item_measured_at,
            )
            continue

        num_val, is_censored, censored_op, raw_str = parse_numeric_or_censored(raw_val_any)
        if num_val is None:
            continue

        u_clean = _clean_unit(raw_unit)
        conv_applied: str | None = None
        val_converted = float(num_val)

        # Regras de conversão de unidade antes do cálculo (§2.1 / §10)
        # 1. Glicose: mmol/L -> mg/dL
        if canonical_key == "fasting_glucose_mg_dl":
            if "mmol" in u_clean:
                val_converted = val_converted / 0.0555
                conv_applied = "mmol/L -> mg/dL (/ 0.0555)"

        # 2. Creatinina: µmol/L -> mg/dL
        elif canonical_key == "creatinine_mg_dl":
            if "umol" in u_clean or "µmol" in u_clean:
                val_converted = val_converted / 88.4
                conv_applied = "µmol/L -> mg/dL (/ 88.4)"

        # 3. Colesterol Total, HDL, LDL: mmol/L -> mg/dL
        elif canonical_key in {"total_chol_mg_dl", "hdl_mg_dl", "ldl_mg_dl"}:
            if "mmol" in u_clean:
                val_converted = val_converted * 38.67
                conv_applied = "mmol/L -> mg/dL (* 38.67)"

        # 4. Triglicerídeos: mmol/L -> mg/dL
        elif canonical_key == "triglycerides_mg_dl":
            if "mmol" in u_clean:
                val_converted = val_converted * 88.57
                conv_applied = "mmol/L -> mg/dL (* 88.57)"

        # 5. Albumina ou Hemoglobina: g/L -> g/dL
        elif canonical_key in {"albumin_g_dl", "hemoglobin_g_dl"}:
            if u_clean in {"g/l", "gl"}:
                val_converted = val_converted / 10.0
                conv_applied = "g/L -> g/dL (/ 10.0)"

        # 6. PCR-us (hs_crp): mg/dL -> mg/L
        elif canonical_key == "hs_crp_mg_l":
            if u_clean in {"mg/dl", "mgdl"}:
                val_converted = val_converted * 10.0
                conv_applied = "mg/dL -> mg/L (* 10.0)"

        # 7. Contagens hematológicas absolutas: células/µL ou /mm³ -> 10³/µL
        elif canonical_key in {"wbc_k_ul", "neutrophils_k_ul", "lymphocytes_k_ul", "monocytes_k_ul", "platelets_k_ul"}:
            if any(marker in u_clean for marker in ["/ul", "/mm3", "/mcl", "cells/ul", "cells/mm3", "celulas/ul", "celulas/mm3"]):
                if not any(k in u_clean for k in ["103", "10^3", "k/ul", "mil/mm3", "mil/ul"]):
                    # Unidade em células inteiras
                    if val_converted > 50.0:  # Guarda contra valor já em k/uL mas com rótulo ambíguo
                        val_converted = val_converted / 1000.0
                        conv_applied = "cells/µL -> 10³/µL (/ 1000.0)"

        # 8. Altura: metros -> cm
        elif canonical_key == "height_cm":
            if u_clean in {"m", "metro", "metros"} or (val_converted < 3.0 and val_converted > 0):
                val_converted = val_converted * 100.0
                conv_applied = "m -> cm (* 100.0)"

        target_unit = CANONICAL_UNITS.get(canonical_key, raw_unit or "dimensionless")
        normalized[canonical_key] = NormalizedInput(
            canonical_key=canonical_key,
            value=val_converted,
            canonical_unit=target_unit,
            raw_value=raw_val_any,
            raw_unit=raw_unit,
            conversion_applied=conv_applied,
            measured_at=item_measured_at,
            censored=is_censored,
            censored_op=censored_op,
        )

    # --- DERIVAÇÕES CONTROLADAS (§2.1) ---
    # 1. Derivação de BUN a partir de ureia: BUN (mg/dL) ≈ ureia (mg/dL) / 2.14
    if "bun_mg_dl" not in normalized and "urea_mg_dl" in normalized:
        urea_input = normalized["urea_mg_dl"]
        derived_bun = urea_input.value / 2.14
        normalized["bun_mg_dl"] = NormalizedInput(
            canonical_key="bun_mg_dl",
            value=round(derived_bun, 2),
            canonical_unit="mg/dL",
            raw_value=urea_input.raw_value,
            raw_unit=urea_input.raw_unit,
            conversion_applied="bun_mg_dl = urea_mg_dl / 2.14",
            derived_from=["urea_mg_dl"],
            measured_at=urea_input.measured_at,
            censored=urea_input.censored,
            censored_op=urea_input.censored_op,
        )

    # 2. Derivação de linfócitos absolutos: wbc_k_ul * (lymphocytes_pct / 100.0)
    if "lymphocytes_k_ul" not in normalized and "wbc_k_ul" in normalized and "lymphocytes_pct" in normalized:
        wbc_input = normalized["wbc_k_ul"]
        pct_input = normalized["lymphocytes_pct"]
        derived_lymph = wbc_input.value * (pct_input.value / 100.0)
        normalized["lymphocytes_k_ul"] = NormalizedInput(
            canonical_key="lymphocytes_k_ul",
            value=round(derived_lymph, 3),
            canonical_unit="10³/µL",
            raw_value={"wbc": wbc_input.raw_value, "lymph_pct": pct_input.raw_value},
            raw_unit="10³/µL",
            conversion_applied="lymphocytes_k_ul = wbc_k_ul * (lymphocytes_pct / 100.0)",
            derived_from=["wbc_k_ul", "lymphocytes_pct"],
            measured_at=wbc_input.measured_at or pct_input.measured_at,
            censored=wbc_input.censored or pct_input.censored,
        )

    # 2b. Derivação de neutrófilos absolutos: wbc_k_ul * (neutrophils_pct / 100.0)
    if "neutrophils_k_ul" not in normalized and "wbc_k_ul" in normalized and "neutrophils_pct" in normalized:
        wbc_input = normalized["wbc_k_ul"]
        pct_input = normalized["neutrophils_pct"]
        derived_neut = wbc_input.value * (pct_input.value / 100.0)
        normalized["neutrophils_k_ul"] = NormalizedInput(
            canonical_key="neutrophils_k_ul",
            value=round(derived_neut, 3),
            canonical_unit="10³/µL",
            raw_value={"wbc": wbc_input.raw_value, "neut_pct": pct_input.raw_value},
            raw_unit="10³/µL",
            conversion_applied="neutrophils_k_ul = wbc_k_ul * (neutrophils_pct / 100.0)",
            derived_from=["wbc_k_ul", "neutrophils_pct"],
            measured_at=wbc_input.measured_at or pct_input.measured_at,
            censored=wbc_input.censored or pct_input.censored,
        )

    # 2c. Derivação de monócitos absolutos: wbc_k_ul * (monocytes_pct / 100.0)
    if "monocytes_k_ul" not in normalized and "wbc_k_ul" in normalized and "monocytes_pct" in normalized:
        wbc_input = normalized["wbc_k_ul"]
        pct_input = normalized["monocytes_pct"]
        derived_mono = wbc_input.value * (pct_input.value / 100.0)
        normalized["monocytes_k_ul"] = NormalizedInput(
            canonical_key="monocytes_k_ul",
            value=round(derived_mono, 3),
            canonical_unit="10³/µL",
            raw_value={"wbc": wbc_input.raw_value, "mono_pct": pct_input.raw_value},
            raw_unit="10³/µL",
            conversion_applied="monocytes_k_ul = wbc_k_ul * (monocytes_pct / 100.0)",
            derived_from=["wbc_k_ul", "monocytes_pct"],
            measured_at=wbc_input.measured_at or pct_input.measured_at,
            censored=wbc_input.censored or pct_input.censored,
        )

    # 3. Derivação inversa de linfócitos % se apenas contagem absoluta e WBC existirem
    if "lymphocytes_pct" not in normalized and "lymphocytes_k_ul" in normalized and "wbc_k_ul" in normalized:
        wbc_input = normalized["wbc_k_ul"]
        lymph_input = normalized["lymphocytes_k_ul"]
        if wbc_input.value > 0:
            derived_pct = (lymph_input.value / wbc_input.value) * 100.0
            normalized["lymphocytes_pct"] = NormalizedInput(
                canonical_key="lymphocytes_pct",
                value=round(derived_pct, 1),
                canonical_unit="%",
                raw_value={"lymph_k_ul": lymph_input.raw_value, "wbc": wbc_input.raw_value},
                raw_unit="%",
                conversion_applied="lymphocytes_pct = (lymphocytes_k_ul / wbc_k_ul) * 100.0",
                derived_from=["lymphocytes_k_ul", "wbc_k_ul"],
                measured_at=lymph_input.measured_at or wbc_input.measured_at,
                censored=lymph_input.censored or wbc_input.censored,
            )

    return normalized


def convert_biomarker_unit(key: str, value: float, unit: str) -> NormalizedInput:
    """Converte um biomarcador para sua unidade canônica."""
    norm = normalize_observation_inputs({key: {"value": value, "unit": unit}})
    if norm:
        return next(iter(norm.values()))
    return NormalizedInput(canonical_key=key, value=value, canonical_unit=unit)


def derive_bun_from_urea(urea_mg_dl: float) -> NormalizedInput:
    """Deriva BUN (mg/dL) a partir da concentração sérica de ureia."""
    norm = normalize_observation_inputs({"urea": {"value": urea_mg_dl, "unit": "mg/dL"}})
    return norm["bun_mg_dl"]


def derive_lymphocyte_count(wbc_k_ul: float, lymph_pct: float) -> NormalizedInput:
    """Deriva a contagem absoluta de linfócitos (10³/µL) a partir de leucócitos totais e percentual."""
    norm = normalize_observation_inputs({
        "wbc": {"value": wbc_k_ul, "unit": "10^3/uL"},
        "lymphocyte_pct": {"value": lymph_pct, "unit": "%"},
    })
    return norm["lymphocytes_k_ul"]


def derive_lymphocyte_percent(lymph_k_ul: float, wbc_k_ul: float) -> NormalizedInput:
    """Deriva a porcentagem de linfócitos a partir da contagem absoluta e leucócitos totais."""
    norm = normalize_observation_inputs({
        "lymphocytes_abs": {"value": lymph_k_ul, "unit": "10^3/uL"},
        "wbc": {"value": wbc_k_ul, "unit": "10^3/uL"},
    })
    return norm["lymphocytes_pct"]


# Alias canônico para uso em ingestão e cálculos clínicos
normalize_clinical_inputs = normalize_observation_inputs


