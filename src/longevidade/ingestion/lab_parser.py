"""
Parser de resultados de exames laboratoriais (CSV / JSON) para o projeto Longevidade.
Converte e popula lab_results e aciona o cálculo do PhenoAge.
"""

from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

from longevidade.algorithms.phenoage import PhenoAgeInput, calculate_phenoage
from longevidade.algorithms.phenoage_panel import select_latest_complete_phenoage_panel
from longevidade.db.repository import LongevityRepository
from longevidade.lab_provenance import (
    CLINICALLY_ELIGIBLE_LAB_ORIGINS,
    UNVERIFIED_LAB_ORIGIN,
    normalize_lab_record_origin,
)
from longevidade.ingestion.lab_normalization import (
    LAB_MARKER_LABELS,
    build_phenoage_input,
    normalize_lab_key,
    normalize_lab_record,
    validate_phenoage_inputs,
)

# Tabela Completa de Alvos Ótimos de Longevidade (Protocolo Blueprint / Medicina Funcional)
OPTIMAL_LONGEVITY_TARGETS = {
    # Cardiovascular & Lípides
    "apob": {"name": "Apolipoproteína B (ApoB)", "unit": "mg/dL", "ref_min": 60, "ref_max": 130, "optimal": 60.0, "category": "Cardiovascular"},
    "lpa": {"name": "Lipoproteína (a) [Lp(a)]", "unit": "nmol/L", "ref_min": 0, "ref_max": 75, "optimal": 30.0, "category": "Cardiovascular"},
    "ldl": {"name": "Colesterol LDL", "unit": "mg/dL", "ref_min": 70, "ref_max": 130, "optimal": 70.0, "category": "Cardiovascular"},
    "hdl": {"name": "Colesterol HDL", "unit": "mg/dL", "ref_min": 40, "ref_max": 90, "optimal": 60.0, "category": "Cardiovascular"},
    "triglycerides": {"name": "Triglicérides", "unit": "mg/dL", "ref_min": 50, "ref_max": 150, "optimal": 80.0, "category": "Cardiovascular"},

    # Inflamação & Imunidade
    "hscrp": {"name": "Proteína C-Reativa ultrassensível (PCR-us)", "unit": "mg/L", "ref_min": 0, "ref_max": 3.0, "optimal": 0.5, "category": "Inflamação"},
    "homocysteine": {"name": "Homocisteína", "unit": "umol/L", "ref_min": 5.0, "ref_max": 15.0, "optimal": 7.5, "category": "Metilação/Cardio"},
    "ferritin": {"name": "Ferritina Sanguínea", "unit": "ng/mL", "ref_min": 30, "ref_max": 300, "optimal": 100.0, "category": "Inflamação/Ferro"},
    "wbc": {"name": "Leucócitos Totais (WBC)", "unit": "10^3/uL", "ref_min": 4.5, "ref_max": 11.0, "optimal": 5.5, "category": "Imunidade"},
    "lymphocyte_pct": {"name": "Linfócitos (%)", "unit": "%", "ref_min": 20, "ref_max": 40, "optimal": 30.0, "category": "Imunidade"},

    # Glicemia & Metabolismo
    "fasting_glucose": {"name": "Glicose de Jejum", "unit": "mg/dL", "ref_min": 70, "ref_max": 99, "optimal": 85.0, "category": "Metabolismo"},
    "fasting_insulin": {"name": "Insulina de Jejum", "unit": "uIU/mL", "ref_min": 2.6, "ref_max": 24.9, "optimal": 4.0, "category": "Metabolismo"},
    "hba1c": {"name": "Hemoglobina Glicada (HbA1c)", "unit": "%", "ref_min": 4.0, "ref_max": 5.6, "optimal": 5.2, "category": "Metabolismo"},
    "homa_ir": {"name": "Índice HOMA-IR", "unit": "score", "ref_min": 0.5, "ref_max": 2.1, "optimal": 1.0, "category": "Metabolismo"},
    "uric_acid": {"name": "Ácido Úrico", "unit": "mg/dL", "ref_min": 3.5, "ref_max": 7.2, "optimal": 5.0, "category": "Metabolismo"},

    # Hormônios Sexuais & Cortisol
    "testosterone_total": {"name": "Testosterona Total", "unit": "ng/dL", "ref_min": 300, "ref_max": 1000, "optimal": 750.0, "category": "Hormônios"},
    "testosterone_free": {"name": "Testosterona Livre", "unit": "pg/mL", "ref_min": 8.7, "ref_max": 25.0, "optimal": 18.0, "category": "Hormônios"},
    "estradiol": {"name": "Estradiol (E2)", "unit": "pg/mL", "ref_min": 10, "ref_max": 40, "optimal": 25.0, "category": "Hormônios"},
    "shbg": {"name": "SHBG (Globulina Ligadora)", "unit": "nmol/L", "ref_min": 18, "ref_max": 54, "optimal": 35.0, "category": "Hormônios"},
    "dhea_s": {"name": "DHEA-S", "unit": "ug/dL", "ref_min": 160, "ref_max": 450, "optimal": 350.0, "category": "Hormônios"},
    "cortisol": {"name": "Cortisol Basal (Manhã)", "unit": "ug/dL", "ref_min": 6.2, "ref_max": 19.4, "optimal": 12.0, "category": "Hormônios"},

    # Função Hepática
    "albumin": {"name": "Albumina Sanguínea", "unit": "g/dL", "ref_min": 3.5, "ref_max": 5.2, "optimal": 4.6, "category": "Hepático/Nutricional"},
    "alk_phos": {"name": "Fosfatase Alcalina", "unit": "U/L", "ref_min": 44, "ref_max": 147, "optimal": 65.0, "category": "Hepático/Ósseo"},
    "ast": {"name": "TGO / AST", "unit": "U/L", "ref_min": 10, "ref_max": 40, "optimal": 20.0, "category": "Hepático"},
    "alt": {"name": "TGP / ALT", "unit": "U/L", "ref_min": 7, "ref_max": 56, "optimal": 20.0, "category": "Hepático"},
    "ggt": {"name": "Gama GT (GGT)", "unit": "U/L", "ref_min": 8, "ref_max": 61, "optimal": 18.0, "category": "Hepático"},

    # Função Renal
    "creatinine": {"name": "Creatinina Sanguínea", "unit": "mg/dL", "ref_min": 0.7, "ref_max": 1.2, "optimal": 0.9, "category": "Renal"},
    "cystatin_c": {"name": "Cistatina C", "unit": "mg/L", "ref_min": 0.6, "ref_max": 1.0, "optimal": 0.75, "category": "Renal"},
    "egfr": {"name": "Taxa de Filtração Glomerular (eGFR)", "unit": "mL/min", "ref_min": 90, "ref_max": 120, "optimal": 105.0, "category": "Renal"},
    "urea": {"name": "Ureia Sanguínea", "unit": "mg/dL", "ref_min": 15, "ref_max": 45, "optimal": 25.0, "category": "Renal"},

    # Tireoide & Vitaminas
    "tsh": {"name": "TSH (Tireoestimulante)", "unit": "uIU/mL", "ref_min": 0.4, "ref_max": 4.0, "optimal": 1.5, "category": "Tireoide"},
    "free_t3": {"name": "T3 Livre", "unit": "pg/mL", "ref_min": 2.0, "ref_max": 4.4, "optimal": 3.4, "category": "Tireoide"},
    "free_t4": {"name": "T4 Livre", "unit": "ng/dL", "ref_min": 0.8, "ref_max": 1.8, "optimal": 1.3, "category": "Tireoide"},
    "vitamin_d": {"name": "Vitamina D (25-OH-D)", "unit": "ng/mL", "ref_min": 30, "ref_max": 100, "optimal": 50.0, "category": "Vitaminas"},
    "vitamin_b12": {"name": "Vitamina B12", "unit": "pg/mL", "ref_min": 200, "ref_max": 900, "optimal": 700.0, "category": "Vitaminas"},
    "magnesium": {"name": "Magnésio Sanguíneo", "unit": "mg/dL", "ref_min": 1.7, "ref_max": 2.6, "optimal": 2.3, "category": "Minerais"},

    # Hematologia / Hemograma
    "mcv": {"name": "Volume Corpuscular Médio (MCV)", "unit": "fL", "ref_min": 80, "ref_max": 100, "optimal": 89.0, "category": "Hematologia"},
    "rdw": {"name": "Amplitude de Distribuição (RDW)", "unit": "%", "ref_min": 11.5, "ref_max": 14.5, "optimal": 12.2, "category": "Hematologia"},
    "hemoglobin": {"name": "Hemoglobina", "unit": "g/dL", "ref_min": 13.5, "ref_max": 17.5, "optimal": 15.0, "category": "Hematologia"},
    "platelets": {"name": "Plaquetas", "unit": "10^3/uL", "ref_min": 150, "ref_max": 450, "optimal": 220.0, "category": "Hematologia"}
}

