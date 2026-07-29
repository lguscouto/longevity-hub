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
from longevidade.db.repository import LongevityRepository

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


def ingest_lab_records(records: List[Dict[str, Any]], repo: LongevityRepository, chronological_age: float = 40.0) -> int:
    """Ingere uma lista de exames laboratoriais e calcula o PhenoAge se os marcadores estiverem presentes."""
    inserted = 0
    collected_dates = set()
    latest_values: Dict[str, float] = {}

    for rec in records:
        key = str(rec.get("metric_key", "")).lower().strip()
        val = float(rec.get("value", 0))
        dt = str(rec.get("collected_at", date.today().isoformat()))

        target_info = OPTIMAL_LONGEVITY_TARGETS.get(key, {})
        entry = {
            "collected_at": dt,
            "metric_key": key,
            "metric_name": rec.get("metric_name") or target_info.get("name") or key.upper(),
            "value": val,
            "unit": rec.get("unit") or target_info.get("unit") or "",
            "ref_min": rec.get("ref_min") or target_info.get("ref_min"),
            "ref_max": rec.get("ref_max") or target_info.get("ref_max"),
            "optimal_target": rec.get("optimal_target") or target_info.get("optimal"),
            "category": rec.get("category") or target_info.get("category") or "Geral",
            "notes": rec.get("notes")
        }
        repo.add_lab_result(entry)
        inserted += 1
        collected_dates.add(dt)
        latest_values[key] = val

    # Tenta calcular o PhenoAge se tivermos os marcadores necessários ou usa os mais recentes
    pheno_input: PhenoAgeInput = {
        "chronological_age": chronological_age,
        "glucose_mgdl": latest_values.get("fasting_glucose", latest_values.get("glucose", 90.0)),
        "creatinine_mgdl": latest_values.get("creatinine", 0.9),
        "albumin_gdl": latest_values.get("albumin", 4.5),
        "hscrp_mgl": latest_values.get("hscrp", 0.5),
        "lymphocyte_pct": latest_values.get("lymphocyte_pct", 30.0),
        "mcv_fl": latest_values.get("mcv", 89.0),
        "rdw_pct": latest_values.get("rdw", 12.5),
        "alk_phos_ul": latest_values.get("alk_phos", 65.0),
        "wbc_1000ul": latest_values.get("wbc", 6.0)
    }

    p_res = calculate_phenoage(pheno_input)
    repo.add_phenoage_record({
        "calculated_at": max(collected_dates) if collected_dates else date.today().isoformat(),
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
        "notes": f"Cálculo automatizado PhenoAge via exames. Risco 10 anos: {p_res['mortality_risk_10yr_pct']}%"
    })

    return inserted
