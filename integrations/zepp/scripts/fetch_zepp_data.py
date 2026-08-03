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
import json
import os
import sys
import time
from datetime import datetime, timezone, date, timedelta
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # ~/hermes-amazfit
ZEPP_CLI_DIR = BASE_DIR / "zepp-health-cli"
ZEPP_CLI = ZEPP_CLI_DIR / "zepp_health.py"
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)


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


def fetch_all_data(days: int = 14) -> dict:
    """Fetch all available data types and save to disk."""
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
    hrv = run_zepp_cmd("events", "--preset", "hrv", "--days", str(days))
    save_json(readiness, "readiness.json")
    save_json(stress, "stress.json")
    save_json(hrv, "hrv.json")
    r_count = len(readiness.get("items", []))
    s_count = len(stress.get("items", []))
    h_count = len(hrv.get("items", []))
    print(f"R:{r_count} S:{s_count} HRV:{h_count}")
    results["readiness"] = readiness
    results["stress"] = stress
    results["hrv"] = hrv

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

    # Save metadata
    meta = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "days": days,
        "elapsed_seconds": round(elapsed, 1),
        "data_types": list(results.keys()),
        "sample_counts": {
            k: len((v.get("items") or v.get("data") or []))
            for k, v in results.items()
        },
    }
    save_json(meta, "metadata.json")

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
            sleep_min = sleep.get("dp", 0) + sleep.get("lt", 0)  # deep + light

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
