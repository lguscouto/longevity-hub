"""Vocabulário canônico de biomarcadores laboratoriais.

A camada de ingestão, cálculos clínicos e frontend historicamente usavam aliases
incompatíveis (`hdl` vs. `hdl_cholesterol`, `creatinine` vs.
`creatinine_mgdl`). Este módulo centraliza a normalização para que PhenoAge,
KDM e razões cardiovasculares recebam as mesmas chaves.
"""

from __future__ import annotations

import math
import re
from typing import Any, Mapping

PHENOAGE_REQUIRED_MARKERS: tuple[str, ...] = (
    "glucose_mgdl",
    "creatinine_mgdl",
    "albumin_gdl",
    "hscrp_mgl",
    "lymphocyte_pct",
    "mcv_fl",
    "rdw_pct",
    "alk_phos_ul",
    "wbc_1000ul",
)

LAB_KEY_ALIASES: dict[str, str] = {
    # Glicose
    "fasting_glucose": "glucose_mgdl",
    "glucose": "glucose_mgdl",
    "glicose": "glucose_mgdl",
    "glucose_mgdl": "glucose_mgdl",
    "fasting_glucose_mg_dl": "glucose_mgdl",

    # Creatinina
    "creatinine": "creatinine_mgdl",
    "creatinina": "creatinine_mgdl",
    "creatinine_mgdl": "creatinine_mgdl",
    "creatinine_mg_dl": "creatinine_mgdl",

    # Albumina
    "albumin": "albumin_gdl",
    "albumina": "albumin_gdl",
    "albumin_gdl": "albumin_gdl",
    "albumin_g_dl": "albumin_gdl",

    # PCR-us
    "hscrp": "hscrp_mgl",
    "pcr_us": "hscrp_mgl",
    "pcrus": "hscrp_mgl",
    "crp": "hscrp_mgl",
    "pcr": "hscrp_mgl",
    "hs_crp": "hscrp_mgl",
    "hs_crp_mg_l": "hscrp_mgl",
    "hscrp_mgl": "hscrp_mgl",

    # RDW
    "rdw": "rdw_pct",
    "rdw_pct": "rdw_pct",

    # Fosfatase alcalina
    "alk_phos": "alk_phos_ul",
    "alp": "alk_phos_ul",
    "alkaline_phosphatase": "alk_phos_ul",
    "fosfatase_alcalina": "alk_phos_ul",
    "alk_phos_ul": "alk_phos_ul",
    "alp_u_l": "alk_phos_ul",

    # Leucócitos
    "wbc": "wbc_1000ul",
    "leukocytes": "wbc_1000ul",
    "leucocitos": "wbc_1000ul",
    "wbc_1000ul": "wbc_1000ul",
    "wbc_k_ul": "wbc_1000ul",

    # VCM / MCV
    "mcv": "mcv_fl",
    "vcm": "mcv_fl",
    "mcv_fl": "mcv_fl",

    # Linfócitos %
    "lymphocyte_pct": "lymphocyte_pct",
    "lymphocytes_pct": "lymphocyte_pct",
    "linfocitos_pct": "lymphocyte_pct",
    "linfocitos_relativos": "lymphocyte_pct",

    # Colesterol / Lípides
    "hdl": "hdl_cholesterol",
    "hdl_c": "hdl_cholesterol",
    "hdl_cholesterol": "hdl_cholesterol",
    "hdl_mg_dl": "hdl_cholesterol",
    "ldl": "ldl_cholesterol",
    "ldl_c": "ldl_cholesterol",
    "ldl_cholesterol": "ldl_cholesterol",
    "ldl_mg_dl": "ldl_cholesterol",
    "total_chol": "total_cholesterol",
    "cholesterol_total": "total_cholesterol",
    "colesterol_total": "total_cholesterol",
    "total_cholesterol": "total_cholesterol",
    "total_chol_mg_dl": "total_cholesterol",
    "tg": "triglycerides",
    "triglicerides": "triglycerides",
    "triglicerideos": "triglycerides",
    "triglycerides": "triglycerides",
    "triglycerides_mg_dl": "triglycerides",
    "apob": "apob",
    "apo_b": "apob",
    "apoa1": "apoa1",
    "apo_a1": "apoa1",

    # Ureia e BUN (SEPARADOS!)
    "bun": "bun",
    "blood_urea_nitrogen": "bun",
    "bun_mg_dl": "bun",
    "urea": "urea",
    "ureia": "urea",
    "urea_mg_dl": "urea",

    # Insulina
    "fasting_insulin": "fasting_insulin",
    "insulin": "fasting_insulin",
    "insulina": "fasting_insulin",
    "insulina_jejum": "fasting_insulin",
    "insulina_de_jejum": "fasting_insulin",
    "fasting_insulin_uiu_ml": "fasting_insulin",

    # HbA1c
    "hba1c": "hba1c",
    "hemoglobina_glicada": "hba1c",
    "glicada": "hba1c",
    "hba1c_pct": "hba1c",

    # Ácido Úrico
    "uric_acid": "uric_acid",
    "acido_urico": "uric_acid",
    "uric_acid_mg_dl": "uric_acid",

    # Fígado (ALT, AST, GGT)
    "alt": "alt",
    "tgp": "alt",
    "alt_tgp": "alt",
    "alt_u_l": "alt",
    "ast": "ast",
    "tgo": "ast",
    "ast_tgo": "ast",
    "ast_u_l": "ast",
    "ggt": "ggt",
    "gama_gt": "ggt",
    "gama_glutamil": "ggt",
    "ggt_u_l": "ggt",

    # Hemograma
    "hemoglobin": "hemoglobin",
    "hemoglobina": "hemoglobin",
    "hb": "hemoglobin",
    "hemoglobin_g_dl": "hemoglobin",
    "hematocrit": "hematocrit",
    "hematocrito": "hematocrit",
    "ht": "hematocrit",
    "hematocrit_pct": "hematocrit",
    "neutrophils": "neutrophils",
    "neutrofilos": "neutrophils",
    "neutrofilos_absolutos": "neutrophils",
    "neutrophils_abs": "neutrophils",
    "neutrophils_k_ul": "neutrophils",
    "lymphocytes": "lymphocytes_abs",
    "linfocitos": "lymphocytes_abs",
    "linfocitos_absolutos": "lymphocytes_abs",
    "lymphocytes_abs": "lymphocytes_abs",
    "lymphocytes_k_ul": "lymphocytes_abs",
    "monocytes": "monocytes",
    "monocitos": "monocytes",
    "monocitos_absolutos": "monocytes",
    "monocytes_abs": "monocytes",
    "monocytes_k_ul": "monocytes",
    "platelets": "platelets",
    "plaquetas": "platelets",
    "platelets_k_ul": "platelets",

    # Hormônios
    "total_testosterone": "total_testosterone",
    "testosterone_total": "total_testosterone",
    "testosterona_total": "total_testosterone",
    "testosterone": "total_testosterone",
    "total_testosterone_ng_dl": "total_testosterone",

    # Opcionais e outros
    "uacr": "uacr",
    "relacao_albumina_creatinina_urinaria": "uacr",
    "uacr_mg_g": "uacr",
    "fev1": "fev1",
    "vef1": "fev1",
    "fev1_l": "fev1",
    "cmv_optical_density": "cmv_optical_density",
    "cmv_igg": "cmv_optical_density",
    "cmv": "cmv_optical_density",
    "ast_uln": "ast_uln",
    "ast_uln_u_l": "ast_uln",
}

