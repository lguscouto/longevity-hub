def test_get_daily_quality_summary(client):
    response = client.get("/api/quality/daily?date_ref=2026-08-05")
    assert response.status_code == 200
    data = response.json()
    assert data["date_ref"] == "2026-08-05"
    assert "confidence" in data
    assert "coverage_pct" in data
    assert "metrics_available" in data
    assert "metrics_expected" in data
    assert isinstance(data["items"], list)
