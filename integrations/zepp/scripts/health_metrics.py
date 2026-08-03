"""Pure normalization of locally saved Zepp JSON snapshots.

This module does not fetch data, write files, or expose source payloads.  It
returns one stable, workbook-ready record for a requested calendar date.
"""

from __future__ import annotations

import base64
import binascii
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any


_RECORD_KEYS = (
    "data_referencia",
    "passos_zepp",
    "sono_zepp_min",
    "peso_kg",
    "data_pesagem",
    "imc",
    "fc_repouso_bpm",
    "fc_media_bpm",
    "hrv_sono_ms",
    "rhr_sono_bpm",
    "readiness",
    "carga_diaria",
    "carga_acumulada",
    "faixa_carga_min",
    "faixa_carga_max",
    "treinos_zepp_qtd",
    "duracao_treinos_min",
    "amostras_estresse",
    "amostras_temperatura",
    "temperatura_c",
    "body_battery_inicial",
    "body_battery_final",
    "vo2_max",
    "status_dados",
)


def _reference_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _read_json(data_dir: Path, filename: str) -> tuple[dict[str, Any], bool]:
    """Return a JSON object and whether the source was usable."""
    path = data_dir / filename
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}, False
    return (payload, isinstance(payload, dict))


def _items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    items = payload.get("items", [])
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


def _day_from_timestamp(value: Any) -> date | None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    timestamp = float(value)
    if timestamp > 10_000_000_000:
        timestamp /= 1000
    try:
        return datetime.fromtimestamp(timestamp, timezone.utc).date()
    except (OverflowError, OSError, ValueError):
        return None


def _day_for_item(item: dict[str, Any]) -> date | None:
    for key in ("date_time", "date", "dayId"):
        value = item.get(key)
        if isinstance(value, str):
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                pass

    value = item.get("value")
    if isinstance(value, dict):
        event_day = _day_from_timestamp(value.get("timestamp"))
        if event_day is not None:
            return event_day
    return _day_from_timestamp(item.get("timestamp"))


def _number(value: Any) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


def _valid_readiness_number(value: Any) -> int | float | None:
    number = _number(value)
    return None if number == 255 else number


def _decode_band_summary(summary_base64: Any) -> dict[str, Any] | None:
    if not isinstance(summary_base64, str) or not summary_base64:
        return None
    try:
        decoded = base64.b64decode(summary_base64, validate=True).decode("utf-8")
        summary = json.loads(decoded)
    except (ValueError, UnicodeDecodeError, binascii.Error, json.JSONDecodeError):
        return None
    return summary if isinstance(summary, dict) else None


def _select_band_values(payload: dict[str, Any], reference: date) -> tuple[int | float | None, int | float | None]:
    entries = payload.get("data", [])
    if not isinstance(entries, list):
        return None, None
    for entry in entries:
        if not isinstance(entry, dict) or _day_for_item(entry) != reference:
            continue
        summary = _decode_band_summary(entry.get("summary"))
        if summary is None:
            continue
        steps = _number((summary.get("stp") or {}).get("ttl"))
        sleep = summary.get("slp") or {}
        if not isinstance(sleep, dict):
            sleep = {}
        deep_sleep = _number(sleep.get("dp"))
        light_sleep = _number(sleep.get("lt"))
        sleep_minutes = None
        if deep_sleep is not None or light_sleep is not None:
            sleep_minutes = (deep_sleep or 0) + (light_sleep or 0)
        return steps, sleep_minutes
    return None, None


def _select_training_load(payload: dict[str, Any], reference: date) -> dict[str, int | float | None]:
    for item in _items(payload):
        if _day_for_item(item) == reference:
            return {
                "carga_diaria": _number(item.get("currnetDayTrainLoad")),
                "carga_acumulada": _number(item.get("wtlSum")),
                "faixa_carga_min": _number(item.get("wtlSumOptimalMin")),
                "faixa_carga_max": _number(item.get("wtlSumOptimalMax")),
            }
    return {key: None for key in ("carga_diaria", "carga_acumulada", "faixa_carga_min", "faixa_carga_max")}


