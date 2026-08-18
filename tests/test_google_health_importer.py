import pytest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.google_health_client import (
    GoogleHealthClient,
    GoogleHealthCredentials,
)
from longevidade.ingestion.google_importer import sync_google_health_api


@pytest.fixture
def repo(tmp_path: Path) -> LongevityRepository:
    db_file = tmp_path / "test_longevity.sqlite3"
    initialize_db(db_file)
    return LongevityRepository(db_file)


def test_sync_google_health_api_idempotency(repo: LongevityRepository, tmp_path: Path):
    """Executar o sync duas vezes com os mesmos dados deve manter exatamente 1 registro por data."""
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    mock_records = [
        {
            "date_ref": "2026-08-18",
            "source": "GoogleHealthAPI",
            "steps": 9500,
            "rhr_bpm": 58.0,
            "sleep_minutes": 460,
            "sleep_deep_min": 95,
        }
    ]

    with patch.object(client, "fetch_daily_metrics_summary", return_value=(mock_records, [])):
        # Primeiro sync
        res1 = sync_google_health_api(repo, days=1, client=client)
        assert res1["status"] == "SUCESSO"
        assert res1["records_inserted"] == 1

        # Segundo sync (idempotente)
        res2 = sync_google_health_api(repo, days=1, client=client)
        assert res2["status"] == "SUCESSO"
        assert res2["records_inserted"] == 1

        # Verifica banco de dados
        daily = repo.get_daily_metrics(days=5)
        assert len(daily) == 1
        assert daily[0]["date_ref"] == "2026-08-18"
        assert daily[0]["steps"] == 9500
        assert daily[0]["rhr_bpm"] == 58.0


def test_sync_google_health_reauthentication_required(repo: LongevityRepository, tmp_path: Path):
    """Se o refresh token falhar com invalid_grant, reporta reautenticação necessária."""
    creds = GoogleHealthCredentials(
        access_token=None,
        refresh_token="expired_refresh_token",
        reauthentication_required=True,
        last_error="Refresh token expirado",
    )
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    res = sync_google_health_api(repo, days=7, client=client)
    assert res["status"] == "AVISO"
    assert res["records_inserted"] == 0
    assert "Reautenticação necessária" in res["summary"]
