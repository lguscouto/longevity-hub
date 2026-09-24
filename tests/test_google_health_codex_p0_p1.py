"""
Testes de conformidade P0 e P1 para a Google Health API v4 (Longevidade Hub).
Cobre:
- P0.2: Geração e validação de filtros temporais server-side (RFC 3339 UTC, snake_case).
- P1.1: Operações canônicas list() e reconcile().
- P1.2: Operações de agregação roll_up() e daily_roll_up().
- P1.5: Cálculo fisiológico de RHR (prioridade daily-resting-heart-rate, nunca min(bpms)).
"""

import json
from datetime import datetime, timezone, timedelta, tzinfo
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

from longevidade.ingestion.google_health_client import (
    GoogleHealthClient,
    GoogleHealthCredentials,
    build_server_filter,
    format_rfc3339_utc,
)


def test_build_server_filter_rfc3339_and_snake_case():
    start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 3, 8, 0, 0, 0, tzinfo=timezone.utc)

    filter_str = build_server_filter(start, end)
    assert filter_str == 'start_time >= "2026-03-01T00:00:00Z" AND end_time < "2026-03-08T00:00:00Z"'


def test_build_server_filter_invalid_order_raises():
    start = datetime(2026, 3, 8, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)

    with pytest.raises(ValueError, match="anterior a end_time"):
        build_server_filter(start, end)


def test_build_server_filter_equal_times_raises():
    t = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    with pytest.raises(ValueError, match="anterior a end_time"):
        build_server_filter(t, t)


def test_build_server_filter_single_boundaries():
    t = datetime(2026, 3, 1, 10, 30, 0, tzinfo=timezone.utc)
    assert build_server_filter(start_time=t) == 'start_time >= "2026-03-01T10:30:00Z"'
    assert build_server_filter(end_time=t) == 'end_time < "2026-03-01T10:30:00Z"'
    assert build_server_filter() is None


def test_build_server_filter_timezone_conversion():
    # UTC-3 (Horário de Brasília)
    class BrasiliaTZ(tzinfo):
        def utcoffset(self, dt): return timedelta(hours=-3)
        def dst(self, dt): return timedelta(0)
        def tzname(self, dt): return "BRT"

    start_brt = datetime(2026, 3, 1, 21, 0, 0, tzinfo=BrasiliaTZ())
    end_brt = datetime(2026, 3, 2, 21, 0, 0, tzinfo=BrasiliaTZ())

    # 21:00 UTC-3 -> 00:00 UTC do dia seguinte
    filter_str = build_server_filter(start_brt, end_brt)
    assert filter_str == 'start_time >= "2026-03-02T00:00:00Z" AND end_time < "2026-03-03T00:00:00Z"'


def test_fetch_data_points_propagates_server_filter(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 3, 2, 0, 0, 0, tzinfo=timezone.utc)

    mock_resp = {"dataPoints": [{"steps": {"count": 5000}}]}

    with patch.object(client, "_get_json", return_value=(mock_resp, None)) as mock_get:
        points, err = client.fetch_data_points("steps", start_time=start, end_time=end)
        assert err is None
        assert len(points) == 1
        mock_get.assert_called_once()
        call_url, call_params = mock_get.call_args[0]
        assert "steps/dataPoints" in call_url
        assert call_params["filter"] == 'steps.interval.start_time >= "2026-03-01T00:00:00Z" AND steps.interval.start_time < "2026-03-02T00:00:00Z"'


