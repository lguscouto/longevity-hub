"""
Testes de balanceamento de covariáveis e detecção de viés para N-of-1 e Análise Antes vs. Depois.
Respeita estritamente o AGENTS.md injetando o fixture client: TestClient.
"""

from fastapi.testclient import TestClient

from longevidade.context.confounders import (
    calculate_continuous_standardized_diff,
    calculate_proportion_standardized_diff,
)


def test_standardized_diff_math():
    """Testa os cálculos matemáticos de Cohen's d para variáveis contínuas e binárias."""
    # Contínua
    c_vals = [10.0, 12.0, 14.0, 10.0]
    t_vals = [20.0, 22.0, 24.0, 20.0]
    c_m, t_m, delta_pct, d = calculate_continuous_standardized_diff(c_vals, t_vals)
    assert c_m == 11.5
    assert t_m == 21.5
    assert delta_pct > 80.0
    assert d > 3.0  # Efeito massivo

    # Proporções
    p_c, p_t, d_pct, d_prop = calculate_proportion_standardized_diff(
        control_count=1, control_total=10, treatment_count=5, treatment_total=10
    )
    assert p_c == 10.0
    assert p_t == 50.0
    assert d_pct == 400.0
    assert abs(d_prop) >= 0.8  # Efeito grande


def test_n_of_1_confounders_balanced_vs_imbalanced(client: TestClient):
    """Verifica detecção de viés em experimento N-of-1 (cenário balanceado vs com álcool/treino)."""
    # 1. Popula 14 dias de controle (01 a 14) e 14 dias de intervenção (15 a 28)
    for day in range(1, 29):
        d_str = f"2026-08-{day:02d}"
        hrv = 50.0 if day <= 14 else 62.0
        client.post(
            "/api/metrics",
            json={
                "date_ref": d_str,
                "hrv_ms": hrv,
                "sleep_minutes": 460,
                "rhr_bpm": 60.0,
            },
        )

    # 2. Cria o experimento N-of-1
    exp_res = client.post(
        "/api/n-of-1",
        json={
            "title": "Teste Magnésio Treonato",
            "hypothesis": "Melhora no HRV",
            "metric_key": "hrv_ms",
            "control_start": "2026-08-01",
            "control_end": "2026-08-14",
            "treatment_start": "2026-08-15",
            "treatment_end": "2026-08-28",
        },
    )
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert exp_data["saved"] is True
    exp_id = exp_data["id"]

    # 3. Consulta balanço de covariáveis antes de introduzir viés (deve estar balanceado)
    bal_res = client.get(f"/api/context/n-of-1/{exp_id}/confounders")
    assert bal_res.status_code == 200
    bal_data = bal_res.json()

    assert bal_data["experiment_id"] == exp_id
    assert bal_data["has_severe_confounding"] is False
    assert "Covariáveis balanceadas" in bal_data["warning_summary"]
    assert "não confirma causalidade" in bal_data["disclaimer"]

    # 4. Introduz alteração exógena acentuada no período de intervenção (4 eventos de álcool)
    for d in ("2026-08-16", "2026-08-19", "2026-08-22", "2026-08-25"):
        client.post(
            "/api/timeline/events",
            json={
                "timestamp": f"{d}T21:00:00Z",
                "date_ref": d,
                "event_type": "alcohol",
                "category": "lifestyle",
                "title": "Consumo de vinho",
                "metadata": {"servings": 3},
            },
        )

    # 5. Reconsulta o balanço de covariáveis: deve apontar viés severo por álcool
    bal_res_after = client.get(f"/api/context/n-of-1/{exp_id}/confounders")
    assert bal_res_after.status_code == 200
    bal_data_after = bal_res_after.json()

    assert bal_data_after["has_severe_confounding"] is True
    assert bal_data_after["imbalanced_factors_count"] >= 1
    assert "Resultado com possível confundidor" in bal_data_after["warning_summary"]
    assert "álcool" in bal_data_after["warning_summary"].lower()
    assert "não pode ser atribuída exclusivamente ao protocolo" in bal_data_after["warning_summary"]

    # Verifica os itens de covariáveis
    keys = {cov["key"]: cov for cov in bal_data_after["covariates"]}
    assert "alcohol_frequency" in keys
    assert keys["alcohol_frequency"]["is_imbalanced"] is True


def test_before_after_intervention_analysis(client: TestClient):
    """Testa análise Antes vs. Depois de uma intervenção com balanço de confundidores."""
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository

    repo = LongevityRepository(get_db_path())
    # Cria uma intervenção
    int_id = repo.add_intervention(
        {
            "name": "Creatina Monohidratada",
            "category": "Suplementação",
            "start_date": "2026-07-15",
            "end_date": "2026-08-15",
            "dosage": "5g",
            "target_metric": "hrv_ms",
            "notes": "Protocolo de saturação",
        }
    )

    # Popula dados diários de 2026-07-01 a 2026-07-31
    for day in range(1, 32):
        d_str = f"2026-07-{day:02d}"
        hrv = 48.0 if day < 15 else 58.0
        client.post(
            "/api/metrics",
            json={
                "date_ref": d_str,
                "hrv_ms": hrv,
                "sleep_minutes": 450,
                "rhr_bpm": 62.0,
            },
        )

    resp = client.get(f"/api/context/before-after/{int_id}?days_before=14&days_after=14")
    assert resp.status_code == 200
    data = resp.json()

    assert data["intervention_id"] == int_id
    assert data["intervention_name"] == "Creatina Monohidratada"
    assert data["target_metric"] == "hrv_ms"
    assert data["metric_comparison"] is not None
    assert data["metric_comparison"]["treatment_mean"] > data["metric_comparison"]["control_mean"]
    assert "confounder_report" in data
    assert data["confounder_report"]["disclaimer"] is not None


def test_custom_confounders_post(client: TestClient):
    """Testa endpoint dinâmico de balanceamento entre datas arbitrárias."""
    payload = {
        "control_start": "2026-06-01",
        "control_end": "2026-06-14",
        "treatment_start": "2026-06-15",
        "treatment_end": "2026-06-28",
    }
    resp = client.post("/api/context/confounders/balance", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "covariates" in data
    assert len(data["covariates"]) >= 4
    assert data["control_period"]["days"] == 14
    assert data["treatment_period"]["days"] == 14


def test_nonexistent_confounder_entities_return_404(client: TestClient):
    """Garante que IDs inexistentes retornam 404 Not Found."""
    resp_n1 = client.get("/api/context/n-of-1/99999/confounders")
    assert resp_n1.status_code == 404

    resp_ba = client.get("/api/context/before-after/99999")
    assert resp_ba.status_code == 404
