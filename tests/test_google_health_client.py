import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

from longevidade.ingestion.google_health_client import (
    GoogleHealthClient,
    GoogleHealthCredentials,
    GOOGLE_HEALTH_SCOPES,
)


def test_google_health_credentials_save_and_load(tmp_path: Path):
    token_file = tmp_path / "google_health_token.json"
    creds = GoogleHealthCredentials(
        client_id="test_client_id",
        client_secret="test_client_secret",
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        scopes=list(GOOGLE_HEALTH_SCOPES),
    )
    creds.save_to_file(token_file)

    loaded = GoogleHealthCredentials.from_file(token_file)
    assert loaded is not None
    assert loaded.client_id == "test_client_id"
    assert loaded.access_token == "test_access_token"
    assert loaded.refresh_token == "test_refresh_token"
    assert "https://www.googleapis.com/auth/googlehealth.sleep.readonly" in loaded.scopes


def test_google_health_client_is_authenticated(tmp_path: Path):
    token_file = tmp_path / "empty_token.json"
    client_unauth = GoogleHealthClient(token_path=token_file)
    assert not client_unauth.is_authenticated()

    creds = GoogleHealthCredentials(access_token="valid_token")
    client_auth = GoogleHealthClient(credentials=creds, token_path=token_file)
    assert client_auth.is_authenticated()

    # Reauthentication required deve marcar como não autenticado
    creds.reauthentication_required = True
    assert not client_auth.is_authenticated()
    assert client_auth.is_reauthentication_required()


def test_google_health_client_fetch_data_points(tmp_path: Path):
    creds = GoogleHealthCredentials(
        access_token="valid_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    mock_resp = {
        "dataPoints": [
            {
                "startTime": "2026-08-18T10:00:00Z",
                "endTime": "2026-08-18T11:00:00Z",
                "steps": {"count": 4500},
            }
        ]
    }

    with patch.object(client, "_get_json", return_value=(mock_resp, None)):
        points, err = client.fetch_data_points("steps")
        assert err is None
        assert len(points) == 1
        assert points[0]["steps"]["count"] == 4500


def test_google_health_client_fetch_daily_summary(tmp_path: Path):
    creds = GoogleHealthCredentials(
        access_token="valid_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    def mock_fetch(data_type, *args, **kwargs):
        if data_type == "steps":
            return [
                {"startTime": "2026-08-18T08:00:00Z", "steps": {"count": 8200}}
            ], None
        if data_type == "heart-rate":
            return [
                {"startTime": "2026-08-18T08:00:00Z", "heartRate": {"bpm": 62}},
                {"startTime": "2026-08-18T12:00:00Z", "heartRate": {"bpm": 74}},
            ], None
        if data_type == "sleep":
            return [
                {
                    "startTime": "2026-08-18T01:00:00Z",
                    "sleep": {
                        "durationMinutes": 450,
                        "stages": {"deepMinutes": 90, "remMinutes": 100, "lightMinutes": 240, "awakeMinutes": 20},
                    },
                }
            ], None
        if data_type == "oxygen-saturation":
            return [
                {"startTime": "2026-08-18T04:00:00Z", "oxygenSaturation": {"percentage": 98.0}}
            ], None
        if data_type == "weight":
            return [
                {"startTime": "2026-08-18T07:00:00Z", "weight": {"kilograms": 78.5}}
            ], None
        return [], None

    with patch.object(client, "fetch_data_points", side_effect=mock_fetch):
        records, errors = client.fetch_daily_metrics_summary(days=1)
        assert len(errors) == 0
        assert len(records) >= 1
        rec = next(r for r in records if r["date_ref"] == "2026-08-18")
        assert rec["steps"] == 8200
        assert rec["rhr_bpm"] == 62.0
        assert rec["avg_hr_bpm"] == 68.0
        assert rec["sleep_minutes"] == 450
        assert rec["sleep_deep_min"] == 90
        assert rec["sleep_rem_min"] == 100
        assert rec["spo2_avg_pct"] == 98.0
        assert rec["weight_kg"] == 78.5
