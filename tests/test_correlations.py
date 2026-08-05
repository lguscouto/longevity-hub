from longevidade.analytics.correlations import calculate_spearman_correlation, analyze_metric_correlations


def test_calculate_spearman_correlation_monotonic():
    x = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
    y = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]
    rho, p_val = calculate_spearman_correlation(x, y)
    assert rho == 1.0
    assert p_val < 0.05


def test_analyze_metric_correlations_lag():
    recs = [
        {"date_ref": f"2026-08-{i:02d}", "steps": i * 1000, "hrv_ms": i * 5}
        for i in range(1, 15)
    ]
    corrs = analyze_metric_correlations(recs, target_metric="hrv_ms", max_lag_days=1)
    assert len(corrs) > 0
    assert corrs[0]["cause_metric"] == "steps"
