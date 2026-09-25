"""
Testes de integração para os endpoints da Timeline (/api/timeline).
Respeita estritamente o AGENTS.md injetando o fixture client: TestClient em cada função de teste.
"""

from fastapi.testclient import TestClient


def test_timeline_crud_and_feed(client: TestClient):
    # 1. Cria evento manual com preset de Álcool
    payload = {
        "event_type": "alcohol",
        "category": "lifestyle",
        "title": "Consumo de álcool",
        "description": "3 taças de vinho",
        "timestamp": "2026-09-24T22:30:00Z",
        "date_ref": "2026-09-24",
        "time_ref": "22:30",
        "source": "manual",
        "confidence": "high",
        "significance": "notável",
        "metadata": {"servings": 3, "drink_type": "vinho"},
    }
    resp = client.post("/api/timeline/events", json=payload)
    assert resp.status_code == 201
    created = resp.json()
    event_id = created["id"]
    assert created["event_type"] == "alcohol"
    assert created["date_ref"] == "2026-09-24"
    assert created["metadata"]["servings"] == 3

    # 2. Consulta feed da Timeline
    feed_resp = client.get("/api/timeline?start_date=2026-09-24&end_date=2026-09-24")
    assert feed_resp.status_code == 200
    feed = feed_resp.json()
    assert feed["total"] >= 1
    assert len(feed["items"]) >= 1
    assert len(feed["days"]) >= 1
    assert feed["days"][0]["date_ref"] == "2026-09-24"

    # 3. Atualiza evento manual
    patch_payload = {
        "description": "4 taças de vinho e jantar pesado",
        "metadata": {"servings": 4, "heavy_meal": True},
    }
    patch_resp = client.patch(f"/api/timeline/events/{event_id}", json=patch_payload)
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert "4 taças" in updated["description"]
    assert updated["metadata"]["servings"] == 4

    # 4. Remove evento manual
    del_resp = client.delete(f"/api/timeline/events/{event_id}")
    assert del_resp.status_code == 200

    # 5. Verifica que o evento não existe mais
    feed_after = client.get(f"/api/timeline?start_date=2026-09-24&end_date=2026-09-24").json()
    ids = [it["id"] for it in feed_after["items"]]
    assert event_id not in ids


def test_timeline_summaries_and_reconcile(client: TestClient):
    # 1. Dispara reconciliação
    rec_resp = client.post("/api/timeline/reconcile")
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    assert rec_data["status"] == "completed"

    # 2. Consulta status de reconciliação
    status_resp = client.get("/api/timeline/reconcile/status")
    assert status_resp.status_code == 200
    statuses = status_resp.json()
    assert isinstance(statuses, list)

    # 3. Consulta resumo semanal
    week_resp = client.get("/api/timeline/summary/weekly?limit_weeks=4")
    assert week_resp.status_code == 200
    weeks = week_resp.json()
    assert isinstance(weeks, list)

    # 4. Consulta resumo mensal
    month_resp = client.get("/api/timeline/summary/monthly?limit_months=3")
    assert month_resp.status_code == 200
    months = month_resp.json()
    assert isinstance(months, list)


def test_timeline_timezone_preference(client: TestClient):
    # 1. Consulta timezone atual
    tz_resp = client.get("/api/timeline/timezone")
    assert tz_resp.status_code == 200
    assert "timezone" in tz_resp.json()

    # 2. Atualiza timezone
    put_resp = client.put("/api/timeline/timezone", json={"timezone": "America/Sao_Paulo"})
    assert put_resp.status_code == 200
    assert put_resp.json()["timezone"] == "America/Sao_Paulo"
