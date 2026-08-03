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
    "fasting_glucose": "glucose_mgdl",
    "glucose": "glucose_mgdl",
    "glicose": "glucose_mgdl",
    "creatinine": "creatinine_mgdl",
    "creatinina": "creatinine_mgdl",
    "albumin": "albumin_gdl",
    "albumina": "albumin_gdl",
    "hscrp": "hscrp_mgl",
    "pcr_us": "hscrp_mgl",
    "pcrus": "hscrp_mgl",
    "crp": "hscrp_mgl",
    "rdw": "rdw_pct",
    "alk_phos": "alk_phos_ul",
    "alp": "alk_phos_ul",
    "alkaline_phosphatase": "alk_phos_ul",
    "wbc": "wbc_1000ul",
    "leukocytes": "wbc_1000ul",
    "leucocitos": "wbc_1000ul",
    "mcv": "mcv_fl",
    "hdl": "hdl_cholesterol",
    "hdl_c": "hdl_cholesterol",
    "ldl": "ldl_cholesterol",
    "ldl_c": "ldl_cholesterol",
    "total_chol": "total_cholesterol",
    "cholesterol_total": "total_cholesterol",
    "colesterol_total": "total_cholesterol",
    "tg": "triglycerides",
    "triglicerides": "triglycerides",
    "triglicerideos": "triglycerides",
    "apob": "apob",
    "apo_b": "apob",
    "apoa1": "apoa1",
    "apo_a1": "apoa1",
    "bun": "bun",
    "urea": "bun",
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
    "bun": "Ureia/BUN",
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
