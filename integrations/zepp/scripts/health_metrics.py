"""Pure normalization of locally saved Zepp JSON snapshots.

This module does not fetch data, write files, or expose source payloads.  It
returns one stable, workbook-ready record for a requested calendar date.
"""

from __future__ import annotations

import base64
import binascii
import json
import math
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


_DEFAULT_TIMEZONE = "America/Sao_Paulo"


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
    "hrv_rmssd_media_ms",
    "amostras_hrv_rmssd",
    "rhr_sono_bpm",
    "spo2_media_pct",
    "spo2_min_pct",
    "spo2_max_pct",
    "amostras_spo2",
    "spo2_odi_index",
    "spo2_osa_decrease_pct",
    "frequencia_respiratoria_rpm",
    "pressao_sistolica_mmhg",
    "pressao_diastolica_mmhg",
    "pai",
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


def _day_from_timestamp(value: Any, timezone_name: str | None = None) -> date | None:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    try:
        timestamp = float(value.strip()) if isinstance(value, str) else float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(timestamp):
        return None
    if timestamp > 10_000_000_000:
        timestamp /= 1000
    try:
        name = timezone_name or os.environ.get("ZEPP_TIMEZONE", _DEFAULT_TIMEZONE)
        return datetime.fromtimestamp(timestamp, timezone.utc).astimezone(ZoneInfo(name)).date()
    except (OverflowError, OSError, ValueError, KeyError):
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

    for key in ("timestamp", "trackid", "generatedTime", "createTime"):
        item_day = _day_from_timestamp(item.get(key))
        if item_day is not None:
            return item_day
    return None


def _number(value: Any) -> int | float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return value if math.isfinite(float(value)) else None
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = float(value.strip())
    except ValueError:
        return None
    if not math.isfinite(parsed):
        return None
    return int(parsed) if parsed.is_integer() else parsed


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
        rem_sleep = _number(sleep.get("dt"))
        sleep_minutes = None
        if any(value is not None for value in (deep_sleep, light_sleep, rem_sleep)):
            sleep_minutes = (deep_sleep or 0) + (light_sleep or 0) + (rem_sleep or 0)
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


def _workout_values(
    payload: dict[str, Any], reference: date | None = None
) -> tuple[int | None, int | float | None]:
    if not isinstance(payload, dict) or payload.get("error") or not payload:
        return None, None

    data = payload.get("data")
    summaries = data.get("summary") if isinstance(data, dict) else None
    if not isinstance(summaries, list):
        return None, None

    if not summaries:
        return 0, None

    workouts = [
        workout
        for workout in summaries
        if isinstance(workout, dict)
        and (reference is None or _day_for_item(workout) == reference)
    ]
    if not workouts:
        return 0, None

    durations: list[int | float] = []
    for workout in workouts:
        duration = None
        is_seconds_key = False
        is_minutes_key = False
        for key in ("duration_min", "duration_minutes", "run_time", "duration", "durationTime", "totalTime", "total_time"):
            candidate = _number(workout.get(key))
            if candidate is not None:
                duration = candidate
                if key in ("duration_min", "duration_minutes"):
                    is_minutes_key = True
                elif key in ("run_time", "durationTime", "totalTime", "total_time"):
                    is_seconds_key = True
                break
        if duration is not None:
            unit_str = str(workout.get("unit") or "").lower()
            if is_minutes_key or "min" in unit_str or "m" == unit_str:
                durations.append(duration)
            elif is_seconds_key or "sec" in unit_str or "s" in unit_str:
                durations.append(duration / 60.0)
            elif is_minutes_key or is_seconds_key:
                durations.append(duration if is_minutes_key else duration / 60.0)
            # Generic key "duration" without explicit unit or flag is ambiguous — ignore to prevent wrong unit inference
    return len(workouts), (sum(durations) if durations else None)


def _count_items_for_day(payload: dict[str, Any], reference: date) -> int:
    """Count top-level event items only; opaque nested payloads stay opaque."""
    return sum(1 for item in _items(payload) if _day_for_item(item) == reference)


def _walk_metric_numbers(node: Any, aliases: set[str]) -> list[int | float]:
    if isinstance(node, str) and node[:1] in {"{", "["}:
        try:
            return _walk_metric_numbers(json.loads(node), aliases)
        except json.JSONDecodeError:
            return []
    values: list[int | float] = []
    if isinstance(node, dict):
        for key, value in node.items():
            normalized = str(key).replace("_", "").lower()
            if normalized in aliases:
                number = _number(value)
                if number is not None:
                    values.append(number)
            values.extend(_walk_metric_numbers(value, aliases))
    elif isinstance(node, list):
        for value in node:
            values.extend(_walk_metric_numbers(value, aliases))
    return values


def _event_metric_values(payload: dict[str, Any], reference: date, aliases: set[str]) -> list[int | float]:
    values: list[int | float] = []
    for item in _items(payload):
        if _day_for_item(item) != reference:
            continue
        values.extend(_walk_metric_numbers(item, aliases))
    return [value for value in values if value > 0]


def _aggregate(values: list[int | float]) -> tuple[int | float | None, int | float | None, int | float | None, int]:
    if not values:
        return None, None, None, 0
    average = sum(values) / len(values)
    return average, min(values), max(values), len(values)


