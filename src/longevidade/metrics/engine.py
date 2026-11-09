"""Motor determinístico de cálculo de indicadores derivados e marcadores biológicos.

Executa os algoritmos clínicos das 7 categorias conforme a especificação v1.0.
Garante rastreabilidade estrita de entradas, detecção de domínio inválido,
suporte a coortes oficiais e pareamento temporal de dados.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
import math
from typing import Any, Mapping

from longevidade.metrics.derived_catalog import (
    DERIVED_METRICS_CATALOG,
    DerivedMetricSpec,
)
from longevidade.metrics.unit_conversion import (
    NormalizedInput,
    normalize_observation_inputs,
)
from longevidade.algorithms.phenoage import calculate_phenoage, PhenoAgeInput


# Constantes e Coeficientes Oficiais Publicados (Hao et al., 2025 - Jerryhaom/GOLDBioAge)
LIGHT_BIOAGE_COEFFICIENTS = {
    "nhanes": {
        "beta0": -13.5298,
        "creat": 8.3313,          # mg/dL
        "glucose_mmol": 0.8270,   # mmol/L
        "log_crp": 5.7305,        # ln(1 + CRP_mg_dl)
        "crp_unit": "mg/dL",
    },
    "ukb": {
        "beta0": -20.1395,
        "creat": 9.0873,          # mg/dL
        "glucose_mmol": 1.7311,   # mmol/L
        "log_crp": 4.1689,        # ln(1 + CRP_mg_l)
        "crp_unit": "mg/L",
    },
    "charls": {
        "beta0": -16.7562,
        "creat": 5.0875,          # mg/dL
        "glucose_mmol": 1.5766,   # mmol/L
        "log_crp": 4.2983,        # ln(1 + CRP_mg_l)
        "crp_unit": "mg/L",
    },
}

GOLD_BIOAGE_COEFFICIENTS = {
    "nhanes": {
        "beta0": -53.62873,
        "creat": 5.26909180,
        "glucose_mmol": 0.57969768,
        "mcv": 0.33888497,
        "rdw": 2.64452031,
        "albumin": -4.73575224,
        "alp": 0.02604091,
        "lymph": -0.20318306,
        "wbc": 0.44588830,
        "ggt": 0.06075152,
    },
    "ukb": {
        "beta0": -78.6519,
        "creat": 5.3832,
        "glucose_mmol": 1.4168,
        "mcv": 0.4206,
        "rdw": 3.3162,
        "albumin": -5.0793,
        "alp": 0.0385,
        "lymph": -0.1899,
        "wbc": 0.9120,
        "ggt": 0.1007,
    },
}


def evaluate_metric(
    metric_id: str,
    normalized_inputs: Mapping[str, NormalizedInput],
    cohort_variant: str = "nhanes",
    calculated_at: str | None = None,
) -> dict[str, Any]:
    """Avalia determinísticamente uma métrica individual retornando o payload de resultado contratual."""
    spec = DERIVED_METRICS_CATALOG.get(metric_id)
    if not spec:
        return {
            "metric_id": metric_id,
            "algorithm_version": "unknown",
            "cohort_variant": cohort_variant,
            "status": "not_implemented",
            "value": None,
            "unit": "unknown",
            "measured_at": None,
            "input_snapshot": {},
            "missing_input_keys": [metric_id],
            "limitations": [f"Métrica '{metric_id}' não cadastrada no catálogo."],
            "source_url": None,
            "calculated_at": calculated_at or datetime.now(timezone.utc).isoformat(),
        }

    now_iso = calculated_at or datetime.now(timezone.utc).isoformat()
    cohort_clean = cohort_variant.lower().strip() if cohort_variant else "nhanes"

    # Snapshot das entradas necessárias
    norm_dict: Mapping[str, NormalizedInput]
    if any(not isinstance(v, NormalizedInput) for v in normalized_inputs.values()):
        norm_dict = normalize_observation_inputs(normalized_inputs)
    else:
        norm_dict = normalized_inputs

    # Verificação de bloqueios e pendências (§10)
    if spec.implementation_status in {"needs_reference", "needs_definition"}:
        if spec.id == "apri" and "ast_uln_u_l" in norm_dict:
            # ULN fornecido especificamente pelo laboratório: permite avaliação clínica
            pass
        else:
            status_name = "blocked_reference"
            reason = (
                "Aguardando calibração ou artefatos do modelo de referência oficial."
                if spec.implementation_status == "needs_reference"
                else "Exige definição institucional de protocolo antes da ativação."
            )
            return {
                "metric_id": spec.id,
                "algorithm_version": spec.algorithm_version,
                "cohort_variant": cohort_clean if spec.category == "biological_age" else None,
                "status": status_name,
                "value": None,
                "unit": spec.output_unit,
                "measured_at": None,
                "input_snapshot": {},
                "missing_input_keys": [],
                "limitations": list(spec.limitations) + [reason],
                "source_url": spec.source_url,
                "calculated_at": now_iso,
            }

    input_snapshot: dict[str, Any] = {}
    missing_keys: list[str] = []
    limitations: list[str] = list(spec.limitations)
    latest_measured_at: str | None = None
    has_censored_input = False

    for req_key in spec.input_keys:
        if req_key in norm_dict:
            item = norm_dict[req_key]
            input_snapshot[req_key] = item.value
            if item.measured_at and (latest_measured_at is None or item.measured_at > latest_measured_at):
                latest_measured_at = item.measured_at
            if item.censored:
                has_censored_input = True
                limitations.append(f"Insumo '{req_key}' possui valor censurado ({item.censored_op}{item.raw_value}).")
        else:
            missing_keys.append(req_key)

    if missing_keys:
        return {
            "metric_id": spec.id,
            "algorithm_version": spec.algorithm_version,
            "cohort_variant": cohort_clean if spec.category == "biological_age" else None,
            "status": "missing_inputs",
            "value": None,
            "unit": spec.output_unit,
            "measured_at": latest_measured_at,
            "input_snapshot": input_snapshot,
            "missing_input_keys": missing_keys,
            "limitations": limitations,
            "source_url": spec.source_url,
            "calculated_at": now_iso,
        }

    # Bloqueio de dados censurados para cálculos matemáticos quantitativos
    if has_censored_input:
        return {
            "metric_id": spec.id,
            "algorithm_version": spec.algorithm_version,
            "cohort_variant": cohort_clean if spec.category == "biological_age" else None,
            "status": "invalid_inputs",
            "value": None,
            "unit": spec.output_unit,
            "measured_at": latest_measured_at,
            "input_snapshot": input_snapshot,
            "missing_input_keys": [],
            "limitations": limitations + ["Valores censurados (<limite ou >limite) impedem cálculo determinístico."],
            "source_url": spec.source_url,
            "calculated_at": now_iso,
        }

    # Execução determinística dos algoritmos
    status = "calculated"
    computed_val: float | None = None

    try:
        # =====================================================================
        # 1. BIOLOGICAL AGE
        # =====================================================================
        if spec.id == "phenoage":
            chrono_age = float(input_snapshot["age_years"])
            pheno_input: PhenoAgeInput = {
                "chronological_age": chrono_age,
                "glucose_mgdl": float(input_snapshot["fasting_glucose_mg_dl"]),
                "creatinine_mgdl": float(input_snapshot["creatinine_mg_dl"]),
                "albumin_gdl": float(input_snapshot["albumin_g_dl"]),
                "hscrp_mgl": float(input_snapshot["hs_crp_mg_l"]),
                "lymphocyte_pct": float(input_snapshot["lymphocytes_pct"]),
                "mcv_fl": float(input_snapshot["mcv_fl"]),
                "rdw_pct": float(input_snapshot["rdw_pct"]),
                "alk_phos_ul": float(input_snapshot["alp_u_l"]),
                "wbc_1000ul": float(input_snapshot["wbc_k_ul"]),
            }
            res = calculate_phenoage(pheno_input)
            if res.get("status") == "complete":
                computed_val = res["pheno_age"]
            else:
                status = "invalid_inputs"
                limitations.append(f"PhenoAge incompleto: {res.get('reason')}")

        elif spec.id == "phenoage_gap":
            pheno_val = float(input_snapshot["phenoage"])
            chrono_val = float(input_snapshot["age_years"])
            computed_val = round(pheno_val - chrono_val, 2)

        elif spec.id == "light_bioage":
            age = float(input_snapshot["age_years"])
            creat = float(input_snapshot["creatinine_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            crp = float(input_snapshot["hs_crp_mg_l"])

            if age <= 0 or creat <= 0 or glu <= 0 or crp < 0:
                status = "invalid_inputs"
                limitations.append("Insumos de Light BioAge devem ser estritamente positivos (CRP >= 0).")
            else:
                coefs = LIGHT_BIOAGE_COEFFICIENTS.get(cohort_clean, LIGHT_BIOAGE_COEFFICIENTS["nhanes"])
                # Conversão de glicose para mmol/L (mg/dL * 0.0555)
                glu_mmol = glu * 0.0555
                # Conversão de CRP conforme a coorte selecionada
                crp_term_val = crp / 10.0 if coefs["crp_unit"] == "mg/dL" else crp
                log_crp_val = math.log1p(crp_term_val)

                val = (
                    age * 1.0
                    + coefs["beta0"]
                    + coefs["creat"] * creat
                    + coefs["glucose_mmol"] * glu_mmol
                    + coefs["log_crp"] * log_crp_val
                )
                computed_val = round(val, 2)

        elif spec.id == "light_bioage_diff":
            light_val = float(input_snapshot["light_bioage"])
            chrono_val = float(input_snapshot["age_years"])
            computed_val = round(light_val - chrono_val, 2)

        elif spec.id == "gold_bioage":
            age = float(input_snapshot["age_years"])
            creat = float(input_snapshot["creatinine_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            mcv = float(input_snapshot["mcv_fl"])
            rdw = float(input_snapshot["rdw_pct"])
            alb = float(input_snapshot["albumin_g_dl"])
            alp = float(input_snapshot["alp_u_l"])
            lym = float(input_snapshot["lymphocytes_pct"])
            wbc = float(input_snapshot["wbc_k_ul"])
            ggt = float(input_snapshot["ggt_u_l"])

            if any(v <= 0 for v in [age, creat, glu, mcv, rdw, alb, alp, lym, wbc, ggt]):
                status = "invalid_inputs"
                limitations.append("Todos os biomarcadores do GOLD BioAge devem ser estritamente positivos (> 0).")
            else:
                coefs = GOLD_BIOAGE_COEFFICIENTS.get(cohort_clean, GOLD_BIOAGE_COEFFICIENTS["nhanes"])
                glu_mmol = glu * 0.0555
                val = (
                    age * 1.0
                    + coefs["beta0"]
                    + coefs["creat"] * creat
                    + coefs["glucose_mmol"] * glu_mmol
                    + coefs["mcv"] * mcv
                    + coefs["rdw"] * rdw
                    + coefs["albumin"] * alb
                    + coefs["alp"] * alp
                    + coefs["lymph"] * lym
                    + coefs["wbc"] * wbc
                    + coefs["ggt"] * ggt
                )
                computed_val = round(val, 2)

        elif spec.id == "gold_bioage_diff":
            gold_val = float(input_snapshot["gold_bioage"])
            chrono_val = float(input_snapshot["age_years"])
            computed_val = round(gold_val - chrono_val, 2)

        # =====================================================================
        # 2. METABOLIC & INSULIN
        # =====================================================================
        elif spec.id == "homa_ir":
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            ins = float(input_snapshot["fasting_insulin_uIU_ml"])
            if glu <= 0 or ins <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round((glu * ins) / 405.0, 2)

        elif spec.id == "quicki":
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            ins = float(input_snapshot["fasting_insulin_uIU_ml"])
            if glu <= 0 or ins <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(1.0 / (math.log10(ins) + math.log10(glu)), 3)

        elif spec.id == "mcauley_index":
            ins = float(input_snapshot["fasting_insulin_uIU_ml"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            if ins <= 0 or tg <= 0:
                status = "invalid_inputs"
            else:
                tg_mmol = tg / 88.57
                val = math.exp(2.63 - 0.28 * math.log(ins) - 0.31 * math.log(tg_mmol))
                computed_val = round(val, 2)

        elif spec.id == "tyg_index":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            if tg <= 0 or glu <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(math.log((tg * glu) / 2.0), 2)

        elif spec.id == "mets_ir":
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            weight = float(input_snapshot["weight_kg"])
            height = float(input_snapshot["height_cm"])
            if hdl <= 1.0 or glu <= 0 or tg <= 0 or weight <= 0 or height <= 0:
                status = "invalid_inputs"
            else:
                bmi = weight / ((height / 100.0) ** 2)
                computed_val = round((math.log(2.0 * glu + tg) * bmi) / math.log(hdl), 2)

        elif spec.id == "spise":
            hdl = float(input_snapshot["hdl_mg_dl"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            weight = float(input_snapshot["weight_kg"])
            height = float(input_snapshot["height_cm"])
            if hdl <= 0 or tg <= 0 or weight <= 0 or height <= 0:
                status = "invalid_inputs"
            else:
                bmi = weight / ((height / 100.0) ** 2)
                val = 600.0 * (hdl ** 0.185) / ((tg ** 0.2) * (bmi ** 1.338))
                computed_val = round(val, 2)

        elif spec.id == "tyg_bmi":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            weight = float(input_snapshot["weight_kg"])
            height = float(input_snapshot["height_cm"])
            if tg <= 0 or glu <= 0 or weight <= 0 or height <= 0:
                status = "invalid_inputs"
            else:
                tyg = math.log((tg * glu) / 2.0)
                bmi = weight / ((height / 100.0) ** 2)
                computed_val = round(tyg * bmi, 2)

        elif spec.id == "tyg_wc":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            wc = float(input_snapshot["waist_cm"])
            if tg <= 0 or glu <= 0 or wc <= 0:
                status = "invalid_inputs"
            else:
                tyg = math.log((tg * glu) / 2.0)
                computed_val = round(tyg * wc, 2)

        elif spec.id == "tyg_whtr":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            glu = float(input_snapshot["fasting_glucose_mg_dl"])
            wc = float(input_snapshot["waist_cm"])
            height = float(input_snapshot["height_cm"])
            if tg <= 0 or glu <= 0 or wc <= 0 or height <= 0:
                status = "invalid_inputs"
            else:
                tyg = math.log((tg * glu) / 2.0)
                whtr = wc / height
                computed_val = round(tyg * whtr, 2)

        elif spec.id == "estimated_average_glucose":
            hba1c = float(input_snapshot["hba1c_pct"])
            if hba1c <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(28.7 * hba1c - 46.7, 1)

        # =====================================================================
        # 3. INFLAMMATION, IMMUNITY & NUTRITION
        # =====================================================================
        elif spec.id == "nlr":
            neut = float(input_snapshot["neutrophils_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or neut < 0:
                status = "invalid_inputs"
            else:
                computed_val = round(neut / lymph, 2)

        elif spec.id == "plr":
            plt = float(input_snapshot["platelets_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or plt < 0:
                status = "invalid_inputs"
            else:
                computed_val = round(plt / lymph, 2)

        elif spec.id == "mlr":
            mono = float(input_snapshot["monocytes_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or mono < 0:
                status = "invalid_inputs"
            else:
                computed_val = round(mono / lymph, 2)

        elif spec.id == "sii":
            plt = float(input_snapshot["platelets_k_ul"])
            neut = float(input_snapshot["neutrophils_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or plt < 0 or neut < 0:
                status = "invalid_inputs"
            else:
                computed_val = round((plt * neut) / lymph, 2)

        elif spec.id == "siri":
            neut = float(input_snapshot["neutrophils_k_ul"])
            mono = float(input_snapshot["monocytes_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or neut < 0 or mono < 0:
                status = "invalid_inputs"
            else:
                computed_val = round((neut * mono) / lymph, 2)

        elif spec.id == "piv":
            neut = float(input_snapshot["neutrophils_k_ul"])
            plt = float(input_snapshot["platelets_k_ul"])
            mono = float(input_snapshot["monocytes_k_ul"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if lymph <= 0 or neut < 0 or plt < 0 or mono < 0:
                status = "invalid_inputs"
            else:
                computed_val = round((neut * plt * mono) / lymph, 2)

        elif spec.id == "car":
            crp = float(input_snapshot["hs_crp_mg_l"])
            alb = float(input_snapshot["albumin_g_dl"])
            if alb <= 0 or crp < 0:
                status = "invalid_inputs"
            else:
                computed_val = round(crp / alb, 3)

        elif spec.id == "cally":
            alb = float(input_snapshot["albumin_g_dl"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            crp = float(input_snapshot["hs_crp_mg_l"])
            if crp <= 0 or alb < 0 or lymph < 0:
                status = "invalid_inputs"
            else:
                computed_val = round((alb * lymph) / crp, 2)

        elif spec.id == "halp":
            hb = float(input_snapshot["hemoglobin_g_dl"])
            alb = float(input_snapshot["albumin_g_dl"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            plt = float(input_snapshot["platelets_k_ul"])
            if plt <= 0 or hb <= 0 or alb <= 0 or lymph <= 0:
                status = "invalid_inputs"
            else:
                # Conversão padrão para g/L (× 10)
                hb_gl = hb * 10.0
                alb_gl = alb * 10.0
                computed_val = round((hb_gl * alb_gl * lymph) / plt, 2)

        elif spec.id == "conut":
            alb = float(input_snapshot["albumin_g_dl"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            chol = float(input_snapshot["total_chol_mg_dl"])

            if alb <= 0 or lymph <= 0 or chol <= 0:
                status = "invalid_inputs"
            else:
                # 1. Albumina (g/dL)
                alb_pts = 0 if alb >= 3.5 else 2 if alb >= 3.0 else 4 if alb >= 2.5 else 6
                # 2. Linfócitos absolutos (/µL)
                lymph_count = lymph * 1000.0
                lymph_pts = 0 if lymph_count >= 1600 else 1 if lymph_count >= 1200 else 2 if lymph_count >= 800 else 3
                # 3. Colesterol Total (mg/dL)
                chol_pts = 0 if chol >= 180 else 1 if chol >= 140 else 2 if chol >= 100 else 3
                computed_val = float(alb_pts + lymph_pts + chol_pts)

        elif spec.id == "pni":
            alb = float(input_snapshot["albumin_g_dl"])
            lymph = float(input_snapshot["lymphocytes_k_ul"])
            if alb <= 0 or lymph <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(10.0 * alb + 5.0 * lymph, 2)

        # =====================================================================
        # 4. HEPATIC
        # =====================================================================
        elif spec.id == "fli":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            weight = float(input_snapshot["weight_kg"])
            height = float(input_snapshot["height_cm"])
            ggt = float(input_snapshot["ggt_u_l"])
            waist = float(input_snapshot["waist_cm"])
            if tg <= 0 or weight <= 0 or height <= 0 or ggt <= 0 or waist <= 0:
                status = "invalid_inputs"
            else:
                bmi = weight / ((height / 100.0) ** 2)
                logit = (
                    0.953 * math.log(tg)
                    + 0.139 * bmi
                    + 0.718 * math.log(ggt)
                    + 0.053 * waist
                    - 15.745
                )
                fli = (math.exp(logit) / (1.0 + math.exp(logit))) * 100.0
                computed_val = round(fli, 1)

        elif spec.id == "hsi":
            alt = float(input_snapshot["alt_u_l"])
            ast = float(input_snapshot["ast_u_l"])
            weight = float(input_snapshot["weight_kg"])
            height = float(input_snapshot["height_cm"])
            is_diabetic = bool(input_snapshot["diabetes"])
            is_female = bool(input_snapshot["sex"] == 0.0 or str(norm_dict["sex"].raw_value).upper() in {"F", "FEMALE", "MULHER"})

            if ast <= 0 or alt <= 0 or weight <= 0 or height <= 0:
                status = "invalid_inputs"
            else:
                bmi = weight / ((height / 100.0) ** 2)
                diab_pts = 2.0 if is_diabetic else 0.0
                sex_pts = 2.0 if is_female else 0.0
                computed_val = round(8.0 * (alt / ast) + bmi + diab_pts + sex_pts, 1)

        elif spec.id == "fib4":
            age = float(input_snapshot["age_years"])
            ast = float(input_snapshot["ast_u_l"])
            alt = float(input_snapshot["alt_u_l"])
            plt = float(input_snapshot["platelets_k_ul"])

            if age < 18:
                status = "out_of_scope"
                limitations.append("FIB-4 validado exclusivamente para adultos com idade >= 18 anos.")
            elif ast <= 0 or alt <= 0 or plt <= 0:
                status = "invalid_inputs"
            else:
                if age < 35 or age > 65:
                    limitations.append("Desempenho diagnóstico limitado fora da faixa etária de 35 a 65 anos.")
                computed_val = round((age * ast) / (plt * math.sqrt(alt)), 2)

        elif spec.id == "apri":
            ast = float(input_snapshot["ast_u_l"])
            plt = float(input_snapshot["platelets_k_ul"])
            uln = float(input_snapshot["ast_uln_u_l"])
            if uln <= 0 or plt <= 0 or ast <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(((ast / uln) * 100.0) / plt, 2)

        elif spec.id == "ast_alt_ratio":
            ast = float(input_snapshot["ast_u_l"])
            alt = float(input_snapshot["alt_u_l"])
            if alt <= 0 or ast <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(ast / alt, 2)

        # =====================================================================
        # 5. CARDIOVASCULAR & RENAL
        # =====================================================================
        elif spec.id == "aip":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            if tg <= 0 or hdl <= 0:
                status = "invalid_inputs"
            else:
                tg_mmol = tg / 88.57
                hdl_mmol = hdl / 38.67
                computed_val = round(math.log10(tg_mmol / hdl_mmol), 3)

        elif spec.id == "non_hdl_cholesterol":
            tot = float(input_snapshot["total_chol_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            computed_val = round(tot - hdl, 1)

        elif spec.id == "castelli_1":
            tot = float(input_snapshot["total_chol_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            if hdl <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(tot / hdl, 2)

        elif spec.id == "castelli_2":
            ldl = float(input_snapshot["ldl_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            if hdl <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(ldl / hdl, 2)

        elif spec.id == "tg_hdl_ratio":
            tg = float(input_snapshot["triglycerides_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            if hdl <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(tg / hdl, 2)

        elif spec.id == "egfr":
            creat = float(input_snapshot["creatinine_mg_dl"])
            age = float(input_snapshot["age_years"])
            is_female = bool(input_snapshot["sex"] == 0.0 or str(norm_dict["sex"].raw_value).upper() in {"F", "FEMALE", "MULHER"})

            if creat <= 0 or age <= 0:
                status = "invalid_inputs"
            else:
                kappa = 0.7 if is_female else 0.9
                alpha = -0.241 if is_female else -0.302
                mult = 1.012 if is_female else 1.0

                ratio = creat / kappa
                min_val = min(ratio, 1.0)
                max_val = max(ratio, 1.0)
                egfr = 142.0 * (min_val ** alpha) * (max_val ** -1.200) * (0.9938 ** age) * mult
                computed_val = round(egfr, 1)

        elif spec.id == "apob_apoa1_ratio":
            apob = float(input_snapshot["apob_mg_dl"])
            apoa1 = float(input_snapshot["apoa1_mg_dl"])
            if apoa1 <= 0 or apob <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(apob / apoa1, 2)

        elif spec.id == "remnant_cholesterol":
            tot = float(input_snapshot["total_chol_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            ldl = float(input_snapshot["ldl_mg_dl"])
            computed_val = round(tot - hdl - ldl, 1)

        # =====================================================================
        # 6. BODY COMPOSITION & ADIPOSITY
        # =====================================================================
        elif spec.id == "bmi":
            w = float(input_snapshot["weight_kg"])
            h = float(input_snapshot["height_cm"])
            if w <= 0 or h <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(w / ((h / 100.0) ** 2), 2)

        elif spec.id == "whtr":
            wc = float(input_snapshot["waist_cm"])
            h = float(input_snapshot["height_cm"])
            if wc <= 0 or h <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(wc / h, 3)

        elif spec.id == "bri":
            wc = float(input_snapshot["waist_cm"])
            h = float(input_snapshot["height_cm"])
            if wc <= 0 or h <= 0:
                status = "invalid_inputs"
            else:
                ecc = 1.0 - (wc / (math.pi * h)) ** 2
                if ecc < 0:
                    status = "invalid_inputs"
                    limitations.append("Circunferência da cintura fora dos limites físicos do elipsoide.")
                else:
                    computed_val = round(364.2 - 365.5 * math.sqrt(ecc), 2)

        elif spec.id == "wwi":
            wc = float(input_snapshot["waist_cm"])
            w = float(input_snapshot["weight_kg"])
            if wc <= 0 or w <= 0:
                status = "invalid_inputs"
            else:
                computed_val = round(wc / math.sqrt(w), 2)

        elif spec.id == "rfm":
            wc = float(input_snapshot["waist_cm"])
            h = float(input_snapshot["height_cm"])
            is_female = bool(input_snapshot["sex"] == 0.0 or str(norm_dict["sex"].raw_value).upper() in {"F", "FEMALE", "MULHER"})
            if wc <= 0 or h <= 0:
                status = "invalid_inputs"
            else:
                base = 76.0 if is_female else 64.0
                computed_val = round(base - (20.0 * (h / wc)), 1)

        elif spec.id == "vai":
            w = float(input_snapshot["weight_kg"])
            h = float(input_snapshot["height_cm"])
            wc = float(input_snapshot["waist_cm"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            is_female = bool(input_snapshot["sex"] == 0.0 or str(norm_dict["sex"].raw_value).upper() in {"F", "FEMALE", "MULHER"})

            if w <= 0 or h <= 0 or wc <= 0 or tg <= 0 or hdl <= 0:
                status = "invalid_inputs"
            else:
                bmi = w / ((h / 100.0) ** 2)
                tg_mmol = tg / 88.57
                hdl_mmol = hdl / 38.67
                if is_female:
                    vai = (wc / (36.58 + (1.89 * bmi))) * (tg_mmol / 0.81) * (1.52 / hdl_mmol)
                else:
                    vai = (wc / (39.68 + (1.88 * bmi))) * (tg_mmol / 1.03) * (1.31 / hdl_mmol)
                computed_val = round(vai, 2)

        elif spec.id == "lap":
            wc = float(input_snapshot["waist_cm"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            is_female = bool(input_snapshot["sex"] == 0.0 or str(norm_dict["sex"].raw_value).upper() in {"F", "FEMALE", "MULHER"})

            if tg <= 0 or wc <= 0:
                status = "invalid_inputs"
            else:
                tg_mmol = tg / 88.57
                k = 58.0 if is_female else 65.0
                computed_val = round((wc - k) * tg_mmol, 2)

        elif spec.id == "cmi":
            wc = float(input_snapshot["waist_cm"])
            h = float(input_snapshot["height_cm"])
            tg = float(input_snapshot["triglycerides_mg_dl"])
            hdl = float(input_snapshot["hdl_mg_dl"])
            if wc <= 0 or h <= 0 or tg <= 0 or hdl <= 0:
                status = "invalid_inputs"
            else:
                whtr = wc / h
                computed_val = round(whtr * (tg / hdl), 2)

        # =====================================================================
        # 7. DIRECT BIOMARKERS
        # =====================================================================
        elif spec.id in {"total_testosterone", "hematocrit", "hemoglobin", "hba1c", "hs_crp"}:
            direct_key = spec.input_keys[0]
            val = float(input_snapshot[direct_key])
            computed_val = round(val, 2)

    except (ValueError, ZeroDivisionError, OverflowError) as exc:
        status = "invalid_inputs"
        limitations.append(f"Erro numérico no cálculo: {str(exc)}")

    return {
        "metric_id": spec.id,
        "algorithm_version": spec.algorithm_version,
        "cohort_variant": cohort_clean if spec.category == "biological_age" else None,
        "status": status,
        "value": computed_val if status == "calculated" else None,
        "unit": spec.output_unit,
        "measured_at": latest_measured_at,
        "input_snapshot": input_snapshot,
        "missing_input_keys": missing_keys,
        "limitations": limitations,
        "source_url": spec.source_url,
        "calculated_at": now_iso,
    }


def evaluate_all_metrics(
    raw_inputs: Mapping[str, Any],
    measured_at: str | None = None,
    cohort_variant: str = "nhanes",
    birthdate: str | None = None,
) -> dict[str, dict[str, Any]]:
    """Normaliza as entradas e calcula todas as métricas do catálogo compartilhando intermediários."""
    inputs_dict = dict(raw_inputs)

    # Cálculo da idade cronológica exata na data de referência (§10)
    ref_date = measured_at or date.today().isoformat()
    if birthdate and "age_years" not in inputs_dict and "chronological_age" not in inputs_dict:
        try:
            b_dt = date.fromisoformat(str(birthdate)[:10])
            m_dt = date.fromisoformat(str(ref_date)[:10])
            delta = (m_dt - b_dt).days
            if delta > 0:
                inputs_dict["age_years"] = round(delta / 365.2425, 2)
        except Exception:
            pass

    normalized = normalize_observation_inputs(inputs_dict, measured_at=ref_date)
    results: dict[str, dict[str, Any]] = {}
    calculated_at = datetime.now(timezone.utc).isoformat()

    # Passagem 1: Métricas primárias (biomarcadores diretos, geometria básica, HOMA, TyG, etc.)
    for metric_id, spec in DERIVED_METRICS_CATALOG.items():
        if spec.id not in {"phenoage_gap", "light_bioage_diff", "gold_bioage_diff"}:
            res = evaluate_metric(metric_id, normalized, cohort_variant=cohort_variant, calculated_at=calculated_at)
            results[metric_id] = res
            # Se foi calculada, alimenta o dicionário normalizado como intermediário compartilhável (§2.1)
            if res["status"] == "calculated" and res["value"] is not None:
                normalized[metric_id] = NormalizedInput(
                    canonical_key=metric_id,
                    value=float(res["value"]),
                    canonical_unit=spec.output_unit,
                    measured_at=ref_date,
                )

    # Passagem 2: Métricas secundárias que dependem de intermediários calculados (gaps de idade)
    for metric_id in ["phenoage_gap", "light_bioage_diff", "gold_bioage_diff"]:
        if metric_id in DERIVED_METRICS_CATALOG:
            res = evaluate_metric(metric_id, normalized, cohort_variant=cohort_variant, calculated_at=calculated_at)
            results[metric_id] = res

    return results


def build_observation_context_for_date(
    repo: Any,
    target_date: str,
    anthropometry_window_days: int = 7,
) -> tuple[dict[str, Any], list[str]]:
    """Monta o contexto clínico unificado para a data informada.

    Regras de integridade:
    - Exames laboratoriais devem pertencer estritamente à mesma `collected_at` (ou data ISO coincidente).
    - Medições antropométricas (peso, cintura, altura) são buscadas na mesma data ou dentro de ±7 dias.
    - Metadados clínicos (sexo, idade via birthdate) são lidos do perfil sem inventar defaults.
    """
    inputs: dict[str, Any] = {}
    limitations: list[str] = []

    profile = repo.get_user_profile() if hasattr(repo, "get_user_profile") else {}
    if profile:
        if profile.get("birthdate"):
            inputs["birthdate"] = profile["birthdate"]
            try:
                b_dt = date.fromisoformat(str(profile["birthdate"])[:10])
                t_dt = date.fromisoformat(str(target_date)[:10])
                delta_days = (t_dt - b_dt).days
                if delta_days > 0:
                    inputs["age_years"] = round(delta_days / 365.2425, 2)
            except Exception:
                pass
        if "age_years" not in inputs and profile.get("chronological_age") is not None:
            inputs["age_years"] = float(profile["chronological_age"])

        if profile.get("gender"):
            inputs["sex"] = profile["gender"]
        if profile.get("height_cm"):
            inputs["height_cm"] = float(profile["height_cm"])

        # Contexto clínico opcional (§2.1 / §10)
        for clinical_flag in [
            "diabetes", "hypertension", "current_smoker",
            "antihypertensive_treatment", "lipid_lowering_treatment", "prior_cvd"
        ]:
            if profile.get(clinical_flag) is not None:
                inputs[clinical_flag] = bool(profile[clinical_flag])

    # Busca exames laboratoriais da mesma data
    from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS
    labs = repo.get_lab_results(limit=1000, record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS)
    same_day_labs = [
        l for l in labs
        if l.get("collected_at") and str(l["collected_at"])[:10] == str(target_date)[:10]
    ]

    for lab in same_day_labs:
        key = lab.get("metric_key")
        val = lab.get("raw_value") if lab.get("raw_value") is not None else lab.get("value")
        unit = lab.get("raw_unit") or lab.get("unit")
        if key:
            inputs[key] = {
                "value": val,
                "unit": unit,
                "measured_at": lab.get("collected_at"),
            }

    # Pareamento de antropometria (peso, cintura, PA) na mesma data ou janela ±7 dias
    try:
        target_dt = date.fromisoformat(str(target_date)[:10])
    except (ValueError, TypeError):
        target_dt = date.today()

    # 1. Medidas de avaliações físicas
    if hasattr(repo, "get_physical_assessments"):
        try:
            assessments = repo.get_physical_assessments(limit=50)
            closest_ass: Any = None
            closest_diff = 9999
            for ass in assessments:
                dt_str = ass.get("assessment_date")
                if dt_str:
                    try:
                        a_dt = date.fromisoformat(str(dt_str)[:10])
                    except (ValueError, TypeError):
                        continue
                    diff = abs((a_dt - target_dt).days)
                    if diff <= anthropometry_window_days and diff < closest_diff:
                        closest_diff = diff
                        closest_ass = ass

            if closest_ass:
                if "weight_kg" not in inputs and closest_ass.get("weight_kg"):
                    inputs["weight_kg"] = float(closest_ass["weight_kg"])
                if "waist_cm" not in inputs and closest_ass.get("waist_cm"):
                    inputs["waist_cm"] = float(closest_ass["waist_cm"])
                if "height_cm" not in inputs and closest_ass.get("height_cm"):
                    inputs["height_cm"] = float(closest_ass["height_cm"])
                if closest_diff > 0:
                    limitations.append(
                        f"Medidas antropométricas pareadas da avaliação física de {closest_ass.get('assessment_date')} "
                        f"(deslocamento temporal de {closest_diff} dias em relação à coleta)."
                    )
        except Exception:
            pass

    # 2. Métricas diárias (daily_metrics) se ainda faltar peso ou cintura
    if hasattr(repo, "get_daily_metrics"):
        try:
            metrics = repo.get_daily_metrics(days=365)
            closest_m: Any = None
            closest_m_diff = 9999
            for m in metrics:
                dt_str = m.get("date_ref")
                if dt_str:
                    try:
                        m_dt = date.fromisoformat(str(dt_str)[:10])
                    except (ValueError, TypeError):
                        continue
                    diff = abs((m_dt - target_dt).days)
                    if diff <= anthropometry_window_days and diff < closest_m_diff:
                        closest_m_diff = diff
                        closest_m = m

            if closest_m:
                if "weight_kg" not in inputs and closest_m.get("weight_kg"):
                    inputs["weight_kg"] = float(closest_m["weight_kg"])
                if "waist_cm" not in inputs and closest_m.get("waist_cm"):
                    inputs["waist_cm"] = float(closest_m["waist_cm"])
                if "sbp_mmhg" not in inputs and closest_m.get("systolic_bp"):
                    inputs["sbp_mmhg"] = float(closest_m["systolic_bp"])
                if "dbp_mmhg" not in inputs and closest_m.get("diastolic_bp"):
                    inputs["dbp_mmhg"] = float(closest_m["diastolic_bp"])
                if "resting_hr_bpm" not in inputs and closest_m.get("rhr_bpm"):
                    inputs["resting_hr_bpm"] = float(closest_m["rhr_bpm"])
                if closest_m_diff > 0 and closest_m_diff != closest_diff:
                    limitations.append(
                        f"Sinais vitais pareados do registro diário de {closest_m.get('date_ref')} "
                        f"(deslocamento temporal de {closest_m_diff} dias)."
                    )
        except Exception:
            pass

    return inputs, limitations
