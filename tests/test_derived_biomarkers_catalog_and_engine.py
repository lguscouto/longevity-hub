import math
import pytest

from longevidade.metrics.derived_catalog import (
    DERIVED_METRICS_CATALOG,
    get_derived_metrics_by_category,
    get_derived_metric_definition,
)
from longevidade.metrics.unit_conversion import (
    CANONICAL_UNITS,
    convert_biomarker_unit,
    derive_bun_from_urea,
    derive_lymphocyte_count,
    derive_lymphocyte_percent,
    NormalizedInput,
)
from longevidade.ingestion.lab_normalization import parse_numeric_or_censored
from longevidade.algorithms.phenoage import calculate_phenoage
from longevidade.metrics.engine import evaluate_metric, evaluate_all_metrics


def test_derived_catalog_integrity():
    assert len(DERIVED_METRICS_CATALOG) >= 64

    specs = list(DERIVED_METRICS_CATALOG.values())
    ids = [m.id for m in specs]
    assert len(ids) == len(set(ids))

    valid_categories = {
        "biological_age",
        "metabolic_insulin",
        "inflammation_immune_nutrition",
        "hepatic",
        "cardiovascular_renal",
        "body_composition",
        "direct_biomarkers",
    }

    for spec in specs:
        assert spec.id, "id não pode ser vazio"
        assert spec.display_name, f"display_name vazio em {spec.id}"
        assert spec.category in valid_categories, f"Categoria inválida {spec.category} em {spec.id}"
        assert spec.evidence_level, f"evidence_level ausente em {spec.id}"
        assert spec.algorithm_version, f"algorithm_version ausente em {spec.id}"
        assert spec.definition, f"definition ausente em {spec.id}"


def test_unit_conversion_and_controlled_derivations():
    # Glicose: mmol/L para mg/dL
    glu = convert_biomarker_unit("fasting_glucose", 5.0, "mmol/L")
    assert pytest.approx(glu.value, rel=1e-3) == 90.089

    # Creatinina: umol/L para mg/dL
    creat = convert_biomarker_unit("creatinine", 88.4, "umol/L")
    assert pytest.approx(creat.value, rel=1e-3) == 1.0

    # Colesterol: mmol/L para mg/dL
    chol = convert_biomarker_unit("total_cholesterol", 5.0, "mmol/L")
    assert pytest.approx(chol.value, rel=1e-3) == 193.35

    # Triglicerídeos: mmol/L para mg/dL
    tg = convert_biomarker_unit("triglycerides", 1.0, "mmol/L")
    assert pytest.approx(tg.value, rel=1e-3) == 88.57

    # Albumina: g/L para g/dL
    alb = convert_biomarker_unit("albumin", 45.0, "g/L")
    assert alb.value == 4.5

    # hs-CRP: mg/dL para mg/L
    crp = convert_biomarker_unit("hscrp", 0.3, "mg/dL")
    assert crp.value == 3.0

    # Derivação BUN = Ureia / 2.14
    bun = derive_bun_from_urea(21.4)
    assert pytest.approx(bun.value, rel=1e-3) == 10.0

    # Derivação Linfócitos contagem = WBC * % / 100
    lym = derive_lymphocyte_count(7.0, 30.0)
    assert pytest.approx(lym.value, rel=1e-3) == 2.1

    # Derivação Linfócitos % = contagem / WBC * 100
    lym_pct = derive_lymphocyte_percent(2.1, 7.0)
    assert pytest.approx(lym_pct.value, rel=1e-3) == 30.0


def test_parse_numeric_or_censored():
    val, is_cens, op, raw_str = parse_numeric_or_censored(42.5)
    assert val == 42.5 and is_cens is False and op is None

    val, is_cens, op, raw_str = parse_numeric_or_censored("< 0.15")
    assert val == 0.15 and is_cens is True and op == "<"

    val, is_cens, op, raw_str = parse_numeric_or_censored(">= 1000")
    assert val == 1000.0 and is_cens is True and op == ">="

    val, is_cens, op, raw_str = parse_numeric_or_censored("  > 5.5 mg/dL ")
    assert val == 5.5 and is_cens is True and op == ">"

    # Notação científica e expressões de potência
    val, is_cens, op, raw_str = parse_numeric_or_censored("4.5e3")
    assert val == 4500.0 and is_cens is False and op is None

    val, is_cens, op, raw_str = parse_numeric_or_censored("< 1e-2")
    assert pytest.approx(val, rel=1e-3) == 0.01 and is_cens is True and op == "<"

    val, is_cens, op, raw_str = parse_numeric_or_censored("4.5 x 10^3")
    assert val == 4500.0 and is_cens is False and op is None

    val, is_cens, op, raw_str = parse_numeric_or_censored("texto inválido")
    assert val is None and is_cens is False and op is None


