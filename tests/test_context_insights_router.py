"""
Testes de integração para os endpoints do Contextual Insight Engine (/api/context).
Respeita estritamente o AGENTS.md injetando o fixture client: TestClient.
"""

from fastapi.testclient import TestClient


def test_explain_change_with_alcohol_factor(client: TestClient):
    # 1. Popula 20 dias de dados de métricas (HRV ~55 ms, sono ~450 min)
    for day in range(1, 21):
        d_str = f"2026-09-{day:02d}"
        client.post(
            "/api/metrics",
            json={
                "date_ref": d_str,
                "hrv_ms": 55.0,
                "sleep_minutes": 450,
                "rhr_bpm": 58.0,
            },
        )

    # 2. Insere dia 21 com queda de HRV (41 ms) e sono curto (360 min)
    client.post(
        "/api/metrics",
        json={
            "date_ref": "2026-09-21",
            "hrv_ms": 41.0,
            "sleep_minutes": 360,
            "rhr_bpm": 64.0,
        },
    )

    # 3. Registra evento de consumo de álcool na noite anterior (20/09 às 22:00)
    client.post(
        "/api/timeline/events",
        json={
            "timestamp": "2026-09-20T22:00:00Z",
            "date_ref": "2026-09-20",
            "time_ref": "22:00",
            "event_type": "alcohol",
            "category": "lifestyle",
            "title": "Consumo de álcool",
            "description": "3 taças de vinho",
            "source": "manual",
            "confidence": "high",
            "significance": "notável",
            "metadata": {"servings": 3},
        },
    )

    # 4. Chama o endpoint de explicação para a data 2026-09-21
    resp = client.get("/api/context/explain/hrv_ms?date=2026-09-21")
    assert resp.status_code == 200
    data = resp.json()

    assert data["metric"] == "hrv_ms"
    assert data["target_date"] == "2026-09-21"
    assert data["observed_value"] == 41.0
    assert data["significance"] == "significativa"
    assert data["analysis_confidence"] in ("moderada", "alta")
    assert "não confirma causalidade" in data["disclaimer"]

    # Fatores identificados devem conter o álcool e/ou déficit de sono
    factor_keys = [f["factor_key"] for f in data["factors"]]
    assert "alcohol" in factor_keys

    alcohol_factor = next(f for f in data["factors"] if f["factor_key"] == "alcohol")
    assert alcohol_factor["strength"] in ("forte", "moderada")
    assert alcohol_factor["strength_score"] >= 0.40


def test_synthesize_and_feedback_endpoints(client: TestClient):
    # 1. Popula dados mínimos
    for day in range(1, 10):
        client.post(
            "/api/metrics",
            json={
                "date_ref": f"2026-08-{day:02d}",
                "rhr_bpm": 58.0,
            },
        )
    client.post(
        "/api/metrics",
        json={
            "date_ref": "2026-08-10",
            "rhr_bpm": 66.0,
        },
    )

    # 2. Testa síntese (com fallback determinístico seguro se não houver chave de IA)
    synth_resp = client.post(
        "/api/context/explain/synthesize",
        json={"metric": "rhr_bpm", "date_ref": "2026-08-10"},
    )
    assert synth_resp.status_code == 200
    synth_data = synth_resp.json()
    assert "text" in synth_data
    assert len(synth_data["text"]) > 10

    # 3. Testa submissão de feedback
    fb_resp = client.post(
        "/api/context/feedback",
        json={
            "metric": "rhr_bpm",
            "date_ref": "2026-08-10",
            "is_helpful": True,
            "factor_key": "training_load",
            "user_notes": "Realmente fiz um treino de perna muito puxado no dia anterior.",
        },
    )
    assert fb_resp.status_code == 201
    assert fb_resp.json()["status"] == "ok"
    assert "feedback_id" in fb_resp.json()


def test_get_metric_changes(client: TestClient):
    # Popula alguns dias para detectar anomalias
    for day in range(1, 15):
        client.post("/api/metrics", json={"date_ref": f"2026-07-{day:02d}", "hrv_ms": 60.0})
    client.post("/api/metrics", json={"date_ref": "2026-07-15", "hrv_ms": 42.0})

    resp = client.get("/api/context/changes/hrv_ms")
    assert resp.status_code == 200
    changes = resp.json()
    assert isinstance(changes, list)
    dates = [c["date_ref"] for c in changes]
    assert "2026-07-15" in dates
