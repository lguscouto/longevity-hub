from longevidade.calculators.cardio_ratios import calculate_cardiovascular_ratios
from longevidade.calculators.kdm_age import calculate_kdm_biological_age


def _synthetic_kdm_history():
    rows = []
    base_age = 30.0
    for step in range(4):
        age = base_age + step * 3.0
        rows.append(
            {
                "age": age,
                "glucose_mgdl": 86.0 + step * 0.7,
                "creatinine_mgdl": 0.82 + step * 0.01,
                "albumin_gdl": 4.8 - step * 0.03,
                "hscrp_mgl": 0.30 + step * 0.03,
                "rdw_pct": 11.9 + step * 0.08,
                "alk_phos_ul": 58.0 + step * 1.5,
                "wbc_1000ul": 5.1 + step * 0.08,
                "rhr_bpm": 50.0 + step * 0.4,
                "systolic_bp": 110.0 + step * 1.2,
            }
        )
    return rows


def test_kdm_biological_age_calculation():
    latest = {
        "glucose_mgdl": 88.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.7,
        "hscrp_mgl": 0.33,
        "rdw_pct": 12.1,
        "alk_phos_ul": 62.0,
        "wbc_1000ul": 5.4,
        "rhr_bpm": 52.0,
        "systolic_bp": 114.0,
    }
    res = calculate_kdm_biological_age(39.0, latest, historical_data=_synthetic_kdm_history())
    assert res["status"] == "complete"
    assert "kdm_age" in res
    assert "kdm_delta" in res
    assert res["biomarkers_count"] > 0
    assert isinstance(res["kdm_age"], float)
    assert res["missing_biomarkers"] == []


def test_cardiovascular_ratios():
    labs_map = {
        "apob": {"value": 58.0},
        "apoa1": {"value": 110.0},
        "tg": {"value": 75.0},
        "hdl": {"value": 65.0},
        "total_cholesterol": {"value": 160.0},
        "ldl": {"value": 80.0},
    }
    res = calculate_cardiovascular_ratios(labs_map)
    assert res["apob_apoa1_ratio"] == 0.53
    assert res["apob_apoa1_status"] == "Excelente (Protegido)"
    assert res["tg_hdl_ratio"] == 1.15
    assert res["tg_hdl_status"] == "Ótimo (Sensibilidade à Insulina Alta)"
    assert res["remnant_cholesterol"] == 15.0


def test_supplements_endpoints(client):
    response = client.get("/api/supplements")
    assert response.status_code == 200
    supps = response.json()
    assert isinstance(supps, list)
    assert len(supps) > 0


def test_supplement_update_and_audit_logs(client):
    add_payload = {
        "name": "Testosterona Gel 1%",
        "dosage": "50 mg",
        "category": "Hormônio",
        "timing": "Manhã",
    }
    res_add = client.post("/api/supplements", json=add_payload)
    assert res_add.status_code == 200
    supp_id = res_add.json()["id"]

    update_payload = {
        "supplement_id": supp_id,
        "dosage": "100 mg",
        "category": "Hormônio",
    }
    res_update = client.post("/api/supplements/update", json=update_payload)
    assert res_update.status_code == 200

    # Atualização via método PUT (como enviado pelo frontend SupplementsView)
    timing_update_payload = {
        "supplement_id": supp_id,
        "timing": "Noite",
    }
    res_timing = client.put("/api/supplements/update", json=timing_update_payload)
    assert res_timing.status_code == 200

    res_audit = client.get("/api/supplements/audit-logs")
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert isinstance(logs, list)
    assert len(logs) >= 3
    actions = [l["action_type"] for l in logs]
    assert "ADICIONADO" in actions
    assert "DOSE_ALTERADA" in actions
    assert "HORARIO_ALTERADO" in actions


def test_compliance_endpoints(client):
    payload = {
        "date_ref": "2026-07-29",
        "sleep_schedule_ok": True,
        "supplements_ok": True,
        "exercise_ok": True,
        "fasting_window_ok": True,
    }
    res_post = client.post("/api/compliance", json=payload)
    assert res_post.status_code == 200

    res_get = client.get("/api/compliance/history?days=7")
    assert res_get.status_code == 200
    history = res_get.json()
    assert isinstance(history, list)


def test_analyze_supplements_endpoint(client, monkeypatch):
    import backend.app.routers.ai as ai_module

    monkeypatch.setattr(
        ai_module,
        "generate_llm_response",
        lambda **kwargs: ("Análise simulada: pilha equilibrada com creatina pela manhã.", None),
    )
    monkeypatch.setattr(
        ai_module,
        "_require_provider_secret",
        lambda repo, provider, msg: "mock-key",
    )

    res = client.post("/api/supplements/analyze-ai", json={"date_ref": "2026-09-22"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "Análise simulada" in data["analysis"]