def _select_weight(payload: dict[str, Any], reference: date) -> tuple[int | float | None, str | None, int | float | None]:
    candidates: list[tuple[date, dict[str, Any]]] = []
    for item in _items(payload):
        item_day = _day_from_timestamp(item.get("generatedTime")) or _day_from_timestamp(item.get("createTime"))
        summary = item.get("summary")
        if item_day is None or item_day > reference or not isinstance(summary, dict):
            continue
        if _number(summary.get("weight")) is not None:
            candidates.append((item_day, summary))
    if not candidates:
        return None, None, None
    measured_on, summary = max(candidates, key=lambda candidate: candidate[0])
    return _number(summary.get("weight")), measured_on.isoformat(), _number(summary.get("bmi"))


def _heart_rate_values(payload: dict[str, Any], reference: date) -> tuple[int | float | None, int | float | None]:
    day_items = [item for item in _items(payload) if _day_for_item(item) == reference]
    values = [_number(item.get("value")) for item in day_items]
    valid_values = [value for value in values if value is not None]
    average = sum(valid_values) / len(valid_values) if valid_values else None
    resting_values = [
        _number(item.get("value"))
        for item in day_items
        if item.get("type") == 1 or item.get("subType") == "resting"
    ]
    resting = next((value for value in reversed(resting_values) if value is not None), None)
    return resting, average


def _readiness_values(payload: dict[str, Any], reference: date) -> tuple[int | float | None, int | float | None, int | float | None]:
    candidates = [item for item in _items(payload) if _day_for_item(item) == reference]
    if not candidates:
        return None, None, None

    def update_time(item: dict[str, Any]) -> float:
        value = item.get("value")
        if not isinstance(value, dict):
            return float("-inf")
        timestamp = value.get("timestampUpdate", item.get("timestamp", 0))
        return float(timestamp) if isinstance(timestamp, (int, float)) else float("-inf")

    latest = max(candidates, key=update_time)
    value = latest.get("value")
    if not isinstance(value, dict):
        return None, None, None
    return (
        _valid_readiness_number(value.get("rdnsScore")),
        _valid_readiness_number(value.get("sleepHRV")),
        _valid_readiness_number(value.get("sleepRHR")),
    )


def _workout_values(payload: dict[str, Any]) -> tuple[int, int | float | None]:
    data = payload.get("data")
    summaries = data.get("summary") if isinstance(data, dict) else None
    if not isinstance(summaries, list) or not summaries:
        return 0, None

    durations: list[int | float] = []
    for workout in summaries:
        if not isinstance(workout, dict):
            continue
        duration = next((_number(workout.get(key)) for key in ("duration", "durationTime", "totalTime") if _number(workout.get(key)) is not None), None)
        if duration is not None:
            durations.append(duration / 60 if duration >= 60 else duration)
    return len([workout for workout in summaries if isinstance(workout, dict)]), (sum(durations) if durations else None)


def _count_items_for_day(payload: dict[str, Any], reference: date) -> int:
    """Count top-level event items only; opaque nested payloads stay opaque."""
    return sum(1 for item in _items(payload) if _day_for_item(item) == reference)


def _vo2_value(payload: dict[str, Any], reference: date) -> int | float | None:
    candidates: list[tuple[date, dict[str, Any]]] = []
    for item in _items(payload):
        item_day = _day_for_item(item)
        if item_day is not None and item_day <= reference:
            candidates.append((item_day, item))
    if not candidates:
        return None
    _, item = max(candidates, key=lambda candidate: candidate[0])

    for key in ("vo2_max_run", "vo2MaxRun", "vo2_max_walking", "vo2MaxWalking", "vo2Max", "vo2_max"):
        result = _number(item.get(key))
        if result not in (None, 0):
            return result

    value = item.get("value")
    if isinstance(value, dict):
        for key in ("vo2_max_run", "vo2MaxRun", "vo2_max_walking", "vo2MaxWalking", "vo2Max", "vo2_max", "value"):
            result = _number(value.get(key))
            if result not in (None, 0):
                return result
    result = _number(value)
    return None if result == 0 else result


def reconcile_metric(
    zepp_value: Any,
    google_value: Any,
    primary_source: str = "Zepp",
) -> tuple[Any | None, str]:
    """Prefer Zepp, use Google Fit only when Zepp has no value."""
    if zepp_value is not None:
        return zepp_value, primary_source
    if google_value is not None:
        return google_value, "Google Fit"
    return None, "indisponível"