def _hrv_rmssd_values(payload: dict[str, Any], reference: date) -> list[int | float]:
    values: list[int | float] = []
    for item in _items(payload):
        value = item.get("value")
        samples = value.get("samples") if isinstance(value, dict) else None
        if not isinstance(samples, list):
            continue
        start = value.get("startTime", item.get("timestamp")) if isinstance(value, dict) else item.get("timestamp")
        try:
            start_number = float(start)
        except (TypeError, ValueError):
            continue
        if start_number < 10_000_000_000:
            start_number *= 1000
        for sample in samples:
            if not isinstance(sample, dict):
                continue
            sample_value = _number(sample.get("hrv"))
            offset = _number(sample.get("s"))
            if sample_value is None or sample_value <= 0:
                continue
            timestamp = start_number + (offset or 0) * 1000
            if _day_from_timestamp(timestamp) == reference:
                values.append(sample_value)
    return values


def _respiratory_rate_values(payload: dict[str, Any], reference: date) -> list[int]:
    values: list[int] = []
    for item in _items(payload):
        if _day_for_item(item) != reference:
            continue
        val = item.get("value")
        if isinstance(val, dict):
            measurements_b64 = val.get("measurements")
            if isinstance(measurements_b64, str):
                try:
                    raw_bytes = base64.b64decode(measurements_b64)
                    for b in raw_bytes:
                        if 0 < b < 60:
                            values.append(b)
                except Exception:
                    pass
        values.extend([int(v) for v in _walk_metric_numbers(item, {"respiratoryrate", "breathsperminute", "respirationrate", "rate"}) if 0 < v < 60])
    return values


def _pai_score_value(payload: dict[str, Any], reference: date) -> float | None:
    for item in _items(payload):
        if _day_for_item(item) == reference:
            total_pai = _number(item.get("totalPai") or item.get("total_pai") or item.get("totalPaiScore"))
            if total_pai is not None:
                return total_pai
            daily_pai = _number(item.get("dailyPai") or item.get("daily_pai") or item.get("pai"))
            if daily_pai is not None:
                return daily_pai
    vals = _event_metric_values(payload, reference, {"totalpai", "totalpaiscore", "pai", "paiindex"})
    return vals[-1] if vals else None


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
        "hrv",
        "spo2",
        "spo2_odi",
        "spo2_osa",
        "respiratory",
        "blood_pressure",
        "pai",
    ):
        payloads[name], available[name] = _read_json(directory, f"{name}.json")

    steps, sleep_minutes = _select_band_values(payloads["band_data"], reference)
    load = _select_training_load(payloads["training_load"], reference)
    weight, weighing_date, bmi = _select_weight(payloads["weight"], reference)
    resting_hr, average_hr = _heart_rate_values(payloads["heart_rate"], reference)
    readiness, sleep_hrv, sleep_rhr = _readiness_values(payloads["readiness"], reference)
    workout_count, workout_duration = _workout_values(payloads["workout_history"], reference)
    hrv_rmssd = _hrv_rmssd_values(payloads["hrv"], reference)
    hrv_rmssd_avg = (sum(hrv_rmssd) / len(hrv_rmssd)) if hrv_rmssd else None
    spo2_avg, spo2_min, spo2_max, spo2_count = _aggregate(
        _event_metric_values(payloads["spo2"], reference, {"spo2", "bloodoxygen", "oxygensaturation", "oxygensaturationpercent"})
    )
    respiratory_values = _respiratory_rate_values(payloads["respiratory"], reference)
    respiratory_avg = (sum(respiratory_values) / len(respiratory_values)) if respiratory_values else None
    systolic_values = _event_metric_values(payloads["blood_pressure"], reference, {"systolic", "systolicbp", "sbp"})
    diastolic_values = _event_metric_values(payloads["blood_pressure"], reference, {"diastolic", "diastolicbp", "dbp"})
    odi_values = _event_metric_values(payloads["spo2_odi"], reference, {"odi", "odindex"})
    osa_decrease_values = _event_metric_values(payloads["spo2_osa"], reference, {"spodecrease", "spo2decrease"})
    pai = _pai_score_value(payloads["pai"], reference)

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
        "fc_repouso_bpm": resting_hr,
        "fc_media_bpm": average_hr,
        "hrv_sono_ms": sleep_hrv,
        "hrv_rmssd_media_ms": hrv_rmssd_avg,
        "amostras_hrv_rmssd": len(hrv_rmssd),
        "rhr_sono_bpm": sleep_rhr,
        "spo2_media_pct": spo2_avg,
        "spo2_min_pct": spo2_min,
        "spo2_max_pct": spo2_max,
        "amostras_spo2": spo2_count,
        "spo2_odi_index": odi_values[-1] if odi_values else None,
        "spo2_osa_decrease_pct": osa_decrease_values[-1] if osa_decrease_values else None,
        "frequencia_respiratoria_rpm": respiratory_avg,
        "pressao_sistolica_mmhg": systolic_values[-1] if systolic_values else None,
        "pressao_diastolica_mmhg": diastolic_values[-1] if diastolic_values else None,
        "pai": pai,
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
