def test_get_and_put_daily_checkin(client):
    date_ref = "2026-08-05"

    # GET empty checkin
    resp1 = client.get(f"/api/checkins/{date_ref}")
    assert resp1.status_code == 200
    assert resp1.json()["energy_score"] is None

    # PUT checkin
    payload = {
        "date_ref": date_ref,
        "energy_score": 4,
        "mood_score": 5,
        "perceived_stress": 2,
        "soreness_score": 1,
        "caffeine_last_at": "13:30",
        "tags": ["cafe_pos_14h", "sauna"],
        "notes": "Treino leve pela manhã",
    }
    resp2 = client.put(f"/api/checkins/{date_ref}", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ok"

    # GET updated checkin
    resp3 = client.get(f"/api/checkins/{date_ref}")
    assert resp3.status_code == 200
    data = resp3.json()
    assert data["energy_score"] == 4
    assert data["mood_score"] == 5
    assert data["caffeine_last_at"] == "13:30"
    assert "sauna" in data["tags"]
    assert data["notes"] == "Treino leve pela manhã"
