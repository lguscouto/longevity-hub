import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.hevy_client import (
    HevyClient,
    HevyCredentials,
    normalize_hevy_workout,
    sync_hevy_workouts,
)


def test_hevy_credentials_save_and_get(tmp_path: Path, monkeypatch):
    token_file = tmp_path / "hevy_token.json"
    monkeypatch.delenv("HEVY_API_KEY", raising=False)

    HevyCredentials.save_api_key("test-key-123456", token_path=token_file)
    retrieved = HevyCredentials.get_api_key(token_path=token_file)
    assert retrieved == "test-key-123456"

    HevyCredentials.delete_api_key(token_path=token_file)
    assert not token_file.exists()


def test_normalize_hevy_workout():
    raw = {
        "id": "hw_123",
        "title": "Treino Costas & Bíceps",
        "start_time": "2026-09-15T14:00:00Z",
        "end_time": "2026-09-15T15:00:00Z",
        "exercises": [
            {
                "title": "Puxada Frontal",
                "exercise_template_id": "PULL_01",
                "notes": "Execução controlada",
                "sets": [
                    {"set_type": "warmup", "weight_kg": 40.0, "reps": 12},
                    {"set_type": "normal", "weight_kg": 60.0, "reps": 10},
                    {"set_type": "normal", "weight_kg": 65.0, "reps": 8},
                ],
            },
            {
                "title": "Rosca Direta",
                "exercise_template_id": "CURL_01",
                "notes": "",
                "sets": [
                    {"set_type": "normal", "weight_kg": 15.0, "reps": 10},
                    {"set_type": "drop_set", "weight_kg": 10.0, "reps": 12},
                ],
            },
        ],
    }

    norm = normalize_hevy_workout(raw)
    assert norm["id"] == "hw_123"
    assert norm["workout_date"] == "2026-09-15"
    assert norm["workout_time"] == "14:00"
    assert norm["duration_min"] == 60.0
    assert norm["source"] == "Hevy"
    assert norm["category"] == "Treino Força"
    assert norm["title"] == "Treino Costas & Bíceps"

    # Volume: (40*12) + (60*10) + (65*8) + (15*10) + (10*12) = 480 + 600 + 520 + 150 + 120 = 1870
    assert norm["volume_kg"] == 1870.0
    assert norm["sets_count"] == 5
    assert norm["reps_count"] == 52

    assert len(norm["exercises"]) == 2
    assert norm["exercises"][0]["title"] == "Puxada Frontal"
    assert len(norm["exercises"][0]["sets"]) == 3
    assert norm["exercises"][0]["sets"][1]["weight_kg"] == 60.0


def test_sync_hevy_workouts(tmp_path: Path):
    db_file = tmp_path / "test_longevity.sqlite3"
    initialize_db(db_file)
    repo = LongevityRepository(db_file)

    mock_client = MagicMock(spec=HevyClient)
    mock_client.is_configured.return_value = True

    sample_workout = {
        "id": "hevy_test_01",
        "title": "Treino Pernas",
        "start_time": "2026-09-18T10:00:00Z",
        "end_time": "2026-09-18T11:15:00Z",
        "exercises": [
            {
                "title": "Agachamento Livre",
                "sets": [
                    {"set_type": "normal", "weight_kg": 100.0, "reps": 8},
                ],
            }
        ],
    }

    mock_client.fetch_all_workouts.return_value = ([sample_workout], None)

    res = sync_hevy_workouts(repo=repo, client=mock_client)
    assert res["status"] == "SUCESSO"
    assert res["records_inserted"] == 1
    assert res["records_read"] == 1

    # Verifica persistência no banco
    details = repo.get_workout_details("hevy_test_01")
    assert details is not None
    assert details["title"] == "Treino Pernas"
    assert details["volume_kg"] == 800.0
    assert len(details["exercises"]) == 1
    assert details["exercises"][0]["title"] == "Agachamento Livre"
    assert len(details["exercises"][0]["sets"]) == 1
    assert details["exercises"][0]["sets"][0]["weight_kg"] == 100.0

    # Verifica KPIs
    summary = repo.get_workouts_summary(days=30)
    assert summary["total_workouts"] == 1
    assert summary["hevy_workouts"] == 1
    assert summary["total_volume_kg"] == 800.0
