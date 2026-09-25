"""
Suíte de testes para validação e precisão do filtro temporal (P0.2 Codex).

Testes requeridos:
- test_server_side_filter_exact_timestamp
- test_client_validation_exact_timestamp
- test_cross_midnight_interval
- test_sub_day_interval
- test_timezone_boundary
- test_empty_interval
"""

from datetime import datetime, timezone, timedelta
import pytest

from longevidade.integrations.google_health.client import (
    build_server_filter,
    is_point_in_interval,
    parse_point_timestamp_utc,
    format_rfc3339_utc,
)


def test_server_side_filter_exact_timestamp():
    """Valida geração do filtro temporal server-side com formato canônico RFC 3339 UTC."""
    st = datetime(2026, 9, 1, 14, 30, 45, 123000, tzinfo=timezone.utc)
    et = datetime(2026, 9, 2, 18, 0, 0, tzinfo=timezone.utc)

    filter_str = build_server_filter(st, et)
    assert filter_str == 'start_time >= "2026-09-01T14:30:45.123000Z" AND end_time < "2026-09-02T18:00:00Z"'


def test_client_validation_exact_timestamp():
    """Valida que o cliente não trunca timestamps para YYYY-MM-DD e respeita frações de segundo."""
    st = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 1, 11, 0, 0, tzinfo=timezone.utc)

    # Ponto às 10:30:15 UTC (dentro)
    pt_inside = {
        "interval": {
            "startTime": {"physicalTime": "2026-09-01T10:30:15.500Z"},
            "endTime": {"physicalTime": "2026-09-01T10:45:00.000Z"},
        }
    }
    assert is_point_in_interval(pt_inside, st, et) is True

    # Ponto às 09:59:59.999 UTC (antes do início)
    pt_before = {
        "interval": {
            "startTime": {"physicalTime": "2026-09-01T09:59:59.999Z"},
        }
    }
    assert is_point_in_interval(pt_before, st, et) is False

    # Ponto às 11:00:00.001 UTC (após o fim)
    pt_after = {
        "interval": {
            "startTime": {"physicalTime": "2026-09-01T11:00:00.001Z"},
        }
    }
    assert is_point_in_interval(pt_after, st, et) is False


def test_cross_midnight_interval():
    """Valida intervalo que cruza a meia-noite sem perda de precisão."""
    # 23:00 do dia 1 até 02:00 do dia 2
    st = datetime(2026, 9, 1, 23, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 2, 2, 0, 0, tzinfo=timezone.utc)

    filter_str = build_server_filter(st, et)
    assert 'start_time >= "2026-09-01T23:00:00Z" AND end_time < "2026-09-02T02:00:00Z"' == filter_str

    pt_midnight = {"sampleTime": {"physicalTime": "2026-09-02T00:30:00Z"}}
    assert is_point_in_interval(pt_midnight, st, et) is True

    pt_outside_prev = {"sampleTime": {"physicalTime": "2026-09-01T22:30:00Z"}}
    assert is_point_in_interval(pt_outside_prev, st, et) is False

    pt_outside_next = {"sampleTime": {"physicalTime": "2026-09-02T02:30:00Z"}}
    assert is_point_in_interval(pt_outside_next, st, et) is False


def test_sub_day_interval():
    """Valida intervalo menor que 1 dia (sub-day) mantendo integridade horária."""
    st = datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 1, 8, 30, 0, tzinfo=timezone.utc)

    pt_in = {"startTime": "2026-09-01T08:15:00Z"}
    pt_out = {"startTime": "2026-09-01T08:35:00Z"}

    assert is_point_in_interval(pt_in, st, et) is True
    assert is_point_in_interval(pt_out, st, et) is False


def test_timezone_boundary():
    """Valida conversão e comparação consistente entre fusos horários não-UTC e UTC."""
    # Fuso de Brasília (-03:00): 10:00 = 13:00 UTC
    tz_br = timezone(timedelta(hours=-3))
    st_br = datetime(2026, 9, 1, 10, 0, 0, tzinfo=tz_br)
    et_br = datetime(2026, 9, 1, 12, 0, 0, tzinfo=tz_br)

    # Server filter é sempre formatado em UTC: 13:00Z a 15:00Z
    filter_str = build_server_filter(st_br, et_br)
    assert 'start_time >= "2026-09-01T13:00:00Z" AND end_time < "2026-09-01T15:00:00Z"' == filter_str

    # Ponto registrado em UTC às 14:00 (11:00 no Brasil)
    pt = {"recordedAt": "2026-09-01T14:00:00Z"}
    assert is_point_in_interval(pt, st_br, et_br) is True