def test_phenoage_gompertz_levine_official():
    # Input saudável
    res = calculate_phenoage({
        "chronological_age": 40.0,
        "glucose_mgdl": 85.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.7,
        "hscrp_mgl": 0.3,
        "lymphocyte_pct": 32.0,
        "mcv_fl": 88.0,
        "rdw_pct": 12.0,
        "alk_phos_ul": 55.0,
        "wbc_1000ul": 5.2,
    })
    assert res["status"] == "complete"
    assert res["pheno_age"] < 40.0
    assert pytest.approx(res["pheno_age"], abs=0.5) == 24.51

    # Rejeição de valores <= 0 sem truncamento silencioso
    res_zero = calculate_phenoage({
        "chronological_age": 40.0,
        "glucose_mgdl": 0.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.7,
        "hscrp_mgl": 0.3,
        "lymphocyte_pct": 32.0,
        "mcv_fl": 88.0,
        "rdw_pct": 12.0,
        "alk_phos_ul": 55.0,
        "wbc_1000ul": 5.2,
    })
    assert res_zero["status"] == "incomplete"
    assert res_zero["reason"] == "invalid_biomarker_domain"
    assert res_zero["pheno_age"] is None


def test_light_bioage_hao_2025():
    # Caso de teste oficial: NHANES
    # age 50, creat 1 mg/dL, glu 5 mmol/L (90.09 mg/dL), crp 0.3 mg/dL (3.0 mg/L)
    # Valor esperado no repositório oficial Jerryhaom/GOLDBioAge: 50.43997842
    inputs_nhanes = {
        "chronological_age": 50.0,
        "creatinine": 1.0,
        "fasting_glucose": 90.089,
        "hscrp": 3.0,
    }
    res = evaluate_metric("light_bioage", inputs_nhanes, cohort_variant="nhanes")
    assert res["status"] == "calculated"
    assert pytest.approx(res["value"], abs=0.1) == 50.44

    # UK Biobank (crp 3.0 mg/L)
    res_ukb = evaluate_metric("light_bioage", inputs_nhanes, cohort_variant="ukb")
    assert res_ukb["status"] == "calculated"
    assert pytest.approx(res_ukb["value"], abs=0.1) == 53.38


def test_gold_bioage_hao_2025():
    # Caso de teste oficial: NHANES
    # age 50, alb 4, alp 80, creat 1, glu 5 mmol/L (90.09 mg/dL), lymph 30, mcv 90, rdw 13, wbc 7, ggt 25
    # Valor esperado: 51.10203967
    inputs_gold = {
        "chronological_age": 50.0,
        "albumin": 4.0,
        "alk_phos": 80.0,
        "creatinine": 1.0,
        "fasting_glucose": 90.089,
        "lymphocyte_pct": 30.0,
        "mcv": 90.0,
        "rdw": 13.0,
        "wbc": 7.0,
        "ggt": 25.0,
    }
    res = evaluate_metric("gold_bioage", inputs_gold, cohort_variant="nhanes")
    assert res["status"] == "calculated"
    assert pytest.approx(res["value"], abs=0.1) == 51.10

    # UKB
    res_ukb = evaluate_metric("gold_bioage", inputs_gold, cohort_variant="ukb")
    assert res_ukb["status"] == "calculated"
    assert pytest.approx(res_ukb["value"], abs=0.1) == 50.75


