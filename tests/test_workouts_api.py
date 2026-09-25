from __future__ import annotations

import json
from pathlib import Path
import pytest
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db


def test_get_workouts_returns_empty_list_when_no_workouts(client, tmp_path, monkeypatch):
    import backend.app.routers.workouts as workouts_router
    empty_zepp = tmp_path / "empty_zepp"
    empty_zepp.mkdir()
    monkeypatch.setattr(workouts_router, "ZEPP_DATA_DIR", empty_zepp)

    res = client.get("/api/workouts")
    assert res.status_code == 200
    assert res.json() == []



def test_get_workouts_with_data_and_filters(client, tmp_path, monkeypatch):
    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sample_workouts = [
        {
            "id": "1001",
            "workout_date": "2026-08-15",
            "workout_time": "08:30",
            "category": "Corrida",
            "activity_type": "Corrida",
            "duration_min": 35.0,
            "calories": 300,
            "distance_km": 5.0,
            "avg_hr": 150,
            "max_hr": 170,
            "training_effect": 35,
            "steps": 4500,
            "city": "São Paulo",
            "device": "Amazfit Band 7",
            "source": "Zepp",
        },
        {
            "id": "1002",
            "workout_date": "2026-08-16",
            "workout_time": "09:00",
            "category": "Ciclismo",
            "activity_type": "Ciclismo",
            "duration_min": 50.0,
            "calories": 400,
            "distance_km": 15.0,
            "avg_hr": 140,
            "max_hr": 160,
            "training_effect": 30,
            "steps": 0,
            "city": "São Paulo",
            "device": "Amazfit Band 7",
            "source": "Zepp",
        },
        {
            "id": "1003",
            "workout_date": "2026-08-17",
            "workout_time": "18:00",
            "category": "Treino Força",
            "activity_type": "Treino Força",
            "duration_min": 45.0,
            "calories": 250,
            "distance_km": 0.0,
            "avg_hr": 120,
            "max_hr": 145,
            "training_effect": 25,
            "steps": 1000,
            "city": "Campinas",
            "device": "Amazfit Band 7",
            "source": "Zepp",
        },
    ]

    inserted = repo.upsert_workouts(sample_workouts)
    assert inserted == 3

    # Busca geral ordenada (mais recente primeiro: 2026-08-17)
    res = client.get("/api/workouts")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 3
    assert items[0]["id"] == "1003"
    assert items[1]["id"] == "1002"
    assert items[2]["id"] == "1001"

    # Filtro por categoria
    res_corrida = client.get("/api/workouts?category=Corrida")
    assert res_corrida.status_code == 200
    items_corrida = res_corrida.json()
    assert len(items_corrida) == 1
    assert items_corrida[0]["category"] == "Corrida"
    assert items_corrida[0]["id"] == "1001"

    # Filtro por data
    res_date = client.get("/api/workouts?start_date=2026-08-16&end_date=2026-08-17")
    assert res_date.status_code == 200
    items_date = res_date.json()
    assert len(items_date) == 2
    assert [it["id"] for it in items_date] == ["1003", "1002"]

    # Filtro com limit
    res_limit = client.get("/api/workouts?limit=1")
    assert res_limit.status_code == 200
    assert len(res_limit.json()) == 1
    assert res_limit.json()[0]["id"] == "1003"


