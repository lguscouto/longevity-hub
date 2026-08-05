"""Safe validation and comparison helpers for Zepp collection snapshots."""

from __future__ import annotations

import base64
import binascii
import math
from datetime import date
from typing import Any


_RECORD_PATHS: dict[str, tuple[str, ...]] = {
    "band_data": ("data",),
    "workout_history": ("data", "summary"),
}

_DATE_KEYS: dict[str, tuple[str, ...]] = {
    "band_data": ("date_time", "date"),
    "training_load": ("dayId",),
    "weight": ("generatedTime", "createTime"),
    "vo2_max": ("generatedTime",),
}


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        parsed = float(value.strip()) if isinstance(value, str) else float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return parsed if math.isfinite(parsed) else None


def _records(data_type: str, payload: dict[str, Any]) -> tuple[list[dict[str, Any]] | None, str]:
    if data_type in _RECORD_PATHS:
        current: Any = payload
        path = _RECORD_PATHS[data_type]
        for key in path:
            if not isinstance(current, dict) or key not in current:
                return None, ".".join(path)
            current = current[key]
    else:
        if "items" in payload:
            current = payload["items"]
            path = "items"
        elif "data" in payload:
            current = payload["data"]
            path = "data"
        else:
            return None, "items"
    if not isinstance(current, list):
        return None, path
    return [item for item in current if isinstance(item, dict)], path


def _date_is_valid(value: Any) -> bool:
    if not isinstance(value, str) or len(value) < 10:
        return False
    try:
        date.fromisoformat(value[:10])
    except ValueError:
        return False
    return True


def _record_has_date(data_type: str, record: dict[str, Any]) -> bool:
    for key in _DATE_KEYS.get(data_type, ("timestamp",)):
        value = record.get(key)
        if key in {"generatedTime", "createTime", "timestamp", "trackid"}:
            if _number(value) is not None:
                return True
        elif _date_is_valid(value):
            return True
    if _number(record.get("timestamp")) is not None or _number(record.get("trackid")) is not None:
        return True
    value = record.get("value")
    return isinstance(value, dict) and _number(value.get("timestamp")) is not None


def _named_numbers(node: Any, aliases: set[str]) -> list[float]:
    values: list[float] = []
    if isinstance(node, dict):
        for key, value in node.items():
            normalized = str(key).replace("_", "").lower()
            number = _number(value)
            if normalized in aliases and number is not None:
                values.append(number)
            values.extend(_named_numbers(value, aliases))
    elif isinstance(node, list):
        for value in node:
            values.extend(_named_numbers(value, aliases))
    return values


def validate_payload(data_type: str, payload: Any) -> dict[str, Any]:
    """Validate a single saved API response without returning source values."""
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(payload, dict):
        return {
            "status": "invalid",
            "record_count": 0,
            "errors": ["payload_not_object"],
            "warnings": [],
        }

    if payload.get("error"):
        return {
            "status": "invalid",
            "record_count": 0,
            "errors": ["api_error"],
            "warnings": [],
        }

    records, path = _records(data_type, payload)
    if records is None:
        errors.append(f"missing_records:{path}")
        records = []
    if not records:
        warnings.append("empty_records")

    for record in records:
        if not _record_has_date(data_type, record):
            warnings.append("record_missing_date")
        if data_type == "band_data":
            summary = record.get("summary")
            if not isinstance(summary, str) or not summary:
                warnings.append("record_missing_summary")
            else:
                try:
                    decoded = base64.b64decode(summary, validate=True).decode("utf-8")
                except (ValueError, UnicodeDecodeError, binascii.Error):
                    warnings.append("record_invalid_summary")
                else:
                    if not decoded.strip().startswith("{"):
                        warnings.append("record_invalid_summary")
        elif data_type == "workout_history":
            if _number(record.get("trackid")) is None:
                warnings.append("record_missing_trackid")
            if "run_time" in record and _number(record.get("run_time")) is None:
                warnings.append("record_invalid_run_time")
        elif data_type == "hrv":
            value = record.get("value")
            samples = value.get("samples") if isinstance(value, dict) else None
            if not isinstance(samples, list) or not samples:
                warnings.append("record_missing_samples")
            else:
                for sample in samples:
                    if not isinstance(sample, dict) or _number(sample.get("hrv")) is None:
                        warnings.append("sample_invalid_hrv")
                    if not isinstance(sample, dict) or _number(sample.get("s")) is None:
                        warnings.append("sample_invalid_offset")
                    elif _number(sample.get("hrv")) is not None and not 1 <= float(sample["hrv"]) <= 200:
                        warnings.append("sample_hrv_out_of_expected_range")
        elif data_type in {"spo2", "spo2_odi", "spo2_osa", "respiratory", "blood_pressure", "pai"}:
            numbers = _named_numbers(record, {
                "spo2", "bloodoxygen", "oxygensaturation", "respiratoryrate",
                "breathsperminute", "systolic", "diastolic", "sbp", "dbp",
                "odi", "osaevents", "pai", "paiindex", "paipoints",
            })
            for number in numbers:
                if data_type == "spo2" and not 1 <= number <= 100:
                    warnings.append("spo2_out_of_expected_range")
                elif data_type == "respiratory" and not 1 <= number <= 80:
                    warnings.append("respiratory_out_of_expected_range")
                elif data_type == "blood_pressure" and not 20 <= number <= 300:
                    warnings.append("blood_pressure_out_of_expected_range")

    status = "invalid" if errors else "partial" if warnings else "valid"
    return {
        "status": status,
        "record_count": len(records),
        "errors": sorted(set(errors)),
        "warnings": sorted(set(warnings)),
    }