def test_empty_interval():
    """Valida rejeição quando start_time >= end_time e comportamento com intervalo vazio/nulo."""
    with pytest.raises(ValueError, match="estritamente anterior"):
        build_server_filter(
            start_time=datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc),
        )

    with pytest.raises(ValueError, match="estritamente anterior"):
        build_server_filter(
            start_time=datetime(2026, 9, 1, 15, 0, 0, tzinfo=timezone.utc),
            end_time=datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc),
        )

    # Quando nenhum limite é passado
    assert build_server_filter(None, None) is None
    assert is_point_in_interval({"startTime": "2026-09-01T10:00:00Z"}, None, None) is True


def test_server_filter_data_types():
    """Valida que build_server_filter gera o member path correto para cada categoria (AIP-160)."""
    st = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 2, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Interval (steps, active-energy-burned) -> {type}.interval.start_time
    filter_steps = build_server_filter(st, et, data_type="steps")
    assert filter_steps == 'steps.interval.start_time >= "2026-09-01T10:00:00Z" AND steps.interval.start_time < "2026-09-02T10:00:00Z"'

    # 2. Sample (heart-rate, heart-rate-variability, weight) -> {type}.sample_time.physical_time
    filter_hr = build_server_filter(st, et, data_type="heart-rate")
    assert filter_hr == 'heart_rate.sample_time.physical_time >= "2026-09-01T10:00:00Z" AND heart_rate.sample_time.physical_time < "2026-09-02T10:00:00Z"'

    filter_hrv = build_server_filter(st, et, data_type="heart-rate-variability")
    assert filter_hrv == 'heart_rate_variability.sample_time.physical_time >= "2026-09-01T10:00:00Z" AND heart_rate_variability.sample_time.physical_time < "2026-09-02T10:00:00Z"'

    filter_weight = build_server_filter(st, et, data_type="weight")
    assert filter_weight == 'weight.sample_time.physical_time >= "2026-09-01T10:00:00Z" AND weight.sample_time.physical_time < "2026-09-02T10:00:00Z"'

    # 3. Daily (daily-resting-heart-rate, daily-heart-rate-variability) -> {type}.date
    filter_rhr = build_server_filter(st, et, data_type="daily-resting-heart-rate")
    assert filter_rhr == 'daily_resting_heart_rate.date >= "2026-09-01" AND daily_resting_heart_rate.date < "2026-09-02"'

    filter_dhrv = build_server_filter(st, et, data_type="daily-heart-rate-variability")
    assert filter_dhrv == 'daily_heart_rate_variability.date >= "2026-09-01" AND daily_heart_rate_variability.date < "2026-09-02"'

    # 4. Sleep Session (sleep) -> sleep.interval.end_time (A API Google rejeita start_time)
    filter_sleep = build_server_filter(st, et, data_type="sleep")
    assert filter_sleep == 'sleep.interval.end_time >= "2026-09-01T10:00:00Z" AND sleep.interval.end_time < "2026-09-02T10:00:00Z"'

    # Sleep defensivo client-side usa endTime
    pt_sleep_ok = {
        "interval": {
            "startTime": {"physicalTime": "2026-09-01T06:00:00Z"},
            "endTime": {"physicalTime": "2026-09-01T14:00:00Z"},
        }
    }
    assert is_point_in_interval(pt_sleep_ok, st, et, field_key="sleep") is True


def test_fetch_data_points_invalid_filter_auto_fallback(tmp_path):
    """Valida recuperação resiliente automática quando a Google Health API rejeita o filtro com INVALID_DATA_POINT_FILTER."""
    from unittest.mock import patch
    from longevidade.integrations.google_health.client import GoogleHealthClient, GoogleHealthCredentials

    creds = GoogleHealthCredentials(access_token="valid_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    st = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    et = datetime(2026, 9, 2, 0, 0, 0, tzinfo=timezone.utc)

    err_400 = 'HTTP 400: {"error": {"message": "Invalid data point filter: INVALID_DATA_POINT_FILTER_RESTRICTION_COMPARABLE"}}'
    mock_resp = {
        "dataPoints": [
            {"startTime": "2026-09-01T10:00:00Z", "steps": {"count": 4000}},
            {"startTime": "2026-09-03T10:00:00Z", "steps": {"count": 9999}},  # Fora do intervalo
        ]
    }

    # 1ª chamada com filter dá 400; 2ª chamada sem filter retorna sucesso
    with patch.object(client, "_get_json", side_effect=[(None, err_400), (mock_resp, None)]) as mock_get:
        pts, err = client.fetch_data_points("steps", start_time=st, end_time=et)
        assert err is None
        # Ponto fora do intervalo foi filtrado client-side por is_point_in_interval
        assert len(pts) == 1
        assert pts[0]["steps"]["count"] == 4000
        assert mock_get.call_count == 2
        # Segunda chamada teve o parâmetro filter removido
        assert "filter" not in mock_get.call_args_list[1][0][1]

