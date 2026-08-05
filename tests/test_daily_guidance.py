from longevidade.algorithms.daily_guidance import generate_daily_guidance


def test_generate_daily_guidance_insufficient_data():
    res = generate_daily_guidance(None, [])
    assert res["state"] == "insufficient_data"
    assert res["confidence"] == "unavailable"


def test_generate_daily_guidance_insufficient_history():
    today = {"date_ref": "2026-08-05", "hrv_ms": 45.0, "rhr_bpm": 55.0, "sleep_minutes": 480}
    # Only 3 historical records (less than minimum 7) -> must fail-closed
    history = [
        {"date_ref": f"2026-08-0{i}", "hrv_ms": 40.0, "rhr_bpm": 58.0, "sleep_minutes": 420}
        for i in range(1, 4)
    ]
    res = generate_daily_guidance(today, history)
    assert res["state"] == "insufficient_data"
    assert res["score"] is None


def test_generate_daily_guidance_optimal():
    today = {"date_ref": "2026-08-10", "hrv_ms": 45.0, "rhr_bpm": 55.0, "sleep_minutes": 480}
    history = [
        {"date_ref": f"2026-08-0{i}", "hrv_ms": 40.0, "rhr_bpm": 58.0, "sleep_minutes": 420}
        for i in range(1, 9)
    ]
    res = generate_daily_guidance(today, history)
    assert res["state"] in ["optimal", "moderate"]
    assert res["score"] >= 50
    assert isinstance(res["factors"], list)


def test_generate_daily_guidance_today_steps_only_with_valid_history():
    # Valid 7-day HRV history, but today has ONLY steps (no HRV, RHR, or sleep)
    today = {"date_ref": "2026-08-10", "steps": 1000}
    history = [
        {"date_ref": f"2026-08-0{i}", "hrv_ms": 40.0, "rhr_bpm": 58.0, "sleep_minutes": 420}
        for i in range(1, 9)
    ]
    res = generate_daily_guidance(today, history)
    assert res["state"] == "insufficient_data"
    assert res["score"] is None
    assert "Nenhuma medição atual de recuperação" in res["limitations"][0]