def validate_payloads(payloads: dict[str, Any]) -> dict[str, Any]:
    """Validate all collected payloads and aggregate only safe diagnostics."""
    by_type = {
        data_type: validate_payload(data_type, payload)
        for data_type, payload in payloads.items()
    }
    statuses = {report["status"] for report in by_type.values()}
    status = "invalid" if "invalid" in statuses else "partial" if "partial" in statuses else "valid"
    return {
        "status": status,
        "types": by_type,
        "error_count": sum(len(report["errors"]) for report in by_type.values()),
        "warning_count": sum(len(report["warnings"]) for report in by_type.values()),
    }


def _file_map(manifest: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(manifest, dict):
        return {}
    files = manifest.get("files")
    if not isinstance(files, list):
        return {}
    return {
        entry["filename"]: entry
        for entry in files
        if isinstance(entry, dict) and isinstance(entry.get("filename"), str)
    }


def diff_manifests(previous: Any, current: Any) -> dict[str, Any]:
    """Compare file-level integrity and record metadata between two snapshots."""
    previous_files = _file_map(previous)
    current_files = _file_map(current)
    if not previous_files:
        status = "initial"
    else:
        status = "changed"

    added = sorted(set(current_files) - set(previous_files))
    removed = sorted(set(previous_files) - set(current_files))
    unchanged: list[str] = []
    changed: list[dict[str, Any]] = []
    for filename in sorted(set(previous_files) & set(current_files)):
        old = previous_files[filename]
        new = current_files[filename]
        if old.get("sha256") == new.get("sha256"):
            unchanged.append(filename)
            continue
        old_count = old.get("record_count")
        new_count = new.get("record_count")
        delta = new_count - old_count if isinstance(old_count, int) and isinstance(new_count, int) else None
        changed.append(
            {
                "filename": filename,
                "previous_sha256": old.get("sha256"),
                "current_sha256": new.get("sha256"),
                "previous_record_count": old_count,
                "current_record_count": new_count,
                "record_count_delta": delta,
                "date_range_changed": (
                    old.get("date_start") != new.get("date_start")
                    or old.get("date_end") != new.get("date_end")
                ),
            }
        )

    if previous_files and not (added or removed or changed):
        status = "unchanged"
    elif previous_files:
        status = "changed"

    return {
        "status": status,
        "previous_fetched_at": previous.get("fetched_at") if isinstance(previous, dict) else None,
        "current_fetched_at": current.get("fetched_at") if isinstance(current, dict) else None,
        "added_files": added,
        "removed_files": removed,
        "changed_files": changed,
        "unchanged_files": unchanged,
    }
