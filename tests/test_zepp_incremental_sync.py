from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

import pytest

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.zepp_importer import import_zepp_data, parse_zepp_workouts

# Add zepp scripts and cli to path
ZEPP_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "integrations" / "zepp" / "scripts"
ZEPP_CLI_DIR = Path(__file__).resolve().parent.parent / "integrations" / "zepp" / "zepp-health-cli"
if str(ZEPP_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_SCRIPTS_DIR))
if str(ZEPP_CLI_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_CLI_DIR))

from fetch_zepp_data import get_latest_workout_track_id
import zepp_health


def test_repository_get_latest_dates_and_track_id(tmp_path: Path):
    """Garante que os novos helpers do repositório identificam corretamente as datas mais recentes."""
    db_file = tmp_path / "test.db"
    initialize_db(db_file)
    repo = LongevityRepository(db_file)

    assert repo.get_latest_daily_metric_date() is None
    assert repo.get_latest_workout_date() is None
    assert repo.get_latest_workout_track_id() is None

    # Insere métricas diárias
    repo.upsert_daily_metric({"date_ref": "2026-09-25", "steps": 5000, "source": "Zepp"})
    repo.upsert_daily_metric({"date_ref": "2026-09-28", "steps": 8000, "source": "Zepp"})
    repo.upsert_daily_metric({"date_ref": "2026-09-29", "steps": 6000, "source": "GoogleHealth"})

    assert repo.get_latest_daily_metric_date() == "2026-09-29"
    assert repo.get_latest_daily_metric_date(source="Zepp") == "2026-09-28"

    # Insere treinos
    repo.upsert_workouts([
        {
            "id": "1785000000",
            "workout_date": "2026-09-20",
            "workout_time": "08:00",
            "category": "Corrida",
            "source": "Zepp",
        },
        {
            "id": "1789000000",
            "workout_date": "2026-09-28",
            "workout_time": "18:30",
            "category": "Treino Força",
            "source": "Zepp",
        },
        {
            "id": "hevy_123",
            "workout_date": "2026-09-29",
            "workout_time": "19:00",
            "category": "Treino Força",
            "source": "Hevy",
        },
    ])

    assert repo.get_latest_workout_date() == "2026-09-29"
    assert repo.get_latest_workout_date(source="Zepp") == "2026-09-28"
    assert repo.get_latest_workout_track_id(source="Zepp") == 1789000000