def test_metabolic_models():
    # HOMA-IR: (90 * 10) / 405 = 2.222
    inputs = {
        "fasting_glucose": 90.0,
        "fasting_insulin": 10.0,
        "triglycerides": 150.0,
        "hdl_cholesterol": 50.0,
        "hba1c": 5.5,
        "current_weight_kg": 70.0,
        "height_cm": 175.0,
        "waist_circumference_cm": 85.0,
    }

    homa = evaluate_metric("homa_ir", inputs)
    assert homa["status"] == "calculated"
    assert pytest.approx(homa["value"], rel=1e-2) == 2.22

    # QUICKI: 1 / (log10(90) + log10(10)) = 1 / (1.954 + 1.0) = 0.3385
    quicki = evaluate_metric("quicki", inputs)
    assert quicki["status"] == "calculated"
    assert pytest.approx(quicki["value"], rel=1e-2) == 0.338

    # TyG: ln(150 * 90 / 2) = ln(6750) = 8.817
    tyg = evaluate_metric("tyg_index", inputs)
    assert tyg["status"] == "calculated"
    assert pytest.approx(tyg["value"], rel=1e-2) == 8.82

    # TyG-BMI: TyG * BMI = 8.817 * (70 / 1.75^2) = 8.817 * 22.857 = 201.53
    tyg_bmi = evaluate_metric("tyg_bmi", inputs)
    assert tyg_bmi["status"] == "calculated"
    assert pytest.approx(tyg_bmi["value"], rel=1e-1) == 201.5

    # TyG-WC: TyG * WC = 8.817 * 85 = 749.47
    tyg_wc = evaluate_metric("tyg_wc", inputs)
    assert tyg_wc["status"] == "calculated"
    assert pytest.approx(tyg_wc["value"], abs=0.5) == 749.5

    # TyG-WHtR: TyG * (WC / Height) = 8.817 * (85 / 175) = 4.28
    tyg_whtr = evaluate_metric("tyg_whtr", inputs)
    assert tyg_whtr["status"] == "calculated"
    assert pytest.approx(tyg_whtr["value"], abs=0.1) == 4.28

    # McAuley: exp(2.63 - 0.28*ln(10) - 0.31*ln(150/88.57))
    mcauley = evaluate_metric("mcauley_index", inputs)
    assert mcauley["status"] == "calculated"
    assert mcauley["value"] > 0

    # METS-IR: ln(2*90 + 150) * 22.857 / ln(50) = ln(330) * 22.857 / 3.912 = 33.88
    mets = evaluate_metric("mets_ir", inputs)
    assert mets["status"] == "calculated"
    assert pytest.approx(mets["value"], abs=0.5) == 33.88

    # SPISE: 600 * 50^0.185 / (150^0.2 * 22.857^1.338)
    spise = evaluate_metric("spise", inputs)
    assert spise["status"] == "calculated"
    assert pytest.approx(spise["value"], abs=0.2) == 6.9

    # eAG (estimated Average Glucose): 28.7 * HbA1c - 46.7
    eag = evaluate_metric("estimated_average_glucose", inputs)
    assert eag["status"] == "calculated"
    assert pytest.approx(eag["value"], rel=1e-2) == (28.7 * 5.5 - 46.7)


def test_inflammation_immune_nutrition_models():
    inputs = {
        "neutrophils": 4.0,
        "lymphocytes_abs": 2.0,
        "monocytes": 0.5,
        "platelets": 250.0,
        "hscrp": 1.0,
        "albumin": 4.5,
        "hemoglobin": 15.0,
        "total_cholesterol": 190.0,
    }

    # NLR = 4.0 / 2.0 = 2.0
    nlr = evaluate_metric("nlr", inputs)
    assert nlr["status"] == "calculated"
    assert nlr["value"] == 2.0

    # PLR = 250.0 / 2.0 = 125.0
    plr = evaluate_metric("plr", inputs)
    assert plr["status"] == "calculated"
    assert plr["value"] == 125.0

    # MLR = 0.5 / 2.0 = 0.25
    mlr = evaluate_metric("mlr", inputs)
    assert mlr["status"] == "calculated"
    assert mlr["value"] == 0.25

    # SII = Platelets * Neutrophils / Lymphocytes = 250 * 4 / 2 = 500
    sii = evaluate_metric("sii", inputs)
    assert sii["status"] == "calculated"
    assert sii["value"] == 500.0

    # SIRI = (Neutrophils * Monocytes) / Lymphocytes = (4 * 0.5) / 2 = 1.0
    siri = evaluate_metric("siri", inputs)
    assert siri["status"] == "calculated"
    assert siri["value"] == 1.0

    # PIV = (Neutrophils * Platelets * Monocytes) / Lymphocytes = (4 * 250 * 0.5) / 2 = 250.0
    piv = evaluate_metric("piv", inputs)
    assert piv["status"] == "calculated"
    assert piv["value"] == 250.0

    # CAR = hsCRP / Albumin = 1.0 / 4.5 = 0.222
    car = evaluate_metric("car", inputs)
    assert car["status"] == "calculated"
    assert pytest.approx(car["value"], rel=1e-2) == 0.222

    # CALLY = (Albumin * Lymphocytes) / hsCRP = (4.5 * 2.0) / 1.0 = 9.0
    cally = evaluate_metric("cally", inputs)
    assert cally["status"] == "calculated"
    assert cally["value"] == 9.0

    # HALP = (Hb_gl * Alb_gl * Lymph) / Plt = (150 * 45 * 2.0) / 250 = 54.0
    halp = evaluate_metric("halp", inputs)
    assert halp["status"] == "calculated"
    assert halp["value"] == 54.0

    # PNI = 10 * Alb + 5 * Lymph = 10 * 4.5 + 5 * 2.0 = 55.0
    pni = evaluate_metric("pni", inputs)
    assert pni["status"] == "calculated"
    assert pni["value"] == 55.0

    # CONUT com valores normais (Alb >= 3.5: 0; Lymph >= 1.6k: 0; Chol >= 180: 0) = 0
    conut_normal = evaluate_metric("conut", inputs)
    assert conut_normal["status"] == "calculated"
    assert conut_normal["value"] == 0.0

    # CONUT com valores de fronteira (Alb=3.45: 2; Lymph=1.15k: 2; Chol=139.5: 2) = 6
    conut_border = evaluate_metric("conut", {
        "albumin": 3.45,
        "lymphocytes_abs": 1.15,
        "total_cholesterol": 139.5,
    })
    assert conut_border["status"] == "calculated"
    assert conut_border["value"] == 6.0


