from longevidade.algorithms.n_of_1 import analyze_n_of_1

def test_n_of_1_analysis():
    # 14 dias de controle (HRV média ~50 ms)
    control = [48, 52, 50, 49, 51, 50, 47, 53, 51, 49, 50, 52, 48, 50]
    # 14 dias de tratamento com melhora (HRV média ~65 ms)
    treatment = [63, 67, 65, 64, 66, 65, 62, 68, 66, 64, 65, 67, 63, 65]

    res = analyze_n_of_1(control, treatment)
    assert res["control_mean"] == 50.0
    assert res["treatment_mean"] == 65.0
    assert res["diff_mean"] == 15.0
    assert res["cohens_d"] > 1.5  # Efeito grande
    assert res["statistically_significant"] is True
    assert res["effect_interpretation"] == "Grande"