def test_get_workouts_lazy_load_fallback(client, tmp_path, monkeypatch):
    """Quando o banco está vazio mas workout_history.json existe, popula via lazy-load."""
    zepp_dir = tmp_path / "zepp_data"
    zepp_dir.mkdir(parents=True, exist_ok=True)

    fake_history = {
        "code": 1,
        "message": "success",
        "data": {
            "summary": [
                {
                    "trackid": "1787006220",
                    "type": 1,
                    "run_time": "1800",
                    "calorie": "200",
                    "dis": "3000",
                    "avg_heart_rate": "135",
                    "max_heart_rate": "155",
                    "te": 28,
                    "total_step": 3600,
                    "city": "Santos",
                    "source": "run.huami.com",
                }
            ]
        },
    }
    (zepp_dir / "workout_history.json").write_text(json.dumps(fake_history), encoding="utf-8")

    import backend.app.routers.workouts as workouts_router
    monkeypatch.setattr(workouts_router, "ZEPP_DATA_DIR", zepp_dir)

    res = client.get("/api/workouts")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == "1787006220"
    assert items[0]["category"] == "Corrida"
    assert items[0]["duration_min"] == 30.0
    assert items[0]["distance_km"] == 3.0
    assert items[0]["calories"] == 200
    assert items[0]["city"] == "Santos"


def test_get_workouts_case_insensitive_and_todas_category(client, tmp_path):
    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    repo.upsert_workouts([
        {
            "id": "c1",
            "workout_date": "2026-08-10",
            "workout_time": "07:00",
            "category": "Corrida",
            "activity_type": "Corrida",
            "duration_min": 25.0,
        },
        {
            "id": "b1",
            "workout_date": "2026-08-11",
            "workout_time": "08:00",
            "category": "Ciclismo",
            "activity_type": "Ciclismo",
            "duration_min": 40.0,
        },
    ])

    # Case-insensitive query
    res_lower = client.get("/api/workouts?category=corrida")
    assert res_lower.status_code == 200
    assert len(res_lower.json()) == 1
    assert res_lower.json()[0]["id"] == "c1"

    # Category "Todas" should return all
    res_all = client.get("/api/workouts?category=Todas")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 2


def test_upsert_workouts_handles_none_and_numeric_strings(tmp_path):
    db_path = tmp_path / "longevity-types.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Edge cases: explicit None on workout_time, category, source; string floats on calories & avg_hr
    record = {
        "id": "edge_1",
        "workout_date": "2026-08-12",
        "workout_time": None,
        "category": None,
        "activity_type": None,
        "duration_min": "45.5",
        "calories": "350.8",
        "distance_km": "5.25",
        "avg_hr": "142.8",
        "max_hr": "165.0",
        "training_effect": "30.0",
        "steps": "5000.0",
        "source": None,
    }

    inserted = repo.upsert_workouts([record])
    assert inserted == 1

    saved = repo.get_workouts()
    assert len(saved) == 1
    item = saved[0]
    assert item["workout_time"] == "00:00"  # Must NOT be literal 'None'
    assert item["category"] == "Outros"     # Must NOT be literal 'None'
    assert item["activity_type"] == "Outro" # Must NOT be literal 'None'
    assert item["source"] == "Zepp"
    assert item["duration_min"] == 45.5
    assert item["calories"] == 351
    assert item["avg_hr"] == 143
    assert item["max_hr"] == 165
    assert item["training_effect"] == 30
    assert item["steps"] == 5000


def test_get_workouts_summary(client):
    res = client.get("/api/workouts/summary?days=30")
    assert res.status_code == 200
    data = res.json()
    assert "total_workouts" in data
    assert "total_volume_kg" in data
    assert "total_duration_min" in data
    assert "total_calories" in data


