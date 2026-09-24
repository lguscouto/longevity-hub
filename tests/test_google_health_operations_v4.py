"""
Suíte de testes para operações REST v4 da Google Health API (P1.1, P1.2, P1.3 Codex).

Cobre:
- reconcile (com e sem dataSourceFamily, filtros e paginação)
- rollUp (POST JSON, body, windowSize, dataSourceFamily, parsing e erros)
- dailyRollUp (POST JSON, range civilTime, windowSizeDays, dataSourceFamily e parsing)
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
import pytest

from longevidade.integrations.google_health.client import (
    GoogleHealthClient,
    GoogleHealthCredentials,
)


@pytest.fixture
def client_instance():
    creds = GoogleHealthCredentials(
        client_id="cid",
        client_secret="csec",
        access_token="valid_token",
        refresh_token="ref_token",
    )
    return GoogleHealthClient(credentials=creds)


# ── P1.1: Reconcile Tests ─────────────────────────────────────────────

def test_reconcile_without_source_family(client_instance: GoogleHealthClient):
    """Valida chamada a reconcile sem dataSourceFamily."""
    with patch.object(client_instance, "_get_json", return_value=({"reconciledDataPoints": [{"id": "pt1"}]}, None)) as mock_get:
        points, err = client_instance.reconcile("steps", page_size=100)
        assert err is None
        assert len(points) == 1
        assert points[0]["id"] == "pt1"
        mock_get.assert_called_once()
        url, params = mock_get.call_args[0]
        assert "users/me/dataTypes/steps/dataPoints:reconcile" in url
        assert params["pageSize"] == 100
        assert "dataSourceFamily" not in params


def test_reconcile_with_source_family(client_instance: GoogleHealthClient):
    """Valida envio do query param dataSourceFamily no endpoint reconcile."""
    with patch.object(client_instance, "_get_json", return_value=({"dataPoints": [{"id": "pt2"}]}, None)) as mock_get:
        family = "users/me/dataSourceFamilies/all-sources"
        points, err = client_instance.reconcile("steps", data_source_family=family)
        assert err is None
        assert len(points) == 1
        mock_get.assert_called_once()
        url, params = mock_get.call_args[0]
        assert params.get("dataSourceFamily") == family


def test_reconcile_filter(client_instance: GoogleHealthClient):
    """Valida filtro temporal server-side em reconcile."""
    st = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 2, 0, 0, 0, tzinfo=timezone.utc)

    with patch.object(client_instance, "_get_json", return_value=({"dataPoints": []}, None)) as mock_get:
        points, err = client_instance.reconcile("heart-rate", start_time=st, end_time=et)
        assert err is None
        url, params = mock_get.call_args[0]
        assert 'start_time >= "2026-09-01T00:00:00Z"' in params["filter"]
        assert 'end_time < "2026-09-02T00:00:00Z"' in params["filter"]


def test_reconcile_pagination(client_instance: GoogleHealthClient):
    """Valida paginação correta em reconcile preservando páginas sucessivas."""
    page1 = {"dataPoints": [{"id": "p1"}], "nextPageToken": "tok_page2"}
    page2 = {"dataPoints": [{"id": "p2"}], "nextPageToken": None}

    with patch.object(client_instance, "_get_json", side_effect=[(page1, None), (page2, None)]) as mock_get:
        points, err = client_instance.reconcile("steps")
        assert err is None
        assert len(points) == 2
        assert [p["id"] for p in points] == ["p1", "p2"]
        assert mock_get.call_count == 2


# ── P1.2: rollUp Tests ────────────────────────────────────────────────

def test_rollup_uses_post(client_instance: GoogleHealthClient):
    """Valida que rollUp utiliza POST e não GET."""
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.roll_up("steps", window_size="3600s")
        assert err is None
        mock_post.assert_called_once()
        url, body = mock_post.call_args[0]
        assert "users/me/dataTypes/steps/dataPoints:rollUp" in url


def test_rollup_request_body(client_instance: GoogleHealthClient):
    """Valida corpo JSON com range RFC 3339 UTC e windowSize."""
    st = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 1, 23, 59, 59, tzinfo=timezone.utc)

    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.roll_up("steps", start_time=st, end_time=et, window_size="3600s")
        assert err is None
        url, body = mock_post.call_args[0]
        assert body["windowSize"] == "3600s"
        assert body["range"]["startTime"] == "2026-09-01T00:00:00Z"
        assert body["range"]["endTime"] == "2026-09-01T23:59:59Z"


def test_rollup_window_size(client_instance: GoogleHealthClient):
    """Valida validação estrita de windowSize (formato em segundos e mínimo de 1s)."""
    aggs, err = client_instance.roll_up("steps", window_size="DAILY")
    assert "windowSize inválido" in err

    aggs, err = client_instance.roll_up("steps", window_size="0s")
    assert "pelo menos 1s" in err


def test_rollup_data_source_family(client_instance: GoogleHealthClient):
    """Valida inclusão de dataSourceFamily no corpo JSON de rollUp."""
    family = "users/me/dataSourceFamilies/google-wearables"
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.roll_up("steps", data_source_family=family)
        assert err is None
        url, body = mock_post.call_args[0]
        assert body.get("dataSourceFamily") == family


def test_rollup_response_parsing(client_instance: GoogleHealthClient):
    """Valida extração correta de rollupDataPoints."""
    mock_payload = {
        "rollupDataPoints": [
            {"steps": {"count": 1250}},
            {"steps": {"count": 2300}},
        ]
    }
    with patch.object(client_instance, "_post_json", return_value=(mock_payload, None)):
        aggs, err = client_instance.roll_up("steps")
        assert err is None
        assert len(aggs) == 2
        assert aggs[0]["steps"]["count"] == 1250


def test_rollup_http_error(client_instance: GoogleHealthClient):
    """Valida tratamento seguro de erro HTTP em rollUp."""
    with patch.object(client_instance, "_post_json", return_value=(None, "HTTP 403: Scope unauthorized")):
        aggs, err = client_instance.roll_up("steps")
        assert aggs == []
        assert "HTTP 403" in err


# ── P1.3: dailyRollUp Tests ───────────────────────────────────────────

def test_daily_rollup_uses_post(client_instance: GoogleHealthClient):
    """Valida que dailyRollUp usa endpoint próprio :dailyRollUp via POST."""
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.daily_roll_up("steps")
        assert err is None
        mock_post.assert_called_once()
        url, body = mock_post.call_args[0]
        assert "users/me/dataTypes/steps/dataPoints:dailyRollUp" in url


def test_daily_rollup_request_body(client_instance: GoogleHealthClient):
    """Valida corpo JSON com campos de tempo civil date/time."""
    st = datetime(2026, 9, 1, 0, 0, 0)
    et = datetime(2026, 9, 3, 23, 59, 59)

    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.daily_roll_up("steps", start_time=st, end_time=et)
        assert err is None
        url, body = mock_post.call_args[0]
        assert body["windowSizeDays"] == 1
        assert body["range"]["start"]["date"] == {"year": 2026, "month": 9, "day": 1}
        assert body["range"]["end"]["date"] == {"year": 2026, "month": 9, "day": 3}


def test_daily_rollup_window_size_days(client_instance: GoogleHealthClient):
    """Valida parâmetro windowSizeDays configurável."""
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        aggs, err = client_instance.daily_roll_up("steps", window_size_days=7)
        assert err is None
        url, body = mock_post.call_args[0]
        assert body["windowSizeDays"] == 7


def test_daily_rollup_civil_range(client_instance: GoogleHealthClient):
    """Valida representação de horas, minutos e segundos na estrutura civilTime."""
    st = datetime(2026, 9, 1, 8, 30, 45, 500000)
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        client_instance.daily_roll_up("steps", start_time=st)
        url, body = mock_post.call_args[0]
        time_obj = body["range"]["start"]["time"]
        assert time_obj["hours"] == 8
        assert time_obj["minutes"] == 30
        assert time_obj["seconds"] == 45
        assert time_obj["nanos"] == 500000000


def test_daily_rollup_source_family(client_instance: GoogleHealthClient):
    """Valida envio de dataSourceFamily em dailyRollUp."""
    family = "users/me/dataSourceFamilies/google-sources"
    with patch.object(client_instance, "_post_json", return_value=({"rollupDataPoints": []}, None)) as mock_post:
        client_instance.daily_roll_up("steps", data_source_family=family)
        url, body = mock_post.call_args[0]
        assert body.get("dataSourceFamily") == family


def test_daily_rollup_response(client_instance: GoogleHealthClient):
    """Valida parsing de resposta de dailyRollUp contendo tempo civil."""
    mock_payload = {
        "rollupDataPoints": [
            {
                "interval": {
                    "civilStartTime": {"date": {"year": 2026, "month": 9, "day": 1}},
                    "civilEndTime": {"date": {"year": 2026, "month": 9, "day": 2}},
                },
                "steps": {"count": 8200},
            }
        ]
    }
    with patch.object(client_instance, "_post_json", return_value=(mock_payload, None)):
        aggs, err = client_instance.daily_roll_up("steps")
        assert err is None
        assert len(aggs) == 1
        assert aggs[0]["steps"]["count"] == 8200
