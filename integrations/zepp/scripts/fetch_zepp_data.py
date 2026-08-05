#!/usr/bin/env python3
"""
Hermes ↔ Amazfit/Zepp Integration — Data Fetcher

Fetches all health data from Zepp API using zepp_health.py and saves
structured JSON to the data directory. Runs as a standalone script or
via Hermes cron job.

Usage:
    python fetch_zepp_data.py              # fetch last 14 days
    python fetch_zepp_data.py --days 30    # fetch last 30 days
    python fetch_zepp_data.py --summary    # print summary to stdout
    python fetch_zepp_data.py --all        # fetch ALL available data types
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# Force UTF-8 encoding for stdout/stderr on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Paths ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # ~/hermes-amazfit
ZEPP_CLI_DIR = BASE_DIR / "zepp-health-cli"
ZEPP_CLI = ZEPP_CLI_DIR / "zepp_health.py"
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

try:
    from .zepp_quality import diff_manifests, validate_payloads
except ImportError:  # pragma: no cover - supports direct script execution
    from zepp_quality import diff_manifests, validate_payloads


def load_config() -> dict:
    """Load config from config.json or env vars (same logic as zepp_health.py)."""
    config_paths = [
        ZEPP_CLI_DIR / "config.json",
        Path.home() / ".config" / "zepp" / "config.json",
    ]
    for p in config_paths:
        if p.is_file():
            return json.loads(p.read_text())

    # Try env vars
    token = os.environ.get("ZEPP_APP_TOKEN", "").strip()
    user_id = os.environ.get("ZEPP_USER_ID", "").strip()
    if token and user_id:
        return {
            "app_token": token,
            "user_id": user_id,
            "host": os.environ.get("ZEPP_HOST", "api-mifit-us3.zepp.com"),
        }

    return {}


def check_config() -> bool:
    """Return True if config is properly set up."""
    cfg = load_config()
    return bool(cfg.get("app_token") and cfg.get("user_id"))


def run_zepp_cmd(subcommand: str, *args: str) -> dict:
    """Run a zepp_health.py subcommand and return parsed JSON."""
    import subprocess

    cmd = [
        sys.executable,
        str(ZEPP_CLI),
        "--config",
        str(ZEPP_CLI_DIR / "config.json"),
        subcommand,
        "--json",
    ] + list(args)

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, cwd=str(ZEPP_CLI_DIR))

    if result.returncode != 0:
        print(f"[WARN] {subcommand} failed: {result.stderr.strip()}", file=sys.stderr)
        return {"error": result.stderr.strip(), "returncode": result.returncode}

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON response", "raw": result.stdout[:500]}


def save_json(data: dict, filename: str) -> Path:
    """Save data to DATA_DIR/filename with timestamp."""
    path = DATA_DIR / filename
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return path


def _payload_records(data_type: str, payload: dict) -> list[dict]:
    """Return the records represented by a Zepp response for counting/audit."""
    if data_type == "workout_history":
        data = payload.get("data")
        records = data.get("summary") if isinstance(data, dict) else None
    elif data_type == "band_data":
        records = payload.get("data")
    else:
        records = payload.get("items")
        if not isinstance(records, list):
            records = payload.get("data")
    return [record for record in records if isinstance(record, dict)] if isinstance(records, list) else []


def _record_date(record: dict) -> date | None:
    for key in ("date_time", "date", "dayId"):
        value = record.get(key)
        if isinstance(value, str):
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                pass

    candidates = [record.get(key) for key in ("timestamp", "trackid", "generatedTime", "createTime")]
    value = record.get("value")
    if isinstance(value, dict):
        candidates.insert(0, value.get("timestamp"))
    for candidate in candidates:
        try:
            timestamp = float(candidate)
        except (TypeError, ValueError):
            continue
        if timestamp > 10_000_000_000:
            timestamp /= 1000
        try:
            return datetime.fromtimestamp(timestamp, timezone.utc).date()
        except (OverflowError, OSError, ValueError):
            continue
    return None


def _payload_record_count(data_type: str, payload: dict) -> int:
    return len(_payload_records(data_type, payload))


def _payload_nested_sample_count(data_type: str, payload: dict) -> int:
    """Count preserved nested samples, especially HRV-RMSSD observations."""
    if data_type != "hrv":
        return 0
    total = 0
    for record in _payload_records(data_type, payload):
        value = record.get("value")
        samples = value.get("samples") if isinstance(value, dict) else None
        if isinstance(samples, list):
            total += sum(1 for sample in samples if isinstance(sample, dict))
    return total


def _collection_window(days: int) -> tuple[str, str, str]:
    timezone_name = os.environ.get("ZEPP_TIMEZONE", "America/Sao_Paulo")
    try:
        local_now = datetime.now(ZoneInfo(timezone_name))
    except Exception:
        timezone_name = "UTC"
        local_now = datetime.now(timezone.utc)
    start = (local_now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = local_now.replace(hour=23, minute=59, second=59, microsecond=0)
    return start.strftime("%Y-%m-%dT%H:%M:%S"), end.strftime("%Y-%m-%dT%H:%M:%S"), timezone_name


def build_data_manifest(
    data_dir: str | Path,
    fetched_at: str,
    days: int,
    data_types: list[str],
) -> dict:
    """Build a privacy-safe integrity manifest for saved Zepp snapshots."""
    directory = Path(data_dir)
    files = []
    all_dates: list[date] = []
    total_nested_sample_count = 0
    for data_type in data_types:
        path = directory / f"{data_type}.json"
        if not path.is_file():
            continue
        raw = path.read_bytes()
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        records = _payload_records(data_type, payload)
        record_dates = []
        for record in records:
            record_date = _record_date(record)
            if record_date is not None:
                record_dates.append(record_date)
        all_dates.extend(record_dates)
        nested_sample_count = _payload_nested_sample_count(data_type, payload)
        total_nested_sample_count += nested_sample_count
        files.append(
            {
                "filename": path.name,
                "sha256": hashlib.sha256(raw).hexdigest(),
                "size_bytes": len(raw),
                "record_count": len(records),
                "nested_sample_count": nested_sample_count,
                "date_start": min(record_dates).isoformat() if record_dates else None,
                "date_end": max(record_dates).isoformat() if record_dates else None,
            }
        )

    return {
        "schema_version": 2,
        "fetched_at": fetched_at,
        "days": days,
        "data_types": list(data_types),
        "total_record_count": sum(entry["record_count"] for entry in files),
        "total_nested_sample_count": total_nested_sample_count,
        "date_range": {
            "start": min(all_dates).isoformat() if all_dates else None,
            "end": max(all_dates).isoformat() if all_dates else None,
        },
        "files": files,
    }


def _save_manifest(manifest: dict) -> Path:
    return save_json(manifest, "manifest.json")


def _read_previous_manifest() -> dict:
    manifest_path = DATA_DIR / "manifest.json"
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def fetch_all_data(days: int = 14) -> dict:
    """Fetch all available data types and save to disk."""
    previous_manifest = _read_previous_manifest()
    results = {}
    start_time = time.time()

    # ── Heart Rate ──────────────────────────────────────────────────
    print(f"  ❤️  Heart rate (last {days}d)...", end=" ", flush=True)
    hr = run_zepp_cmd("heart-rate", "--days", str(days))
    save_json(hr, "heart_rate.json")
    hr_count = len(hr.get("items", []))
    print(f"{hr_count} samples")
    results["heart_rate"] = hr

    # ── Band Data (sleep + steps) ───────────────────────────────────
    print("  😴 Sleep & steps (band-data)...", end=" ", flush=True)
    band = run_zepp_cmd("band-data", "--days", str(days), "--query-type", "detail")
    save_json(band, "band_data.json")
    band_count = len(band.get("data", []))
    print(f"{band_count} days")
    results["band_data"] = band

    # ── Training Load ──────────────────────────────────────────────
    print(f"  🏋️  Training load (last {days}d)...", end=" ", flush=True)
    load = run_zepp_cmd("sport-load", "--days", str(days))
    save_json(load, "training_load.json")
    load_count = len(load.get("items", []))
    print(f"{load_count} days")
    results["training_load"] = load

    # ── Workout History ──────────────────────────────────────────
    # NOTE: Zepp API only exposes /v1/sport/run/history.json, but it returns
    # ALL workout types (running, strength, cycling, walking, etc.)
    # distinguished by the "type" field in each summary entry.
    print("  🏃 Workout history...", end=" ", flush=True)
    workouts = run_zepp_cmd("run-history")
    save_json(workouts, "workout_history.json")
    w_count = len((workouts.get("data") or {}).get("summary") or [])
    print(f"{w_count} workouts")
    results["workout_history"] = workouts

    # ── Stress / HRV / Readiness ────────────────────────────────────
    print("  🧘 Stress/HRV/Readiness...", end=" ", flush=True)
    readiness = run_zepp_cmd("events", "--preset", "readiness", "--days", str(days))
    stress = run_zepp_cmd("events", "--preset", "stress", "--days", str(days))
    hrv = run_zepp_cmd("events", "--preset", "hrv-rmssd", "--days", str(days))
    respiratory = run_zepp_cmd("events", "--preset", "respiratory", "--days", str(days))
    blood_pressure = run_zepp_cmd("events", "--preset", "blood-pressure", "--days", str(days))
    save_json(readiness, "readiness.json")
    save_json(stress, "stress.json")
    save_json(hrv, "hrv.json")
    save_json(respiratory, "respiratory.json")
    save_json(blood_pressure, "blood_pressure.json")
    r_count = len(readiness.get("items", []))
    s_count = len(stress.get("items", []))
    h_count = len(hrv.get("items", []))
    rr_count = len(respiratory.get("items", []))
    bp_count = len(blood_pressure.get("items", []))
    print(f"R:{r_count} S:{s_count} HRV:{h_count} RR:{rr_count} BP:{bp_count}")
    results["readiness"] = readiness
    results["stress"] = stress
    results["hrv"] = hrv
    results["respiratory"] = respiratory
    results["blood_pressure"] = blood_pressure

    # ── User timeline metrics ──────────────────────────────────────
    print("  🫁 SpO₂/ODI/OSA/PAI...", end=" ", flush=True)
    spo2 = run_zepp_cmd("user-events", "--preset", "spo2", "--days", str(days))
    pai = run_zepp_cmd("user-events", "--preset", "pai", "--days", str(days))
    all_day_stress = run_zepp_cmd("user-events", "--preset", "all-day-stress", "--days", str(days))
    start_iso, end_iso, timezone_name = _collection_window(days)
    spo2_odi = run_zepp_cmd(
        "user-events-day", "--preset", "spo2-odi", "--start", start_iso, "--end", end_iso, "--timezone", timezone_name
    )
    spo2_osa = run_zepp_cmd(
        "user-events-day", "--preset", "spo2-osa", "--start", start_iso, "--end", end_iso, "--timezone", timezone_name
    )
    for data_type, payload in (
        ("spo2", spo2),
        ("pai", pai),
        ("all_day_stress", all_day_stress),
        ("spo2_odi", spo2_odi),
        ("spo2_osa", spo2_osa),
    ):
        save_json(payload, f"{data_type}.json")
        results[data_type] = payload
    print(
        f"SpO₂:{len(spo2.get('items', []))} ODI:{len(spo2_odi.get('items', []))} "
        f"OSA:{len(spo2_osa.get('items', []))} PAI:{len(pai.get('items', []))}"
    )

    # ── Temperature ─────────────────────────────────────────────────
    print("  🌡️  Skin temperature...", end=" ", flush=True)
    temp = run_zepp_cmd("temperature", "--days", str(days), "--raw")
    save_json(temp, "temperature.json")
    t_count = len(temp.get("items", []))
    print(f"{t_count} samples")
    results["temperature"] = temp

    # ── Weight ──────────────────────────────────────────────────────
    print("  ⚖️  Weight records...", end=" ", flush=True)
    weight = run_zepp_cmd("weight", "--days", "90")
    save_json(weight, "weight.json")
    w_count = len(weight.get("items", []))
    print(f"{w_count} records")
    results["weight"] = weight

    # ── VO2 Max ─────────────────────────────────────────────────────
    print("  🫁 VO2 Max...", end=" ", flush=True)
    vo2 = run_zepp_cmd("vo2", "--days", str(max(days, 365)))
    save_json(vo2, "vo2_max.json")
    v_count = len(vo2.get("items", []))
    print(f"{v_count} records")
    results["vo2_max"] = vo2

    # ── Body Battery ────────────────────────────────────────────────
    print("  🔋 Body battery...", end=" ", flush=True)
    battery = run_zepp_cmd("events", "--preset", "body-battery", "--days", str(days))
    save_json(battery, "body_battery.json")
    b_count = len(battery.get("items", []))
    print(f"{b_count} samples")
    results["body_battery"] = battery

    elapsed = time.time() - start_time

    # Save metadata, validation and snapshot comparison.
    fetched_at = datetime.now(timezone.utc).isoformat()
    data_types = list(results.keys())
    sample_counts = {
        data_type: _payload_record_count(data_type, payload)
        for data_type, payload in results.items()
    }
    current_manifest = build_data_manifest(DATA_DIR, fetched_at, days, data_types)
    validation = validate_payloads(results)
    snapshot_diff = diff_manifests(previous_manifest, current_manifest)
    meta = {
        "fetched_at": fetched_at,
        "days": days,
        "elapsed_seconds": round(elapsed, 1),
        "data_types": data_types,
        "sample_counts": sample_counts,
        "manifest": "manifest.json",
        "snapshot_diff": "snapshot_diff.json",
        "timezone": timezone_name,
        "validation": validation,
        "snapshot_diff_summary": snapshot_diff,
    }
    save_json(meta, "metadata.json")
    _save_manifest(current_manifest)
    save_json(snapshot_diff, "snapshot_diff.json")

    if validation["status"] != "valid":
        print(
            f"[WARN] Snapshot validation: {validation['status']} "
            f"({validation['error_count']} errors, {validation['warning_count']} warnings)",
            file=sys.stderr,
        )
    if snapshot_diff["status"] != "unchanged":
        print(f"[INFO] Snapshot diff: {snapshot_diff['status']}")

    results["_meta"] = meta
    return results


def generate_summary(data_dir: Path | None = None) -> str:
    """Generate a human-readable summary from saved data files."""
    d = data_dir or DATA_DIR
    lines = []
    lines.append("═" * 60)
    lines.append("  📊 RESUMO AMAZFIT / ZEPP")
    lines.append("═" * 60)

    # Metadata
    meta_path = d / "metadata.json"
    if meta_path.is_file():
        meta = json.loads(meta_path.read_text())
        lines.append(f"  Última coleta: {meta.get('fetched_at', '?')}")
        lines.append(f"  Período: últimos {meta.get('days', '?')} dias")
        lines.append("")

    # Heart rate
    hr_path = d / "heart_rate.json"
    if hr_path.is_file():
        hr = json.loads(hr_path.read_text())
        items = hr.get("items", [])
        if items:
            resting = [i for i in items if i.get("type") == 1 or i.get("subType") == "resting"]
            latest_resting = resting[-1].get("value") if resting else "N/A"
            hr_values = [i.get("value") for i in items if i.get("value")]
            avg_hr = sum(hr_values) / len(hr_values) if hr_values else 0
            lines.append(f"  ❤️  FC Repouso: {latest_resting} bpm | Média: {avg_hr:.0f} bpm | {len(items)} amostras")

    # Band data (sleep + steps)
    band_path = d / "band_data.json"
    if band_path.is_file():
        band = json.loads(band_path.read_text())
        data_list = band.get("data", [])
        if data_list:
            lines.append(f"  😴 Sono + Passos: {len(data_list)} dias registrados")

    # Steps from band data (decode the base64 summary)
    steps_by_day = _extract_steps_sleep(band_path)
    if steps_by_day:
        recent = steps_by_day[-7:]  # last 7 days (already a list of tuples)
        lines.append("")
        lines.append("  ┌─ Últimos 7 dias ─────────────────────────────────┐")
        lines.append("  │ Data        │ Passos   │ Sono     │ Horas dormidas │")
        lines.append("  ├─────────────┼──────────┼──────────┼─────────────────┤")
        for day_str, info in recent:
            steps = info.get("steps", 0)
            sleep_min = info.get("sleep_min", 0)
            sleep_h = sleep_min // 60
            sleep_m = sleep_min % 60
            lines.append(f"  │ {day_str} │ {steps:>7,} │ {sleep_min:>4}min  │ {sleep_h}h{sleep_m:02d}m        │")
        lines.append("  └──────────────────────────────────────────────────┘")

    # Training load
    load_path = d / "training_load.json"
    if load_path.is_file():
        load = json.loads(load_path.read_text())
        items = load.get("items", [])
        if items:
            recent_load = items[-1] if items else {}
            lines.append(f"  🏋️  Carga de treino recente: {recent_load.get('currnetDayTrainLoad', 'N/A')}")

    # Weight
    weight_path = d / "weight.json"
    if weight_path.is_file():
        w = json.loads(weight_path.read_text())
        items = w.get("items", [])
        if items:
            # Weight values are nested in summary.weight
            weights = []
            for it in items:
                s = it.get("summary", {})
                wt = s.get("weight") if s else it.get("value")
                if wt:
                    weights.append(float(wt))
            if weights:
                latest_w = weights[-1]
                first_w = weights[0] if len(weights) > 1 else latest_w
                lines.append(f"  ⚖️  Peso atual: {latest_w:.1f} kg | Meta: 75 kg (de 90 kg)")

    lines.append("")
    lines.append("═" * 60)
    return "\n".join(lines)


def _extract_steps_sleep(band_path: Path) -> list[tuple[str, dict]]:
    """Extract steps and sleep summary from band_data.json."""
    import base64

    if not band_path.is_file():
        return []
    try:
        band = json.loads(band_path.read_text())
        data_list = band.get("data", [])
        result = []
        for entry in data_list:
            date_str = entry.get("date_time", entry.get("date", ""))
            summary_b64 = entry.get("summary", "")
            if not summary_b64:
                continue
            try:
                raw = base64.b64decode(summary_b64).decode("utf-8")
                summary = json.loads(raw)
            except Exception:
                continue

            steps = summary.get("stp", {}).get("ttl", 0)
            sleep = summary.get("slp", {})
            sleep_min = (
                sleep.get("dp", 0) + sleep.get("lt", 0) + sleep.get("dt", 0)
            )  # deep + light + REM

            result.append((date_str, {"steps": steps, "sleep_min": sleep_min, "raw": summary}))
        return sorted(result, key=lambda x: x[0])
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(description="Hermes ↔ Amazfit/Zepp Data Fetcher")
    parser.add_argument("--days", type=int, default=14, help="Days of history (default: 14)")
    parser.add_argument("--all", action="store_true", help="Fetch all available data types")
    parser.add_argument("--summary", action="store_true", help="Print summary from saved data")
    parser.add_argument("--check", action="store_true", help="Check if config is set up")
    parser.add_argument("--output-dir", type=str, help="Override data directory")
    args = parser.parse_args()

    if args.output_dir:
        global DATA_DIR
        DATA_DIR = Path(args.output_dir)
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    if args.check:
        if check_config():
            cfg = load_config()
            uid = cfg.get("user_id", "???")
            host = cfg.get("host", "???")
            print(f"✅ Config OK — user_id={uid}, host={host}")
        else:
            print("❌ Config MISSING — run 'python zepp_health.py init <capture.har>' first")
            print("   See: ~/hermes-amazfit/INSTRUCOES_TOKEN.md")
        return

    if args.summary:
        print(generate_summary(DATA_DIR))
        return

    if not check_config():
        print("❌ Zepp config not found!", file=sys.stderr)
        print("   First, capture your token → run 'python zepp_health.py init capture.har'", file=sys.stderr)
        print("   See: ~/hermes-amazfit/INSTRUCOES_TOKEN.md", file=sys.stderr)
        sys.exit(1)

    print(f"\n📡 Fetching Amazfit/Zepp data (last {args.days} days)...")
    print("─" * 50)
    results = fetch_all_data(days=args.days)
    meta = results["_meta"]
    print("─" * 50)
    print(f"✅ Done in {meta['elapsed_seconds']}s — data saved to {DATA_DIR}")
    print()

    # Print summary
    print(generate_summary(DATA_DIR))


if __name__ == "__main__":
    main()