def test_get_workout_details_and_search(client):
    from backend.app.config import get_db_path
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    hevy_workout = {
        "id": "hw_detail_1",
        "workout_date": "2026-09-19",
        "workout_time": "10:30",
        "category": "Treino Força",
        "activity_type": "Musculação",
        "title": "Peito e Tríceps",
        "duration_min": 45.0,
        "calories": 250,
        "distance_km": 0.0,
        "source": "Hevy",
        "volume_kg": 1200.0,
        "sets_count": 6,
        "reps_count": 60,
        "exercises": [
            {
                "id": "hw_detail_1_ex_0",
                "workout_id": "hw_detail_1",
                "exercise_index": 0,
                "title": "Supino Reto com Barra",
                "notes": "Pesado",
                "sets": [
                    {"id": "s1", "set_index": 0, "set_type": "normal", "weight_kg": 80.0, "reps": 10},
                    {"id": "s2", "set_index": 1, "set_type": "normal", "weight_kg": 85.0, "reps": 8},
                ],
            }
        ],
    }
    repo.upsert_hevy_workouts([hevy_workout])

    # 1. Testa busca de detalhes
    res = client.get("/api/workouts/hw_detail_1")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "hw_detail_1"
    assert data["title"] == "Peito e Tríceps"
    assert len(data["exercises"]) == 1
    assert data["exercises"][0]["title"] == "Supino Reto com Barra"
    assert len(data["exercises"][0]["sets"]) == 2

    # 2. Testa 404 para ID inexistente
    res_404 = client.get("/api/workouts/non_existent_id")
    assert res_404.status_code == 404

    # 3. Testa filtro por busca textual de exercício
    res_search = client.get("/api/workouts?search=Supino")
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1

    # 4. Testa filtro por fonte
    res_hevy = client.get("/api/workouts?source=Hevy")
    assert res_hevy.status_code == 200
    assert len(res_hevy.json()) == 1

    res_zepp = client.get("/api/workouts?source=Zepp")
    assert res_zepp.status_code == 200
    assert len(res_zepp.json()) == 0


def test_hevy_status_and_credentials_endpoints(client):
    from unittest.mock import patch

    with patch("longevidade.ingestion.hevy_client.HevyClient.get_user_info", return_value=({"data": {"id": "u1", "name": "Gustavo"}}, None)):
        res = client.get("/api/workouts/hevy/status")
        assert res.status_code == 200
        data = res.json()
        assert data["connected"] is True
        assert data["user"]["name"] == "Gustavo"

    with patch("longevidade.ingestion.hevy_client.HevyClient.get_user_info", return_value=({"data": {"id": "u1", "name": "Gustavo"}}, None)):
        with patch("longevidade.ingestion.hevy_client.HevyCredentials.save_api_key"):
            cred_res = client.post("/api/workouts/hevy/credentials", json={"api_key": "valid_key_12345"})
            assert cred_res.status_code == 200
            assert cred_res.json()["status"] == "ok"


def test_get_workouts_start_date_and_summary_filters(client, tmp_path):
    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sample_workouts = [
        {
            "id": "zepp_2026_01",
            "workout_date": "2026-01-15",
            "workout_time": "07:00",
            "category": "Corrida",
            "activity_type": "Corrida",
            "duration_min": 30.0,
            "calories": 250,
            "source": "Zepp",
        },
        {
            "id": "zepp_2026_08",
            "workout_date": "2026-08-20",
            "workout_time": "08:00",
            "category": "Caminhada",
            "activity_type": "Caminhada",
            "duration_min": 40.0,
            "calories": 200,
            "source": "Zepp",
        },
        {
            "id": "zepp_2025_12",
            "workout_date": "2025-12-25",
            "workout_time": "09:00",
            "category": "Ciclismo",
            "activity_type": "Ciclismo",
            "duration_min": 60.0,
            "calories": 500,
            "source": "Zepp",
        },
    ]
    repo.upsert_workouts(sample_workouts)

    # Filtrar desde 2026-01-01
    res = client.get("/api/workouts?start_date=2026-01-01&source=Zepp")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    ids = [it["id"] for it in items]
    assert "zepp_2026_08" in ids
    assert "zepp_2026_01" in ids
    assert "zepp_2025_12" not in ids

    # Resumo filtrado por start_date
    res_s = client.get("/api/workouts/summary?start_date=2026-01-01&source=Zepp")
    assert res_s.status_code == 200
    summary = res_s.json()
    assert summary["total_workouts"] == 2
    assert summary["zepp_workouts"] == 2
    assert summary["total_duration_min"] == 70.0
    assert summary["total_calories"] == 450