def test_parse_zepp_workouts_with_since_date(tmp_path: Path):
    """Garante que parse_zepp_workouts aceita since_date e filtra treinos anteriores."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    fake_payload = {
        "data": {
            "summary": [
                {
                    "trackid": "1790600000",  # ~2026-09-28
                    "createTime": 1790600000000,
                    "type": 1,
                    "dis": 5000,
                },
                {
                    "trackid": "1780000000",  # Antigo (meses atrás)
                    "createTime": 1780000000000,
                    "type": 6,
                    "dis": 2000,
                },
            ]
        }
    }
    (data_dir / "workout_history.json").write_text(json.dumps(fake_payload), encoding="utf-8")

    all_workouts = parse_zepp_workouts(data_dir)
    assert len(all_workouts) == 2

    # Filtrando apenas treinos recentes
    filtered = parse_zepp_workouts(data_dir, since_date="2026-09-01")
    assert len(filtered) == 1
    assert filtered[0]["id"] == "1790600000"


def test_get_latest_workout_track_id(tmp_path: Path):
    """Verifica que get_latest_workout_track_id obtém o maior trackid em segundos."""
    fake_payload = {
        "data": {
            "summary": [
                {"trackid": "1700000000"},
                {"trackid": "1790717506"},
                {"trackid": "1650000000"},
            ]
        }
    }
    (tmp_path / "workout_history.json").write_text(json.dumps(fake_payload), encoding="utf-8")
    assert get_latest_workout_track_id(tmp_path) == 1790717506


def test_cmd_run_history_arguments_incremental(monkeypatch: pytest.MonkeyPatch):
    """Verifica que o comando CLI run-history repassa start_track_id ou calcula a partir de days."""
    mock_client = mock.MagicMock()
    mock_client.sport_history.return_value = {"code": 1, "data": {"summary": []}}
    monkeypatch.setattr(zepp_health, "_load_client", lambda: mock_client)
    monkeypatch.setattr(zepp_health, "_emit_json", lambda data, args: None)

    # 1. Com start_track_id explícito
    args1 = argparse.Namespace(sport="run", start_track_id=1790000000, days=None, json=True)
    zepp_health.cmd_run_history(args1)
    call_args1 = mock_client.sport_history.call_args[0]
    assert call_args1[0] == "run"
    assert call_args1[1] == 1790000000

    # 2. Com days explícito
    args2 = argparse.Namespace(sport="run", start_track_id=None, days=5, json=True)
    zepp_health.cmd_run_history(args2)
    call_args2 = mock_client.sport_history.call_args[0]
    expected_approx_start = int((datetime.now(timezone.utc) - timedelta(days=5)).timestamp())
    assert abs(call_args2[1] - expected_approx_start) <= 2

    # 3. Sem parâmetros (modo full padrão)
    args3 = argparse.Namespace(sport="run", start_track_id=None, days=None, json=True)
    zepp_health.cmd_run_history(args3)
    call_args3 = mock_client.sport_history.call_args[0]
    assert call_args3[1] == 0


def test_import_zepp_data_automatic_incremental_days(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Verifica que import_zepp_data detecta a última data no banco e não busca 365 dias desnecessariamente."""
    db_file = tmp_path / "test.db"
    initialize_db(db_file)
    repo = LongevityRepository(db_file)

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    repo.upsert_daily_metric({"date_ref": yesterday, "steps": 7000, "source": "Zepp"})

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    scripts_dir = tmp_path / "scripts"
    scripts_dir.mkdir()

    # Cria metadata recente para passar na validação de fetch
    (data_dir / "metadata.json").write_text(
        json.dumps({"fetched_at": datetime.now(timezone.utc).isoformat(), "days": 3}),
        encoding="utf-8",
    )
    (data_dir / "band_data.json").write_text(json.dumps({"data": []}), encoding="utf-8")
    (data_dir / "heart_rate.json").write_text(json.dumps({"items": []}), encoding="utf-8")
    (data_dir / "workout_history.json").write_text(json.dumps({"data": {"summary": []}}), encoding="utf-8")

    captured_fetch_kwargs = {}

    def mock_fetch(scripts_path, timeout_seconds=600, days=None, full=False):
        captured_fetch_kwargs["days"] = days
        captured_fetch_kwargs["full"] = full

    monkeypatch.setattr("longevidade.ingestion.zepp_importer.run_zepp_cloud_fetch", mock_fetch)

    # Chamada sem days e com full=False (comportamento padrão do botão Sync Zepp)
    result = import_zepp_data(data_dir, repo, days=None, full=False)

    assert result["status"] == "SUCESSO"
    # Como a última métrica é de ontem (1 dia atrás), com buffer de 2 dias: days deve ser 3!
    assert captured_fetch_kwargs["days"] == 3
    assert captured_fetch_kwargs["full"] is False


def test_sync_zepp_api_endpoint_uses_detected_days(client, monkeypatch):
    """Verifica que o endpoint POST /api/metrics/sync/zepp aciona o importador incremental por padrão."""
    import importlib
    metrics = importlib.import_module("backend.app.routers.metrics")
    captured_args = {}

    def mock_import(zepp_dir, repo, days=None, full=False):
        captured_args["days"] = days
        captured_args["full"] = full
        return {"status": "SUCESSO", "records_inserted": 2, "workouts_inserted": 1}

    monkeypatch.setattr(metrics, "import_zepp_data", mock_import)
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *_args, **_kwargs: {"status": "SUCESSO", "records_inserted": 0},
    )

    response = client.post("/api/metrics/sync/zepp")
    assert response.status_code == 200
    # O endpoint repassa days=None e full=False, permitindo que import_zepp_data detecte a janela automaticamente
    assert captured_args["days"] is None
    assert captured_args["full"] is False
    assert response.json()["zepp_records_imported"] == 2