def test_hepatic_models():
    inputs = {
        "chronological_age": 45.0,
        "ast": 25.0,
        "alt": 30.0,
        "ggt": 35.0,
        "platelets": 220.0,
        "triglycerides": 140.0,
        "current_weight_kg": 80.0,
        "height_cm": 178.0,
        "waist_circumference_cm": 90.0,
        "biological_sex": "male",
        "diabetes": False,
    }

    # FIB-4: (Age * AST) / (Platelets * sqrt(ALT)) = (45 * 25) / (220 * sqrt(30))
    fib4 = evaluate_metric("fib4", inputs)
    assert fib4["status"] == "calculated"
    expected_fib4 = (45.0 * 25.0) / (220.0 * math.sqrt(30.0))
    assert pytest.approx(fib4["value"], abs=0.01) == expected_fib4

    # FIB-4 for age < 18 should be out_of_scope
    inputs_young = dict(inputs)
    inputs_young["chronological_age"] = 16.0
    fib4_young = evaluate_metric("fib4", inputs_young)
    assert fib4_young["status"] == "out_of_scope"

    # HSI (Hepatic Steatosis Index): 8 * (30/25) + (80 / 1.78^2) + 0 + 0 = 34.849 -> 34.8
    hsi = evaluate_metric("hsi", inputs)
    assert hsi["status"] == "calculated"
    assert pytest.approx(hsi["value"], abs=0.1) == 34.8

    # FLI (Fatty Liver Index): Bedogni 2006
    fli = evaluate_metric("fli", inputs)
    assert fli["status"] == "calculated"
    assert 0.0 <= fli["value"] <= 100.0

    # AST/ALT ratio (De Ritis): 25 / 30 = 0.83
    de_ritis = evaluate_metric("ast_alt_ratio", inputs)
    assert de_ritis["status"] == "calculated"
    assert pytest.approx(de_ritis["value"], rel=1e-2) == 0.83

    # APRI sem AST ULN padrão analítico deve estar bloqueado
    apri = evaluate_metric("apri", inputs)
    assert apri["status"] == "blocked_reference"
    assert any("ULN" in l or "definição" in l for l in apri["limitations"])

    # APRI com AST ULN informado pelo laboratório deve ser calculado
    inputs_with_uln = dict(inputs)
    inputs_with_uln["ast_uln"] = 40.0
    apri_calc = evaluate_metric("apri", inputs_with_uln)
    assert apri_calc["status"] == "calculated"
    # ((25 / 40) * 100) / 220 = 0.284
    assert pytest.approx(apri_calc["value"], abs=0.01) == 0.28