_CANONICAL_TARGET_SOURCE_KEYS = {
    "glucose_mgdl": "fasting_glucose",
    "creatinine_mgdl": "creatinine",
    "albumin_gdl": "albumin",
    "hscrp_mgl": "hscrp",
    "mcv_fl": "mcv",
    "rdw_pct": "rdw",
    "alk_phos_ul": "alk_phos",
    "wbc_1000ul": "wbc",
    "hdl_cholesterol": "hdl",
    "ldl_cholesterol": "ldl",
    "bun": "urea",
}

for canonical_key, source_key in _CANONICAL_TARGET_SOURCE_KEYS.items():
    if source_key in OPTIMAL_LONGEVITY_TARGETS and canonical_key not in OPTIMAL_LONGEVITY_TARGETS:
        target = dict(OPTIMAL_LONGEVITY_TARGETS[source_key])
        target["name"] = LAB_MARKER_LABELS.get(canonical_key, target.get("name", canonical_key.upper()))
        OPTIMAL_LONGEVITY_TARGETS[canonical_key] = target

OPTIMAL_LONGEVITY_TARGETS.setdefault(
    "apoa1",
    {"name": "Apolipoproteína A1 (ApoA1)", "unit": "mg/dL", "ref_min": 110, "ref_max": 180, "optimal": 140.0, "category": "Cardiovascular"},
)
OPTIMAL_LONGEVITY_TARGETS.setdefault(
    "total_cholesterol",
    {"name": "Colesterol Total", "unit": "mg/dL", "ref_min": 125, "ref_max": 200, "optimal": 160.0, "category": "Cardiovascular"},
)


