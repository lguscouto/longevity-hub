from longevidade.calculators.energy_and_stress import calculate_energy_bank
from longevidade.calculators.circadian import calculate_circadian_windows


def test_calculate_energy_bank():
    metric = {"sleep_minutes": 480, "hrv_ms": 50, "rhr_bpm": 55, "steps": 8000, "training_load_daily": 50}
    res = calculate_energy_bank(metric)
    assert res["status"] == "ok"
    assert 0 <= res["current_level"] <= 100
    assert "recommendation" in res


def test_calculate_energy_bank_missing_rhr_returns_unavailable():
    metric = {"sleep_minutes": 480, "hrv_ms": 40}  # No RHR
    res = calculate_energy_bank(metric)
    assert res["status"] == "unavailable"
    assert res["current_level"] is None


def test_calculate_circadian_windows():
    res = calculate_circadian_windows("07:00", "23:00")
    assert res["caffeine_cutoff_time"] == "13:00"
    assert res["wind_down_start_time"] == "21:00"
