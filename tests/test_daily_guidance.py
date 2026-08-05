from longevidade.algorithms.daily_guidance import generate_daily_guidance


def test_generate_daily_guidance_insufficient_data():
    res = generate_daily_guidance(None, [])
    assert res["state"] == "insufficient_data"
    assert res["confidence"] == "unavailable"


def test_generate_daily_guidance_optimal():
    today = {"date_ref": "2026-08-05", "hrv_ms": 45.0, "rhr_bpm": 55.0, "sleep_minutes": 480}
    history = [
        {"date_ref": f"2026-08-0{i}", "hrv_ms": 40.0, "rhr_bpm": 58.0, "sleep_minutes": 420}
        for i in range(1, 8)
    ]
    res = generate_daily_guidance(today, history)
    assert res["state"] in ["optimal", "moderate"]
    assert res["score"] >= 60
    assert isinstance(res["factors"], list)
