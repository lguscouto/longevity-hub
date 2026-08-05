from longevidade.metrics.catalog import METRICS_CATALOG, get_metric_definition


def test_metric_catalog_contains_essential_keys():
    essential_keys = ["hrv_ms", "rhr_bpm", "steps", "sleep_minutes", "spo2_avg_pct", "respiratory_rate_rpm", "pai_score"]
    for key in essential_keys:
        assert key in METRICS_CATALOG
        defn = get_metric_definition(key)
        assert defn is not None
        assert defn.label != ""
        assert defn.unit != ""
        assert isinstance(defn.baseline_days, int)


def test_metric_catalog_directions():
    assert METRICS_CATALOG["hrv_ms"].higher_is_better is True
    assert METRICS_CATALOG["rhr_bpm"].higher_is_better is False
    assert METRICS_CATALOG["respiratory_rate_rpm"].higher_is_better is False
    assert METRICS_CATALOG["spo2_avg_pct"].higher_is_better is True