def merge_google_fit_metrics(zepp_record: dict[str, Any], google_metrics: Any) -> dict[str, Any]:
    """Add optional Fit values while retaining every Zepp record field.

    ``google_metrics`` is intentionally duck-typed so this pure reconciler
    stays independent from the runtime HTTP/token reader.
    """
    record = dict(zepp_record)
    google_steps = getattr(google_metrics, "steps", None)
    google_sleep = getattr(google_metrics, "sleep_minutes", None)
    consolidated_steps, steps_source = reconcile_metric(record.get("passos_zepp"), google_steps)
    consolidated_sleep, sleep_source = reconcile_metric(record.get("sono_zepp_min"), google_sleep)

    record["passos_google_fit"] = google_steps
    record["passos_consolidado"] = consolidated_steps
    record["fonte_passos"] = steps_source
    record["sono_google_fit_min"] = google_sleep
    record["sono_consolidado_min"] = consolidated_sleep
    record["fonte_sono"] = sleep_source

    errors = getattr(google_metrics, "errors", ())
    safe_errors = [error for error in errors if isinstance(error, str) and error]
    if safe_errors:
        status = record.get("status_dados")
        prefix = status.strip().rstrip(".") if isinstance(status, str) and status.strip() else "dados normalizados do Zepp"
        record["status_dados"] = f"{prefix}. Google Fit: {'; '.join(safe_errors)}."
    return record


def build_zepp_daily_record(data_dir: str | Path, reference_date: str | date | datetime) -> dict[str, Any]:
    """Build a stable normalized Zepp record for ``reference_date``.

    ``data_dir`` is read-only input. Missing or invalid snapshot files produce
    null metrics and a concise status message rather than an exception.
    """
    reference = _reference_date(reference_date)
    directory = Path(data_dir)
    payloads: dict[str, dict[str, Any]] = {}
    available: dict[str, bool] = {}
    for name in (
        "band_data",
        "training_load",
        "weight",
        "heart_rate",
        "readiness",
        "workout_history",
        "stress",
        "temperature",
        "vo2_max",
    ):
        payloads[name], available[name] = _read_json(directory, f"{name}.json")

    steps, sleep_minutes = _select_band_values(payloads["band_data"], reference)
    load = _select_training_load(payloads["training_load"], reference)
    weight, weighing_date, bmi = _select_weight(payloads["weight"], reference)
    resting_hr, average_hr = _heart_rate_values(payloads["heart_rate"], reference)
    readiness, sleep_hrv, sleep_rhr = _readiness_values(payloads["readiness"], reference)
    workout_count, workout_duration = _workout_values(payloads["workout_history"])

    missing = []
    if resting_hr is None and average_hr is None:
        missing.append("ausência de frequência cardíaca")
    if steps is None and sleep_minutes is None:
        missing.append("ausência de passos/sono")
    unavailable = [name for name, is_available in available.items() if not is_available]
    status_parts = ["dados normalizados do Zepp"]
    if missing:
        status_parts.append("; ".join(missing))
    if unavailable:
        status_parts.append("arquivos indisponíveis: " + ", ".join(unavailable))

    # The physical interpretations of the current temperature and body-battery
    # payloads have not been documented. Deliberately leave these null.
    return {
        "data_referencia": reference.isoformat(),
        "passos_zepp": steps,
        "sono_zepp_min": sleep_minutes,
        "peso_kg": weight,
        "data_pesagem": weighing_date,
        "imc": bmi,
        "fc_repouso_bpm": resting_hr if resting_hr is not None else sleep_rhr,
        "fc_media_bpm": average_hr,
        "hrv_sono_ms": sleep_hrv,
        "rhr_sono_bpm": sleep_rhr,
        "readiness": readiness,
        "carga_diaria": load["carga_diaria"],
        "carga_acumulada": load["carga_acumulada"],
        "faixa_carga_min": load["faixa_carga_min"],
        "faixa_carga_max": load["faixa_carga_max"],
        "treinos_zepp_qtd": workout_count,
        "duracao_treinos_min": workout_duration,
        "amostras_estresse": _count_items_for_day(payloads["stress"], reference),
        "amostras_temperatura": _count_items_for_day(payloads["temperature"], reference),
        "temperatura_c": None,
        "body_battery_inicial": None,
        "body_battery_final": None,
        "vo2_max": _vo2_value(payloads["vo2_max"], reference),
        "status_dados": ". ".join(status_parts) + ".",
    }