def test_cardiovascular_and_renal_models():
    inputs = {
        "chronological_age": 52.0,
        "biological_sex": "male",
        "creatinine": 0.95,
        "total_cholesterol": 210.0,
        "hdl_cholesterol": 50.0,
        "ldl_cholesterol": 130.0,
        "triglycerides": 150.0,
        "apob": 95.0,
        "apoa1": 140.0,
    }

    # Non-HDL = 210 - 50 = 160
    non_hdl = evaluate_metric("non_hdl_cholesterol", inputs)
    assert non_hdl["status"] == "calculated"
    assert non_hdl["value"] == 160.0

    # Castelli I = 210 / 50 = 4.2
    c1 = evaluate_metric("castelli_1", inputs)
    assert c1["status"] == "calculated"
    assert c1["value"] == 4.2

    # Castelli II = 130 / 50 = 2.6
    c2 = evaluate_metric("castelli_2", inputs)
    assert c2["status"] == "calculated"
    assert c2["value"] == 2.6

    # AIP = log10(150 / 88.57 / (50 / 38.67))
    aip = evaluate_metric("aip", inputs)
    assert aip["status"] == "calculated"
    tg_mmol = 150.0 / 88.57
    hdl_mmol = 50.0 / 38.67
    assert pytest.approx(aip["value"], abs=1e-3) == math.log10(tg_mmol / hdl_mmol)

    # CKD-EPI 2021 Masculino: 142 * min(0.95/0.9, 1)^-0.302 * max(0.95/0.9, 1)^-1.200 * 0.9938^52
    egfr = evaluate_metric("egfr", inputs)
    assert egfr["status"] == "calculated"
    assert egfr["value"] > 80.0

    # PREVENT CVD deve estar explicitamente bloqueado como blocked_reference
    prevent = evaluate_metric("prevent_cvd_10y", inputs)
    assert prevent["status"] == "blocked_reference"


def test_body_composition_models():
    inputs = {
        "current_weight_kg": 75.0,
        "height_cm": 175.0,
        "waist_circumference_cm": 84.0,
        "biological_sex": "male",
    }

    # BMI = 75 / 1.75^2 = 24.489
    bmi = evaluate_metric("bmi", inputs)
    assert bmi["status"] == "calculated"
    assert pytest.approx(bmi["value"], rel=1e-2) == 24.49

    # WHtR = 84 / 175 = 0.48
    whtr = evaluate_metric("whtr", inputs)
    assert whtr["status"] == "calculated"
    assert pytest.approx(whtr["value"], rel=1e-3) == 0.48

    # BRI: 364.2 - 365.5 * sqrt(1 - ( (84 / (2 * pi)) / (0.5 * 175) )^2 )
    bri = evaluate_metric("bri", inputs)
    assert bri["status"] == "calculated"
    assert bri["value"] > 0

    # RFM Masculino: 64 - (20 * 175 / 84) = 64 - 41.666 = 22.33
    rfm = evaluate_metric("rfm", inputs)
    assert rfm["status"] == "calculated"
    assert pytest.approx(rfm["value"], rel=1e-2) == 22.33

    # WWI = 84 / sqrt(75) = 9.70
    wwi = evaluate_metric("wwi", inputs)
    assert wwi["status"] == "calculated"
    assert pytest.approx(wwi["value"], rel=1e-2) == 9.70

    # VAI, LAP, CMI exigem TG e HDL
    inputs_lipid = dict(inputs)
    inputs_lipid["triglycerides"] = 150.0
    inputs_lipid["hdl_cholesterol"] = 50.0

    vai = evaluate_metric("vai", inputs_lipid)
    assert vai["status"] == "calculated"
    assert vai["value"] > 0

    lap = evaluate_metric("lap", inputs_lipid)
    assert lap["status"] == "calculated"
    # LAP Masculino: (84 - 65) * (150 / 88.57) = 19 * 1.693 = 32.18
    assert pytest.approx(lap["value"], rel=1e-2) == 32.18

    cmi = evaluate_metric("cmi", inputs_lipid)
    assert cmi["status"] == "calculated"
    # CMI: (84 / 175) * (150 / 50) = 0.48 * 3.0 = 1.44
    assert pytest.approx(cmi["value"], rel=1e-2) == 1.44


def test_missing_inputs_never_fabricates():
    # Sem insumos
    res = evaluate_metric("homa_ir", {})
    assert res["status"] == "missing_inputs"
    assert res["value"] is None
    assert any("glucose" in k for k in res["missing_input_keys"])
    assert any("insulin" in k for k in res["missing_input_keys"])

    # Apenas glicose presente
    res_half = evaluate_metric("homa_ir", {"fasting_glucose": 95.0})
    assert res_half["status"] == "missing_inputs"
    assert res_half["value"] is None
    assert any("insulin" in k for k in res_half["missing_input_keys"])
