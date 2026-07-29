from longevidade.algorithms.phenoage import calculate_phenoage

def test_phenoage_calculation():
    # Dados de um indivíduo jovem/saudável
    healthy_input = {
        "chronological_age": 40.0,
        "glucose_mgdl": 85.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.7,
        "hscrp_mgl": 0.3,
        "lymphocyte_pct": 32.0,
        "mcv_fl": 88.0,
        "rdw_pct": 12.0,
        "alk_phos_ul": 55.0,
        "wbc_1000ul": 5.2
    }

    res = calculate_phenoage(healthy_input)
    assert res["chronological_age"] == 40.0
    assert "pheno_age" in res
    assert res["pheno_age"] < 40.0  # Para marcadores saudáveis, PhenoAge deve ser menor que a idade cronológica
    assert res["age_delta"] < 0