def ingest_lab_records(
    records: List[Dict[str, Any]],
    repo: LongevityRepository,
    chronological_age: float = 40.0,
    record_origin: str = UNVERIFIED_LAB_ORIGIN,
) -> Dict[str, Any]:
    """Ingere exames, normaliza aliases e só calcula PhenoAge se o painel estiver completo."""
    normalized_origin = normalize_lab_record_origin(record_origin)
    inserted = 0
    latest_values: Dict[str, float] = {}
    phenoage_candidates: list[Dict[str, Any]] = []

    for rec in records:
        normalized_rec = normalize_lab_record(rec)
        key = normalize_lab_key(normalized_rec.get("metric_key"))
        val = float(normalized_rec.get("value", 0))
        dt = str(normalized_rec.get("collected_at", date.today().isoformat()))

        target_info = OPTIMAL_LONGEVITY_TARGETS.get(key, {})
        entry = {
            "collected_at": dt,
            "metric_key": key,
            "metric_name": normalized_rec.get("metric_name") or target_info.get("name") or LAB_MARKER_LABELS.get(key) or key.upper(),
            "value": val,
            "unit": normalized_rec.get("unit") or target_info.get("unit") or "",
            "ref_min": normalized_rec.get("ref_min") if normalized_rec.get("ref_min") is not None else target_info.get("ref_min"),
            "ref_max": normalized_rec.get("ref_max") if normalized_rec.get("ref_max") is not None else target_info.get("ref_max"),
            "optimal_target": normalized_rec.get("optimal_target") if normalized_rec.get("optimal_target") is not None else target_info.get("optimal"),
            "category": normalized_rec.get("category") or target_info.get("category") or "Geral",
            "notes": normalized_rec.get("notes"),
            "record_origin": normalized_origin,
        }
        repo.add_lab_result(entry)
        inserted += 1
        if normalized_origin in CLINICALLY_ELIGIBLE_LAB_ORIGINS:
            latest_values[key] = val
            phenoage_candidates.append(entry)

    pheno_validation = validate_phenoage_inputs(latest_values)
    pheno_result: Dict[str, Any] = {
        "status": pheno_validation["status"],
        "missing": pheno_validation["missing"],
        "missing_biomarkers": pheno_validation["missing"],
        "biomarkers_used": pheno_validation["biomarkers_used"],
    }

    if normalized_origin not in CLINICALLY_ELIGIBLE_LAB_ORIGINS:
        pheno_result["status"] = "excluded_nonclinical"
        pheno_result["reason"] = "Dados sem provenance clínica não são elegíveis para cálculo ou persistência de PhenoAge."
        return {"status": "ok", "inserted": inserted, "phenoage": pheno_result}

    panel = select_latest_complete_phenoage_panel(phenoage_candidates)
    if panel is None:
        if pheno_validation["status"] == "complete":
            pheno_result["status"] = "incomplete"
            pheno_result["reason"] = (
                "Os nove marcadores existem, mas não pertencem à mesma data de coleta; "
                "PhenoAge não foi calculado."
            )
        return {"status": "ok", "inserted": inserted, "phenoage": pheno_result}

    if pheno_validation["status"] == "complete":
        pheno_input: PhenoAgeInput = build_phenoage_input(panel.values, chronological_age)  # type: ignore[assignment]
        p_res = calculate_phenoage(pheno_input)
        if p_res.get("status") == "complete":
            repo.add_phenoage_record({
                "calculated_at": panel.collected_at,
                "chronological_age": p_res["chronological_age"],
                "pheno_age": p_res["pheno_age"],
                "age_delta": p_res["age_delta"],
                "glucose_mgdl": pheno_input["glucose_mgdl"],
                "creatinine_mgdl": pheno_input["creatinine_mgdl"],
                "albumin_gdl": pheno_input["albumin_gdl"],
                "hscrp_mgl": pheno_input["hscrp_mgl"],
                "lymphocyte_pct": pheno_input["lymphocyte_pct"],
                "mcv_fl": pheno_input["mcv_fl"],
                "rdw_pct": pheno_input["rdw_pct"],
                "alk_phos_ul": pheno_input["alk_phos_ul"],
                "wbc_1000ul": pheno_input["wbc_1000ul"],
                "notes": f"Cálculo automatizado PhenoAge via exames. Risco 10 anos: {p_res['mortality_risk_10yr_pct']}%",
                "record_origin": normalized_origin,
            })
        pheno_result = p_res

    return {"status": "ok", "inserted": inserted, "phenoage": pheno_result}
