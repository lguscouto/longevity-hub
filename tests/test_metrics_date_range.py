from datetime import date, timedelta

from fastapi.testclient import TestClient


def _save_metric(client: TestClient, day: date, **values: object) -> None:
    response = client.post(
        "/api/metrics",
        json={"date_ref": day.isoformat(), **values},
    )
    assert response.status_code == 200


def test_metrics_interval_is_inclusive_ascending_and_keeps_legacy_days(client: TestClient) -> None:
    first = date(2026, 11, 1)
    _save_metric(client, first - timedelta(days=1), steps=111)
    _save_metric(client, first, steps=0, hrv_ms=40)
    _save_metric(client, first + timedelta(days=2), hrv_ms=51)
    _save_metric(client, first + timedelta(days=3), steps=999)

    response = client.get(
        "/api/metrics",
        params={"start_date": first.isoformat(), "end_date": (first + timedelta(days=2)).isoformat()},
    )
    assert response.status_code == 200
    assert [row["date_ref"] for row in response.json()] == [
        first.isoformat(),
        (first + timedelta(days=2)).isoformat(),
    ]
    assert response.json()[0]["steps"] == 0

    legacy = client.get("/api/metrics", params={"days": 2})
    assert legacy.status_code == 200
    assert [row["date_ref"] for row in legacy.json()] == [
        (first + timedelta(days=3)).isoformat(),
        (first + timedelta(days=2)).isoformat(),
    ]


def test_metrics_interval_validates_boundaries_and_empty_result(client: TestClient) -> None:
    start = date(2026, 1, 1)
    end = start + timedelta(days=89)

    accepted = client.get(
        "/api/metrics",
        params={"start_date": start.isoformat(), "end_date": end.isoformat()},
    )
    assert accepted.status_code == 200
    assert accepted.json() == []

    too_long = client.get(
        "/api/metrics",
        params={"start_date": start.isoformat(), "end_date": (end + timedelta(days=1)).isoformat()},
    )
    assert too_long.status_code == 422

    reversed_dates = client.get(
        "/api/metrics",
        params={"start_date": end.isoformat(), "end_date": start.isoformat()},
    )
    assert reversed_dates.status_code == 422

    partial_interval = client.get("/api/metrics", params={"start_date": start.isoformat()})
    assert partial_interval.status_code == 422

    conflicting_parameters = client.get(
        "/api/metrics",
        params={"start_date": start.isoformat(), "end_date": end.isoformat(), "days": 7},
    )
    assert conflicting_parameters.status_code == 422
