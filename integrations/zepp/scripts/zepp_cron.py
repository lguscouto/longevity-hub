#!/usr/bin/env python3
"""
Hermes Cron Script — Amazfit/Zepp Data Collection

This script is designed to be run by a Hermes cron job.
It fetches fresh data and outputs a formatted summary for delivery.

Expected environment:
  - ZEPP_CONFIG path is set (or config.json is in the expected location)
  - Python with requests installed
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Force UTF-8 encoding for stdout/stderr on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Paths ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ZEPP_CLI = BASE_DIR / "zepp-health-cli" / "zepp_health.py"
CONFIG_PATH = BASE_DIR / "zepp-health-cli" / "config.json"

os.environ["ZEPP_CONFIG"] = str(CONFIG_PATH)
os.environ.setdefault("ZEPP_TIMEZONE", "America/Sao_Paulo")

# ── Import fetch logic ─────────────────────────────────────────────
sys.path.insert(0, str(BASE_DIR / "scripts"))
from fetch_zepp_data import fetch_all_data, generate_summary, check_config, load_config
from health_metrics import build_zepp_daily_record
from health_workbook import WORKBOOK_PATH, upsert_daily_record


def main():
    parser = argparse.ArgumentParser(description="Coleta Zepp e atualiza a planilha diária.")
    parser.add_argument("--include-today", action="store_true", help="Registra o dia parcial atual.")
    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help="Número de dias para coleta (padrão: 365 para full, ou calculado para incremental).",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        default=True,
        help="Habilita coleta incremental com base no último snapshot (padrão: True).",
    )
    parser.add_argument(
        "--full",
        action="store_false",
        dest="incremental",
        help="Força coleta completa para o período total de dias configurados.",
    )
    args = parser.parse_args()
    # Ensure data directory
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not check_config():
        print("❌ ERRO: Token Zepp não configurado!")
        print("Configure seguindo as instruções em:")
        print(f"  {BASE_DIR / 'INSTRUCOES_TOKEN.md'}")
        print("\nRode: python zepp_health.py init <capture.har>")
        sys.exit(1)

    # Fetch data
    if not args.incremental:
        mode = "full"
        days = args.days or int(os.environ.get("ZEPP_DAYS", "365"))
    else:
        mode = "incremental"
        days = args.days or int(os.environ.get("ZEPP_DAYS", "30"))
    print(f"📡 Coletando dados Amazfit/Zepp (modo {mode}, base {days} dias)...")
    print(f"🕐 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()

    results = fetch_all_data(days=days, mode=mode)


    reference_date = datetime.now().astimezone().date()
    if not args.include_today:
        reference_date -= timedelta(days=1)
    record = build_zepp_daily_record(DATA_DIR, reference_date)
    row = upsert_daily_record(WORKBOOK_PATH, record)
    print(f"📗 Planilha atualizada: {WORKBOOK_PATH} | linha {row} | data {reference_date.isoformat()}")
    print(
        "📈 Novas métricas: "
        f"RMSSD={record.get('hrv_rmssd_media_ms')!s} ms/"
        f"{record.get('amostras_hrv_rmssd', 0)} amostras, "
        f"SpO₂={record.get('spo2_media_pct')!s}%, "
        f"respiração={record.get('frequencia_respiratoria_rpm')!s} rpm, "
        f"PA={record.get('pressao_sistolica_mmhg')!s}/"
        f"{record.get('pressao_diastolica_mmhg')!s} mmHg"
    )

    # Print summary
    summary = generate_summary(DATA_DIR)
    print(summary)

    # Health insights
    print()
    print("🎯 ACOMPANHAMENTO DE SAÚDE:")
    print("  • Dados consolidados na planilha diária")
    print("  • Peso e sono devem ser avaliados pela tendência, não por um único dia")
    print("  • Métricas indisponíveis são mantidas como ausentes")

    # Weight trend
    weight_path = DATA_DIR / "weight.json"
    if weight_path.is_file():
        w = json.loads(weight_path.read_text())
        items = w.get("items", [])
        if items:
            weights = [(it.get("generatedTime", it.get("timestamp", 0)), (it.get("summary", {}) or {}).get("weight") or it.get("value")) for it in items]
            weights = [(ts, float(wt)) for ts, wt in weights if wt]
            weights.sort()
            if len(weights) >= 2:
                oldest_ts, oldest_w = weights[0]
                newest_ts, newest_w = weights[-1]
                diff = newest_w - oldest_w
                direction = "📉" if diff < 0 else "📈" if diff > 0 else "➡️"
                print(f"  ⚖️  Peso: {oldest_w}kg → {newest_w}kg ({direction} {diff:+.1f}kg)")

    # Step goal
    band_path = DATA_DIR / "band_data.json"
    if band_path.is_file():
        from fetch_zepp_data import _extract_steps_sleep
        data = _extract_steps_sleep(band_path)
        if data:
            recent = data[-7:]
            avg_steps = sum(d[1]["steps"] for d in recent) / len(recent)
            avg_sleep = sum(d[1]["sleep_min"] for d in recent) / len(recent)
            print(f"  🏃 Média de passos (7d): {avg_steps:,.0f}/dia")
            print(f"  😴 Média de sono (7d): {avg_sleep/60:.1f}h/noite")

    # Training load
    load_path = DATA_DIR / "training_load.json"
    if load_path.is_file():
        load = json.loads(load_path.read_text())
        items = load.get("items", [])
        if items:
            recent = items[-3:]
            loads = [item.get("currnetDayTrainLoad", 0) for item in recent if item.get("currnetDayTrainLoad")]
            if loads:
                print(f"  🏋️  Carga de treino (3d): {sum(loads)/len(loads):.1f}")

    print()
    print(f"📁 Dados salvos em: {DATA_DIR}")
    print("✅ Coleta concluída.")


if __name__ == "__main__":
    main()