LAB_MARKER_LABELS: dict[str, str] = {
    "glucose_mgdl": "Glicose de jejum",
    "creatinine_mgdl": "Creatinina",
    "albumin_gdl": "Albumina",
    "hscrp_mgl": "Proteína C-Reativa ultrassensível",
    "lymphocyte_pct": "Linfócitos (%)",
    "mcv_fl": "MCV",
    "rdw_pct": "RDW",
    "alk_phos_ul": "Fosfatase alcalina",
    "wbc_1000ul": "Leucócitos totais",
    "hdl_cholesterol": "Colesterol HDL",
    "ldl_cholesterol": "Colesterol LDL",
    "total_cholesterol": "Colesterol total",
    "triglycerides": "Triglicérides",
    "apob": "Apolipoproteína B (ApoB)",
    "apoa1": "Apolipoproteína A1 (ApoA1)",
    "bun": "Nitrogênio Ureico no Sangue (BUN)",
    "urea": "Ureia",
    "fasting_insulin": "Insulina de jejum",
    "hba1c": "Hemoglobina Glicada (HbA1c)",
    "uric_acid": "Ácido úrico",
    "alt": "ALT (TGP)",
    "ast": "AST (TGO)",
    "ggt": "GGT (Gama-glutamiltransferase)",
    "hemoglobin": "Hemoglobina",
    "hematocrit": "Hematócrito",
    "neutrophils": "Neutrófilos absolutos",
    "lymphocytes_abs": "Linfócitos absolutos",
    "monocytes": "Monócitos absolutos",
    "platelets": "Plaquetas",
    "total_testosterone": "Testosterona total",
    "uacr": "UACR (Relação Albumina/Creatinina Urinária)",
    "fev1": "VEF1 (Volume Expiratório Forçado)",
    "cmv_optical_density": "CMV (Densidade Óptica)",
    "ast_uln": "Limite Superior Normal de AST (ULN)",
}


def _slug_key(key: str) -> str:
    normalized = key.strip().lower()
    normalized = normalized.replace("%", "pct")
    normalized = re.sub(r"[^a-z0-9]+", "_", normalized)
    return normalized.strip("_")


def normalize_lab_key(metric_key: str | None) -> str:
    """Retorna a chave canônica de um biomarcador ou string vazia."""
    if not metric_key:
        return ""
    slug = _slug_key(str(metric_key))
    return LAB_KEY_ALIASES.get(slug, slug)


