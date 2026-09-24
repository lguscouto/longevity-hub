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

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def mock_fetch(data_type, *args, **kwargs):
        if data_type == "steps":
            return [
                {"startTime": f"{today_str}T08:00:00Z", "steps": {"count": 8200}}
            ], None
        if data_type == "heart-rate":
            return [
                {"startTime": f"{today_str}T08:00:00Z", "heartRate": {"bpm": 62}},
                {"startTime": f"{today_str}T12:00:00Z", "heartRate": {"bpm": 74}},
            ], None
        if data_type == "daily-resting-heart-rate":
            return [
                {"startTime": f"{today_str}T06:00:00Z", "dailyRestingHeartRate": {"bpm": 58.0}}
            ], None
        if data_type == "sleep":
            return [
                {
                    "startTime": f"{today_str}T01:00:00Z",
                    "sleep": {
                        "durationMinutes": 450,
                        "stages": {"deepMinutes": 90, "remMinutes": 100, "lightMinutes": 240, "awakeMinutes": 20},
                    },
                }
            ], None
        if data_type == "oxygen-saturation":
            return [
                {"startTime": f"{today_str}T04:00:00Z", "oxygenSaturation": {"percentage": 98.0}}
            ], None
        if data_type == "weight":
            return [
                {"startTime": f"{today_str}T07:00:00Z", "weight": {"kilograms": 78.5}}
            ], None
        return [], None

    with patch.object(client, "fetch_data_points", side_effect=mock_fetch):
        records, errors = client.fetch_daily_metrics_summary(days=1)
        assert len(errors) == 0
        assert len(records) >= 1
        rec = next(r for r in records if r["date_ref"] == today_str)
        assert rec["steps"] == 8200
        assert rec["rhr_bpm"] == 58.0
        assert rec["avg_hr_bpm"] == 68.0
        assert rec["max_hr_bpm"] == 74.0
        assert rec["sleep_minutes"] == 450
        assert rec["sleep_deep_min"] == 90
        assert rec["sleep_rem_min"] == 100
        assert rec["spo2_avg_pct"] == 98.0
        assert rec["weight_kg"] == 78.5


def test_google_health_credentials_scope_status():
    from longevidade.ingestion.google_health_registry import SCOPE_ACTIVITY, SCOPE_SLEEP

    creds = GoogleHealthCredentials(
        scopes=[SCOPE_ACTIVITY, SCOPE_SLEEP],
        token_type="Bearer",
    )
    assert creds.token_type == "Bearer"
    assert creds.has_scope("activity") is True
    assert creds.has_scope("sleep") is True
    assert creds.has_scope("health_metrics") is False
    assert creds.has_scope("nutrition") is False

    status = creds.get_scope_status()
    assert status == {
        "activity": True,
        "health_metrics": False,
        "sleep": True,
        "nutrition": False,
    }


def test_google_health_client_partial_consent_fetch(tmp_path: Path):
    from longevidade.ingestion.google_health_registry import SCOPE_ACTIVITY

    # Credenciais concederam apenas atividade física (steps), recusando sono e métricas corporais
    creds = GoogleHealthCredentials(
        access_token="valid_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        scopes=[SCOPE_ACTIVITY],
    )
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    queried_types = []

    def mock_fetch(data_type, *args, **kwargs):
        queried_types.append(data_type)
        if data_type == "steps":
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return [{"startTime": f"{today_str}T08:00:00Z", "steps": {"count": 10000}}], None
        return [], None

    with patch.object(client, "fetch_data_points", side_effect=mock_fetch):
        records, errors = client.fetch_daily_metrics_summary(days=1)
        assert len(errors) == 0
        # Apenas steps deve ser consultado, respeitando o consentimento parcial
        assert queried_types == ["steps"]
        assert len(records) >= 1
        assert records[0]["steps"] == 10000
        assert "sleep_minutes" not in records[0]
        assert "avg_hr_bpm" not in records[0]


def test_google_health_client_retry_on_429(tmp_path: Path):
    from urllib.error import HTTPError
    import io

    creds = GoogleHealthCredentials(
        access_token="valid_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    attempts = 0

    def mock_urlopen(req, *args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            fp = io.BytesIO(b'{"error": "rate limit"}')
            raise HTTPError(req.full_url, 429, "Too Many Requests", {}, fp)
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"dataPoints": [{"value": 1}]}).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.__exit__.return_value = False
        return mock_resp

    with patch("longevidade.ingestion.google_health_client.urlopen", side_effect=mock_urlopen):
        with patch("time.sleep", return_value=None):
            data, err = client._get_json("https://health.googleapis.com/v4/test", base_delay=0.01)
            assert err is None
            assert data == {"dataPoints": [{"value": 1}]}
            assert attempts == 3


def test_google_health_data_type_registry():
    from longevidade.ingestion.google_health_registry import (
        GoogleHealthDataTypeRegistry,
        SCOPE_ACTIVITY,
        SCOPE_HEALTH_METRICS,
    )

    assert GoogleHealthDataTypeRegistry.is_active("steps") is True
    assert GoogleHealthDataTypeRegistry.is_active("basal-metabolic-rate") is False
    assert GoogleHealthDataTypeRegistry.is_active("skin-temperature") is False

    # Blood pressure é gerenciado pelo Health Connect, não pela Google Health API direta
    bp_cfg = GoogleHealthDataTypeRegistry.get("blood-pressure")
    assert bp_cfg is not None
    assert bp_cfg.provider == "health_connect"

    # Filtragem de escopos
    filtered = GoogleHealthDataTypeRegistry.filter_types_by_scopes(
        ["steps", "heart-rate", "sleep"],
        authorized_scopes=[SCOPE_ACTIVITY, SCOPE_HEALTH_METRICS],
    )
    assert set(filtered) == {"steps", "heart-rate"}

