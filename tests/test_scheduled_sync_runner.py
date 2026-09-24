from __future__ import annotations

import logging
from pathlib import Path
from unittest.mock import MagicMock, patch

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from scripts.run_scheduled_sync import run_sync


def test_run_sync_success(tmp_path: Path):
    """Execução bem-sucedida de todas as fontes com registro em pipeline_run."""
    db_path = tmp_path / "test_scheduled_sync.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    logger = logging.getLogger("test_sync")

    with (
        patch(
            "scripts.run_scheduled_sync.import_zepp_data",
            return_value={"status": "SUCESSO", "records_inserted": 5, "summary": "5 dias Zepp"},
        ) as mock_zepp,
        patch(
            "scripts.run_scheduled_sync.import_google_health_data",
            return_value={"status": "SUCESSO", "records_inserted": 2, "summary": "2 dias Google"},
        ) as mock_google_local,
        patch(
            "scripts.run_scheduled_sync.GoogleHealthClient.is_authenticated",
            return_value=False,
        ),
        patch(
            "scripts.run_scheduled_sync.HevyCredentials.get_api_key",
            return_value="dummy-key",
        ),
        patch(
            "scripts.run_scheduled_sync.sync_hevy_workouts",
            return_value={"status": "SUCESSO", "records_inserted": 3},
        ) as mock_hevy,
    ):
        result = run_sync(repo=repo, db_path=db_path, logger=logger)

    assert result["success"] is True
    assert result["errors"] == []
    assert mock_zepp.called
    assert mock_google_local.called
    assert mock_hevy.called

    runs = repo.get_pipeline_runs(limit=10)
    scheduled_run = next((r for r in runs if r.get("source") == "ScheduledSync"), None)
    assert scheduled_run is not None
    assert scheduled_run["status"] == "SUCESSO"
    assert "Sincronização agendada concluída" in scheduled_run["log_summary"]


def test_run_sync_resilient_to_partial_failure(tmp_path: Path):
    """Uma falha na coleta do Zepp não deve impedir o Hevy de rodar nem travar o script."""
    db_path = tmp_path / "test_partial_failure.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    logger = logging.getLogger("test_sync")

    with (
        patch(
            "scripts.run_scheduled_sync.import_zepp_data",
            return_value={"status": "ERRO", "records_inserted": 0, "summary": "Falha de rede Zepp"},
        ),
        patch(
            "scripts.run_scheduled_sync.import_google_health_data",
            return_value={"status": "SUCESSO", "records_inserted": 0},
        ),
        patch(
            "scripts.run_scheduled_sync.GoogleHealthClient.is_authenticated",
            return_value=False,
        ),
        patch(
            "scripts.run_scheduled_sync.HevyCredentials.get_api_key",
            return_value="dummy-key",
        ),
        patch(
            "scripts.run_scheduled_sync.sync_hevy_workouts",
            return_value={"status": "SUCESSO", "records_inserted": 2},
        ) as mock_hevy,
    ):
        result = run_sync(repo=repo, db_path=db_path, logger=logger)

    assert result["success"] is False
    assert len(result["errors"]) >= 1
    assert "Zepp" in result["errors"][0]
    assert mock_hevy.called

    runs = repo.get_pipeline_runs(limit=10)
    scheduled_run = next((r for r in runs if r.get("source") == "ScheduledSync"), None)
    assert scheduled_run is not None
    assert scheduled_run["status"] == "ERRO"


def test_run_sync_skip_flags(tmp_path: Path):
    """Flags de skip devem pular a respectiva fonte."""
    db_path = tmp_path / "test_skip.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    logger = logging.getLogger("test_sync")

    with (
        patch("scripts.run_scheduled_sync.import_zepp_data") as mock_zepp,
        patch("scripts.run_scheduled_sync.import_google_health_data") as mock_google,
        patch("scripts.run_scheduled_sync.sync_hevy_workouts") as mock_hevy,
    ):
        result = run_sync(
            repo=repo,
            db_path=db_path,
            skip_zepp=True,
            skip_google=True,
            skip_hevy=True,
            skip_kdm=True,
            logger=logger,
        )

    assert result["success"] is True
    assert not mock_zepp.called
    assert not mock_google.called
    assert not mock_hevy.called