def test_list_method_alias(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    with patch.object(client, "fetch_data_points", return_value=([{"value": 1}], None)) as mock_fetch:
        pts, err = client.list("heart-rate")
        assert pts == [{"value": 1}]
        mock_fetch.assert_called_once_with("heart-rate", start_time=None, end_time=None, page_size=1000)


def test_reconcile_method(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    mock_resp_p1 = {
        "reconciledDataPoints": [{"startTime": "2026-03-01T10:00:00Z", "steps": {"count": 2000}}],
        "nextPageToken": "token_page_2"
    }
    mock_resp_p2 = {
        "reconciledDataPoints": [{"startTime": "2026-03-01T14:00:00Z", "steps": {"count": 3000}}],
        "nextPageToken": None
    }

    start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 3, 2, 0, 0, 0, tzinfo=timezone.utc)

    with patch.object(client, "_get_json", side_effect=[(mock_resp_p1, None), (mock_resp_p2, None)]) as mock_get:
        points, err = client.reconcile("steps", start_time=start, end_time=end)
        assert err is None
        assert len(points) == 2
        assert mock_get.call_count == 2
        # Verifica URL e filter
        url_1, params_1 = mock_get.call_args_list[0][0]
        assert "dataTypes/steps/dataPoints:reconcile" in url_1
        assert params_1["filter"] == 'steps.interval.start_time >= "2026-03-01T00:00:00Z" AND steps.interval.start_time < "2026-03-02T00:00:00Z"'
        assert "pageToken" not in params_1

        url_2, params_2 = mock_get.call_args_list[1][0]
        assert params_2["pageToken"] == "token_page_2"


def test_roll_up_and_daily_roll_up(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    mock_resp = {
        "rollupDataPoints": [
            {"date": "2026-03-01", "steps": {"count": 10500}},
            {"date": "2026-03-02", "steps": {"count": 11200}},
        ]
    }

    start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 3, 3, 0, 0, 0, tzinfo=timezone.utc)

    # dailyRollUp usa POST :dailyRollUp
    with patch.object(client, "_post_json", return_value=(mock_resp, None)) as mock_post:
        aggs, err = client.daily_roll_up("steps", start_time=start, end_time=end)
        assert err is None
        assert len(aggs) == 2
        mock_post.assert_called_once()
        url, body = mock_post.call_args[0]
        assert "dataTypes/steps/dataPoints:dailyRollUp" in url
        assert body["windowSizeDays"] == 1
        assert "range" in body

    # rollUp usa POST :rollUp
    with patch.object(client, "_post_json", return_value=(mock_resp, None)) as mock_post_rollup:
        aggs2, err2 = client.roll_up("steps", start_time=start, end_time=end, window_size="3600s")
        assert err2 is None
        assert len(aggs2) == 2
        mock_post_rollup.assert_called_once()
        url2, body2 = mock_post_rollup.call_args[0]
        assert "dataTypes/steps/dataPoints:rollUp" in url2
        assert body2["windowSize"] == "3600s"



def test_rhr_never_uses_min_heart_rate(tmp_path: Path):
    """P1.5: heart-rate sozinho gera avg e max, mas NUNCA define rhr_bpm como min(bpms)."""
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def mock_fetch(data_type, *args, **kwargs):
        if data_type == "heart-rate":
            return [
                {"startTime": f"{today_str}T08:00:00Z", "heartRate": {"bpm": 52}},
                {"startTime": f"{today_str}T14:00:00Z", "heartRate": {"bpm": 85}},
            ], None
        return [], None

    with patch.object(client, "fetch_data_points", side_effect=mock_fetch):
        records, errors = client.fetch_daily_metrics_summary(days=1, selected_types=["heart-rate"])
        assert len(errors) == 0
        assert len(records) == 1
        rec = records[0]
        assert rec["avg_hr_bpm"] == 68.5
        assert rec["max_hr_bpm"] == 85.0
        # CRÍTICO P1.5: rhr_bpm NÃO deve ser calculado como min(bpms) = 52.0
        assert "rhr_bpm" not in rec


def test_rhr_comes_from_daily_resting_heart_rate(tmp_path: Path):
    """P1.5: rhr_bpm provém estritamente do tipo oficial daily-resting-heart-rate."""
    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def mock_fetch(data_type, *args, **kwargs):
        if data_type == "heart-rate":
            return [
                {"startTime": f"{today_str}T08:00:00Z", "heartRate": {"bpm": 48}},  # fake low spike
                {"startTime": f"{today_str}T14:00:00Z", "heartRate": {"bpm": 90}},
            ], None
        if data_type == "daily-resting-heart-rate":
            return [
                {"startTime": f"{today_str}T06:00:00Z", "dailyRestingHeartRate": {"bpm": 55.0}}
            ], None
        return [], None

    with patch.object(client, "fetch_data_points", side_effect=mock_fetch):
        records, errors = client.fetch_daily_metrics_summary(days=1, selected_types=["heart-rate", "daily-resting-heart-rate"])
        assert len(errors) == 0
        assert len(records) == 1
        rec = records[0]
        assert rec["avg_hr_bpm"] == 69.0
        assert rec["max_hr_bpm"] == 90.0
        # RHR oficial é 55.0, e NÃO o menor batimento (48.0)
        assert rec["rhr_bpm"] == 55.0


def test_data_type_config_p1_attributes():
    from longevidade.ingestion.google_health_registry import GoogleHealthDataTypeRegistry

    steps_cfg = GoogleHealthDataTypeRegistry.get("steps")
    assert steps_cfg is not None
    assert steps_cfg.official_name == "steps"
    assert steps_cfg.endpoint_name == "steps"
    assert steps_cfg.filter_name == "steps"
    assert "reconcile" in steps_cfg.supported_operations
    assert steps_cfg.enabled is True
    assert steps_cfg.status == "stable"

    bmr_cfg = GoogleHealthDataTypeRegistry.get("basal-metabolic-rate")
    assert bmr_cfg is not None
    assert bmr_cfg.is_roadmap is True
    assert bmr_cfg.enabled is False
    assert bmr_cfg.status == "roadmap"

    bp_cfg = GoogleHealthDataTypeRegistry.get("blood-pressure")
    assert bp_cfg is not None
    assert bp_cfg.provider == "health_connect"
    assert bp_cfg.status == "health_connect_only"


def test_registry_queries_by_status_and_operation():
    from longevidade.ingestion.google_health_registry import GoogleHealthDataTypeRegistry

    roadmaps = GoogleHealthDataTypeRegistry.get_by_status("roadmap")
    assert any(c.data_type == "basal-metabolic-rate" for c in roadmaps)
    assert any(c.data_type == "skin-temperature" for c in roadmaps)

    reconcile_types = GoogleHealthDataTypeRegistry.get_by_operation("reconcile")
    assert any(c.data_type == "steps" for c in reconcile_types)
    assert any(c.data_type == "heart-rate" for c in reconcile_types)
