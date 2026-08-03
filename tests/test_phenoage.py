from longevidade.algorithms.phenoage import calculate_phenoage


def _healthy_phenoage_input():
    return {
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
    }


def test_phenoage_calculation():
    # Dados de um indivíduo jovem/saudável
    res = calculate_phenoage(_healthy_phenoage_input())
    assert res["status"] == "complete"
    assert res["chronological_age"] == 40.0
    assert "pheno_age" in res
    assert res["pheno_age"] < 40.0  # Para marcadores saudáveis, PhenoAge deve ser menor que a idade cronológica
    assert res["age_delta"] < 0
    assert res["missing_biomarkers"] == []


def test_phenoage_missing_biomarker_is_explicitly_incomplete():
    incomplete_input = _healthy_phenoage_input()
    incomplete_input.pop("albumin_gdl")

    res = calculate_phenoage(incomplete_input)

    assert res["status"] == "incomplete"
    assert res["pheno_age"] is None
    assert res["age_delta"] is None
    assert "albumin_gdl" in res["missing_biomarkers"]
