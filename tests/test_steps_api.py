import base64
import json
from datetime import datetime
from fastapi.testclient import TestClient

from backend.app.config import get_db_path
from backend.app.routers.steps import APP_TIMEZONE
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_steps_analytics_empty_db(client: TestClient):
    """Garante que a rota retorne estrutura consistente mesmo sem dados no banco."""
    resp = client.get("/api/steps/analytics")
    assert resp.status_code == 200
    data = resp.json()

    assert "summary" in data
    assert data["summary"]["total_days"] == 0
    assert data["summary"]["total_steps"] == 0
    assert data["summary"]["overall_avg_steps"] == 0
    assert data["weekly_stats"] == []
    assert len(data["weekday_averages"]) == 7
    assert len(data["hourly_distribution"]) == 24
    assert data["monthly_stats"] == []
    assert data["daily_records"] == []
    assert data["trend"]["direction"] == "stable"


def test_steps_analytics_with_data_and_ignores_zero_step_days(client: TestClient):
    """Testa cálculo de métricas, médias semanais, mensais e ignora dias com 0 passos."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Inserir métricas sintéticas cobrindo 3 dias válidos e 1 dia zerado (sem uso do relógio)
    test_metrics = [
        {"date_ref": "2026-10-19", "steps": 0, "calories": 0, "source": "Zepp"},
        {"date_ref": "2026-10-20", "steps": 9500, "calories": 420, "source": "Zepp"},
        {"date_ref": "2026-10-21", "steps": 12000, "calories": 530, "source": "Zepp"},
        {"date_ref": "2026-10-22", "steps": 7000, "calories": 310, "source": "Zepp"},
    ]
    for m in test_metrics:
        repo.upsert_daily_metric(m)

    resp = client.get("/api/steps/analytics")
    assert resp.status_code == 200
    data = resp.json()

    summary = data["summary"]
    assert summary["total_days"] == 3
    assert summary["total_steps"] == 9500 + 12000 + 7000  # 28500
    assert summary["overall_avg_steps"] == round(28500 / 3)  # 9500
    assert summary["max_steps"] == 12000
    assert summary["max_steps_date"] == "2026-10-21"
    assert summary["min_steps"] == 7000
    assert summary["min_steps_date"] == "2026-10-22"

    # Médias mensais
    assert len(data["monthly_stats"]) == 1
    m_stat = data["monthly_stats"][0]
    assert m_stat["month"] == "2026-10"
    assert m_stat["total_steps"] == 28500
    assert m_stat["days_recorded"] == 3
    assert m_stat["max_steps"] == 12000

    # Médias semanais
    assert len(data["weekly_stats"]) == 1
    w_stat = data["weekly_stats"][0]
    assert w_stat["total_steps"] == 28500
    assert w_stat["days_recorded"] == 3

    # Dias da semana (2026-10-20 é Terça-feira=1, 21=Quarta=2, 22=Quinta=3)
    terca = next(item for item in data["weekday_averages"] if item["weekday"] == 1)
    assert terca["avg_steps"] == 9500
    assert terca["days_count"] == 1

    # Registros diários (ordem DESC)
    assert len(data["daily_records"]) == 3
    assert data["daily_records"][0]["date_ref"] == "2026-10-22"
    assert data["daily_records"][1]["date_ref"] == "2026-10-21"
    assert data["daily_records"][2]["date_ref"] == "2026-10-20"


def test_steps_analytics_incomplete_today_preserves_streak_and_min(client: TestClient):
    """Garante que o dia de hoje ainda em andamento não zere o streak conquistado até ontem nem vire o min_steps."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    today_str = datetime.now(APP_TIMEZONE).date().isoformat()
    repo.upsert_daily_metric({"date_ref": "2026-10-24", "steps": 9000, "source": "Zepp"})
    repo.upsert_daily_metric({"date_ref": "2026-10-25", "steps": 10000, "source": "Zepp"})
    repo.upsert_daily_metric({"date_ref": today_str, "steps": 250, "source": "Zepp"})

    resp = client.get("/api/steps/analytics")
    assert resp.status_code == 200
    data = resp.json()

    summary = data["summary"]
    # O streak de 2 dias (24 e 25/10) deve ser preservado mesmo com hoje tendo apenas 250 passos
    assert summary["current_streak_goal_days"] == 2
    assert summary["min_steps"] == 9000
    assert data["daily_records"][0]["is_today_in_progress"] is True


def test_steps_analytics_alias_endpoint(client: TestClient):
    """Verifica se o alias /api/metrics/steps/analytics funciona identicamente."""
    resp = client.get("/api/metrics/steps/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "trend" in data
    assert "weekly_stats" in data


def test_steps_analytics_zepp_enrichment_and_hourly_stages(client: TestClient, tmp_path, monkeypatch):
    """Verifica se informações de band_data.json enriquecem os registros diários e extraem distribuição horária."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    repo.upsert_daily_metric({"date_ref": "2026-10-25", "steps": 10500, "source": "Zepp"})

    # Cria arquivo fake do band_data.json com estágio às 08h30 (minuto 510)
    fake_summary = {
        "goal": 8000,
        "stp": {
            "ttl": 10500,
            "dis": 8200,  # 8.2 km
            "cal": 450,
            "wk": 45,
            "rn": 20,
            "stage": [
                {"start": 510, "stop": 540, "mode": 3, "dis": 2500, "cal": 150, "step": 3200},
            ],
        },
    }
    encoded = base64.b64encode(json.dumps(fake_summary).encode("utf-8")).decode("utf-8")
    fake_band_data = {
        "data": [
            {
                "date_time": "2026-10-25",
                "summary": encoded,
            }
        ]
    }

    zepp_dir = tmp_path / "zepp_data"
    zepp_dir.mkdir(parents=True, exist_ok=True)
    band_file = zepp_dir / "band_data.json"
    band_file.write_text(json.dumps(fake_band_data), encoding="utf-8")

    monkeypatch.setattr("backend.app.routers.steps.ZEPP_DATA_DIR", zepp_dir)

    resp = client.get("/api/steps/analytics")
    assert resp.status_code == 200
    data = resp.json()

    rec = next((r for r in data["daily_records"] if r["date_ref"] == "2026-10-25"), None)
    assert rec is not None
    assert rec["distance_km"] == 8.2
    assert rec["calories"] == 450
    assert rec["walking_min"] == 45
    assert rec["running_min"] == 20
    assert rec["active_minutes"] == 65
    assert rec["goal"] == 8000
    assert rec["goal_met"] is True
    assert rec["status"] == "above_goal"

    # Verifica distribuição horária (510 // 60 == 8h)
    hour_8 = next(h for h in data["hourly_distribution"] if h["hour"] == 8)
    assert hour_8["avg_steps"] == 3200
