"""Best-effort reader for daily Google Fit steps and sleep metrics.

The module keeps local Hermes credentials private. It does not print tokens or
raw service payloads, and every operational failure becomes a typed result.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


_FIT_BASE_URL = "https://www.googleapis.com/fitness/v1/users/me"
_SLEEP_ACTIVITY_TYPE = 72


@dataclass(frozen=True)
class GoogleFitDailyMetrics:
    """Normalized Google Fit values plus safe, machine-readable errors."""

    reference_date: str
    steps: int | float | None = None
    sleep_minutes: int | float | None = None
    errors: tuple[str, ...] = ()


def _token_path() -> Path:
    """Return only the configured local Hermes token path; do not read it here."""
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home) / "google_token.json"
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "hermes" / "google_token.json"
    return Path.home() / "AppData" / "Local" / "hermes" / "google_token.json"


def _reference_day(value: str | date | datetime) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _read_access_token() -> tuple[str | None, str | None]:
    """Load the local token only while the public runtime reader is called."""
    try:
        payload = json.loads(_token_path().read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None, "google_fit_token_indisponivel"
    if not isinstance(payload, dict):
        return None, "google_fit_token_invalido"
    token = payload.get("token") or payload.get("access_token")
    if not isinstance(token, str) or not token.strip():
        return None, "google_fit_token_invalido"
    return token, None


def _fetch_json(request: Request) -> tuple[dict[str, Any] | None, str | None]:
    """Fetch one fixed Google Fit endpoint without exposing response content."""
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        return None, f"http_{error.code}"
    except (URLError, OSError, TimeoutError, UnicodeDecodeError):
        return None, "http_indisponivel"
    except (json.JSONDecodeError, ValueError):
        return None, "json_invalido"
    return (payload, None) if isinstance(payload, dict) else (None, "json_invalido")


def _number(value: Any) -> int | float | None:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _daily_boundary_millis(reference: date) -> tuple[int, int]:
    """Use local calendar-day boundaries; the Fit service receives epoch millis."""
    start = datetime.combine(reference, time.min).astimezone()
    end = datetime.combine(reference, time.max).astimezone()
    return int(start.timestamp() * 1000), int(end.timestamp() * 1000) + 1


def _steps_request(token: str, reference: date) -> Request:
    start_millis, end_millis = _daily_boundary_millis(reference)
    body = {
        "aggregateBy": [{"dataTypeName": "com.google.step_count.delta"}],
        "bucketByTime": {"durationMillis": 86_400_000},
        "startTimeMillis": start_millis,
        "endTimeMillis": end_millis,
    }
    return Request(
        f"{_FIT_BASE_URL}/dataset:aggregate",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )


def _sessions_request(token: str) -> Request:
    # Google Fit rejects start/end query parameters for this endpoint. Filter below.
    return Request(
        f"{_FIT_BASE_URL}/sessions",
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )


def _extract_steps(payload: dict[str, Any]) -> int | float | None:
    total: int | float = 0
    found = False
    buckets = payload.get("bucket")
    if not isinstance(buckets, list):
        return None
    for bucket in buckets:
        if not isinstance(bucket, dict):
            continue
        datasets = bucket.get("dataset")
        if not isinstance(datasets, list):
            continue
        for dataset in datasets:
            if not isinstance(dataset, dict):
                continue
            points = dataset.get("point")
            if not isinstance(points, list):
                continue
            for point in points:
                if not isinstance(point, dict):
                    continue
                values = point.get("value")
                if not isinstance(values, list):
                    continue
                for value in values:
                    if not isinstance(value, dict):
                        continue
                    number = _number(value.get("intVal"))
                    if number is None:
                        number = _number(value.get("fpVal"))
                    if number is not None:
                        total += number
                        found = True
    return total if found else None


def _session_millis(session: dict[str, Any], key: str) -> int | None:
    try:
        value = int(session.get(key))
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


def _is_sleep_session(session: dict[str, Any]) -> bool:
    activity_type = session.get("activityType")
    if activity_type == _SLEEP_ACTIVITY_TYPE or str(activity_type) == str(_SLEEP_ACTIVITY_TYPE):
        return True
    name = session.get("name")
    return isinstance(name, str) and ("sleep" in name.lower() or "sono" in name.lower())


def _extract_sleep_minutes(payload: dict[str, Any], reference: date) -> int | float | None:
    """Filter all sessions locally and deduplicate exact sleep-session copies."""
    sessions = payload.get("session")
    if not isinstance(sessions, list):
        return None
    seen: set[tuple[int, int]] = set()
    total_minutes: float = 0
    found = False
    for session in sessions:
        if not isinstance(session, dict) or not _is_sleep_session(session):
            continue
        start = _session_millis(session, "startTimeMillis")
        end = _session_millis(session, "endTimeMillis")
        if start is None or end is None or end <= start or (start, end) in seen:
            continue
        try:
            wake_day = datetime.fromtimestamp(end / 1000).astimezone().date()
        except (OverflowError, OSError, ValueError):
            continue
        if wake_day != reference:
            continue
        seen.add((start, end))
        total_minutes += (end - start) / 60_000
        found = True
    return int(total_minutes) if found and total_minutes.is_integer() else (total_minutes if found else None)


def read_google_fit_daily_metrics(reference_date: str | date | datetime) -> GoogleFitDailyMetrics:
    """Read Fit steps and sleep as an optional, non-throwing source.

    Steps are requested only through ``dataset:aggregate``. Sleep is read from
    the unparameterized session endpoint then selected locally by wake date;
    non-sleep fragments are never treated as workout data.
    """
    reference = _reference_day(reference_date)
    if reference is None:
        return GoogleFitDailyMetrics(str(reference_date), errors=("google_fit_data_referencia_invalida",))
    try:
        token, token_error = _read_access_token()
        if token_error or token is None:
            return GoogleFitDailyMetrics(reference.isoformat(), errors=(token_error or "google_fit_token_invalido",))

        errors: list[str] = []
        steps_payload, steps_error = _fetch_json(_steps_request(token, reference))
        steps = _extract_steps(steps_payload) if steps_payload is not None else None
        if steps_error:
            errors.append(f"google_fit_passos_{steps_error}")

        sessions_payload, sessions_error = _fetch_json(_sessions_request(token))
        sleep_minutes = _extract_sleep_minutes(sessions_payload, reference) if sessions_payload is not None else None
        if sessions_error:
            errors.append(f"google_fit_sono_{sessions_error}")
        return GoogleFitDailyMetrics(reference.isoformat(), steps, sleep_minutes, tuple(errors))
    except Exception:
        # Best-effort integration: unexpected local/HTTP parsing failures remain data errors.
        return GoogleFitDailyMetrics(reference.isoformat(), errors=("google_fit_erro_inesperado",))