def _parse_scientific_or_plain(s: str) -> float | None:
    s_clean = s.strip()
    exp_match = re.match(r"^([0-9]+(?:[\.,][0-9]+)?)\s*(?:[xX*]|\b(?:x|\*)\b)\s*10\^?([+-]?[0-9]+)$", s_clean)
    if exp_match:
        try:
            base = float(exp_match.group(1).replace(",", "."))
            exponent = float(exp_match.group(2))
            return base * (10 ** exponent)
        except (ValueError, TypeError):
            pass
    try:
        return float(s_clean.replace(",", "."))
    except (ValueError, TypeError):
        return None


def parse_numeric_or_censored(raw_value: Any) -> tuple[float | None, bool, str | None, str]:
    """Interpreta números normais, notação científica e valores censurados sem perda silenciosa.

    Retorna uma tupla:
      (numeric_value, is_censored, censored_operator, raw_str)

    Exemplos:
      "<0.1"     -> (0.1, True, "<", "<0.1")
      "<= 0,3"   -> (0.3, True, "<=", "<= 0,3")
      ">100"     -> (100.0, True, ">", ">100")
      "4.5e3"    -> (4500.0, False, None, "4.5e3")
      "< 1e-2"   -> (0.01, True, "<", "< 1e-2")
      4.5        -> (4.5, False, None, "4.5")
      "4.5"      -> (4.5, False, None, "4.5")
      None       -> (None, False, None, "")
    """
    if isinstance(raw_value, Mapping):
        raw_value = raw_value.get("value")
    if raw_value is None or raw_value == "":
        return (None, False, None, "")

    raw_str = str(raw_value).strip()
    match = re.match(
        r"^\s*(<=|>=|<|>)\s*([0-9]+(?:[\.,][0-9]+)?(?:[eE][+-]?[0-9]+)?(?:\s*[xX*]\s*10\^?[+-]?[0-9]+)?)(?:\s+.*)?$",
        raw_str,
    )
    if match:
        op = match.group(1)
        num = _parse_scientific_or_plain(match.group(2))
        if num is not None and math.isfinite(num):
            return (num, True, op, raw_str)

    plain_match = re.match(
        r"^\s*([0-9]+(?:[\.,][0-9]+)?(?:[eE][+-]?[0-9]+)?(?:\s*[xX*]\s*10\^?[+-]?[0-9]+)?)(?:\s+.*)?$",
        raw_str,
    )
    if plain_match:
        num = _parse_scientific_or_plain(plain_match.group(1))
        if num is not None and math.isfinite(num):
            return (num, False, None, raw_str)

    return (None, False, None, raw_str)


def coerce_float(value: Any) -> float | None:
    if isinstance(value, Mapping):
        value = value.get("value")
    if value is None or value == "":
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def normalize_lab_record(record: Mapping[str, Any]) -> dict[str, Any]:
    """Copia um registro laboratorial com `metric_key` canônica."""
    normalized = dict(record)
    canonical_key = normalize_lab_key(str(record.get("metric_key", "")))
    normalized["metric_key"] = canonical_key
    if not normalized.get("metric_name"):
        normalized["metric_name"] = LAB_MARKER_LABELS.get(canonical_key, canonical_key.upper())
    return normalized


def normalize_lab_map(labs_map: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    """Normaliza um mapa key -> registro/valor para chave canônica -> registro."""
    normalized: dict[str, dict[str, Any]] = {}
    for raw_key, raw_value in labs_map.items():
        canonical_key = normalize_lab_key(str(raw_key))
        if not canonical_key:
            continue
        if isinstance(raw_value, Mapping):
            item = normalize_lab_record({"metric_key": raw_key, **dict(raw_value)})
        else:
            item = {
                "metric_key": canonical_key,
                "metric_name": LAB_MARKER_LABELS.get(canonical_key, canonical_key.upper()),
                "value": raw_value,
            }
        item["metric_key"] = canonical_key
        normalized[canonical_key] = item
    return normalized


def values_from_lab_map(labs_map: Mapping[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for key, item in normalize_lab_map(labs_map).items():
        value = coerce_float(item.get("value"))
        if value is not None:
            values[key] = value
    return values


def validate_phenoage_inputs(data: Mapping[str, Any]) -> dict[str, Any]:
    """Valida os 9 marcadores obrigatórios do PhenoAge sem aplicar defaults."""
    normalized_values = values_from_lab_map(data)
    missing = [key for key in PHENOAGE_REQUIRED_MARKERS if key not in normalized_values]
    return {
        "status": "complete" if not missing else "incomplete",
        "missing": missing,
        "biomarkers_used": [key for key in PHENOAGE_REQUIRED_MARKERS if key in normalized_values],
        "values": normalized_values,
    }


def build_phenoage_input(data: Mapping[str, Any], chronological_age: float) -> dict[str, float]:
    validation = validate_phenoage_inputs(data)
    values = validation["values"]
    return {"chronological_age": float(chronological_age), **{key: values[key] for key in PHENOAGE_REQUIRED_MARKERS}}
