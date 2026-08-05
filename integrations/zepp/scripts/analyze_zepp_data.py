#!/usr/bin/env python3
"""
Hermes ↔ Amazfit — Análise de Dados

Analisa dados salvos e gera:
  - Tendências de peso
  - Qualidade do sono
  - Progresso de corrida (quando voltar)
  - FC de repouso e variabilidade
  - Recomendações práticas a partir dos dados

Uso:
  python analyze_zepp_data.py              # resumo geral
  python analyze_zepp_data.py --weight     # foco em peso
  python analyze_zepp_data.py --sleep      # foco em sono
  python analyze_zepp_data.py --fitness    # foco em fitness
  python analyze_zepp_data.py --all        # análise completa
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Metas padrão locais
TARGET_WEIGHT = 75.0
START_WEIGHT = 90.0
HEIGHT_CM = 170


def load_data(name: str) -> dict:
    path = DATA_DIR / f"{name}.json"
    if path.is_file():
        return json.loads(path.read_text())
    return {}


def extract_hrv_rmssd_values(payload: dict) -> list[float]:
    """Extract valid nested RMSSD samples without confusing them with SDNN."""
    values: list[float] = []
    for item in payload.get("items", []) if isinstance(payload, dict) else []:
        if not isinstance(item, dict):
            continue
        value = item.get("value")
        samples = value.get("samples") if isinstance(value, dict) else None
        if not isinstance(samples, list):
            continue
        for sample in samples:
            if not isinstance(sample, dict) or isinstance(sample.get("hrv"), bool):
                continue
            try:
                number = float(sample.get("hrv"))
            except (TypeError, ValueError):
                continue
            if number > 0 and number == number and number not in (float("inf"), float("-inf")):
                values.append(number)
    return values


def analyze_weight():
    """Weight trend analysis."""
    w = load_data("weight")
    items = w.get("items", [])
    if not items:
        print("Sem dados de peso.")
        return

    weights = []
    for it in items:
        ts = it.get("generatedTime", it.get("timestamp", 0))
        s = it.get("summary", {})
        wt = s.get("weight") if s else it.get("value")
        if ts and wt:
            weights.append((ts, float(wt)))

    weights.sort(key=lambda x: x[0])

    if len(weights) < 2:
        print("Apenas 1 registro de peso — insuficiente para análise.")
        return

    first_ts, first_w = weights[0]
    last_ts, last_w = weights[-1]
    days_span = (last_ts - first_ts) / 86400

    print("═" * 50)
    print("  ⚖️  ANÁLISE DE PESO")
    print("═" * 50)
    print(f"  Registros: {len(weights)} em {days_span:.0f} dias")
    print(f"  Peso inicial: {first_w:.1f} kg")
    print(f"  Peso atual:   {last_w:.1f} kg")
    print(f"  Meta:         {TARGET_WEIGHT} kg")
    print(f"  Para perder:  {last_w - TARGET_WEIGHT:.1f} kg")

    if days_span > 0:
        weekly_rate = (last_w - first_w) / (days_span / 7)
        print(f"  Ritmo semanal: {weekly_rate:+.2f} kg/semana")

        if weekly_rate < -0.5 and weekly_rate > -1.0:
            print("  ✅ Ritmo saudável de perda (0.5-1.0 kg/semana)")
        elif weekly_rate <= -1.0:
            print("  ⚠️  Ritmo acelerado — considere desacelerar")
        elif weekly_rate >= 0:
            print("  ⚠️  Peso estável ou subindo — precisa de ajuste")

        if weekly_rate < 0:
            weeks_to_goal = abs(last_w - TARGET_WEIGHT) / abs(weekly_rate)
            print(f"  ⏱️  Estimativa para meta: {weeks_to_goal:.0f} semanas (~{weeks_to_goal/4:.1f} meses)")

    # Recent trend (last 7 entries)
    recent = weights[-7:]
    if len(recent) >= 2:
        r_first = recent[0][1]
        r_last = recent[-1][1]
        print(f"  📊 Últimos 7 registros: {r_first:.1f} → {r_last:.1f} ({r_last - r_first:+.1f} kg)")

    # BMI
    bmi = last_w / ((HEIGHT_CM / 100) ** 2)
    bmi_target = TARGET_WEIGHT / ((HEIGHT_CM / 100) ** 2)
    print(f"  📏 IMC atual: {bmi:.1f} | IMC meta: {bmi_target:.1f}")

    print()


def analyze_sleep():
    """Sleep quality analysis from band_data."""
    from fetch_zepp_data import _extract_steps_sleep

    band_path = DATA_DIR / "band_data.json"
    data = _extract_steps_sleep(band_path)

    if not data:
        print("Sem dados de sono.")
        return

    print("═" * 50)
    print("  😴 ANÁLISE DE SONO")
    print("═" * 50)

    sleep_durations = []
    for day_str, info in data:
        sm = info.get("sleep_min", 0)
        if sm > 0:
            sleep_durations.append((day_str, sm))

    if not sleep_durations:
        print("  Sem registros de sono disponíveis.")
        return

    avg_sleep = sum(s[1] for s in sleep_durations) / len(sleep_durations)
    print(f"  Noites registradas: {len(sleep_durations)}")
    print(f"  Média de sono:      {avg_sleep/60:.1f}h ({avg_sleep:.0f} min)")

    # Last 7 nights
    recent = sleep_durations[-7:]
    print(f"\n  ┌─ Últimas 7 noites ──────────────────────────┐")
    for day, mins in recent:
        bar = "█" * int(mins / 30)
        print(f"  │ {day}  {mins//60}h{mins%60:02d}  {bar}")
    print(f"  └──────────────────────────────────────────────┘")

    # Sleep quality assessment
    if avg_sleep >= 480:
        print("  ✅ Sono excelente (8h+)")
    elif avg_sleep >= 420:
        print("  👍 Sono adequado (7h+)")
    elif avg_sleep >= 360:
        print("  ⚠️  Sono insuficiente (6h+) — tente dormir mais cedo")
    else:
        print("  🔴 Sono muito baixo (<6h) — prioritário melhorar!")

    print()


def analyze_fitness():
    """Fitness metrics: HR, training load, HRV, steps."""
    hr = load_data("heart_rate")
    load = load_data("training_load")
    hrv = load_data("hrv")
    readiness = load_data("readiness")

    print("═" * 50)
    print("  🏃 ANÁLISE DE FITNESS")
    print("═" * 50)

    # Resting HR
    hr_items = hr.get("items", [])
    resting_hrs = [i.get("value") for i in hr_items if i.get("type") == 1 or i.get("subType") == "resting"]
    if resting_hrs:
        avg_rhr = sum(resting_hrs) / len(resting_hrs)
        latest_rhr = resting_hrs[-1]
        print(f"  ❤️  FC Repouso: {latest_rhr} bpm (média: {avg_rhr:.0f})")
        if avg_rhr < 60:
            print("     ✅ Excelente condição cardiovascular")
        elif avg_rhr < 70:
            print("     👍 Boa condição cardiovascular")
        else:
            print("     ⚠️  FC de repouso elevada — considere mais cardio")

    # HRV RMSSD: the current Zepp endpoint stores samples under value.samples.
    hrv_values = extract_hrv_rmssd_values(hrv)
    if hrv_values:
        avg_hrv = sum(hrv_values) / len(hrv_values)
        print(f"  📊 HRV (RMSSD): {avg_hrv:.0f} ms ({len(hrv_values)} amostras)")
        if avg_hrv > 50:
            print("     ✅ Valor médio pessoal disponível; interpretar pela tendência")
        elif avg_hrv > 30:
            print("     ℹ️  Valor intermediário; comparar com seu baseline")
        else:
            print("     ℹ️  Valor baixo no recorte; não interpretar isoladamente")

    # Training load
    load_items = load.get("items", [])
    if load_items:
        recent_loads = [it.get("currnetDayTrainLoad", 0) for it in load_items[-7:] if it.get("currnetDayTrainLoad")]
        if recent_loads:
            avg_load = sum(recent_loads) / len(recent_loads)
            print(f"  🏋️  Carga de treino (média 7d): {avg_load:.0f}")

    # Steps
    from fetch_zepp_data import _extract_steps_sleep
    band_path = DATA_DIR / "band_data.json"
    steps_data = _extract_steps_sleep(band_path)
    if steps_data:
        recent = steps_data[-7:]
        avg_steps = sum(d[1]["steps"] for d in recent) / len(recent)
        print(f"  👟 Passos/dia (média 7d): {avg_steps:,.0f}")
        if avg_steps >= 10000:
            print("     ✅ Meta diária atingida!")
        elif avg_steps >= 7000:
            print("     👍 Bom, mas pode melhorar (meta: 10k)")
        else:
            print("     ⚠️  Abaixo do ideal — tente caminhar mais")

    # Readiness
    readiness_items = readiness.get("items", [])
    if readiness_items:
        latest = readiness_items[-1].get("value", {})
        score = latest.get("score") or latest.get("readinessScore")
        if score:
            print(f"  🧘 Readiness score: {score}")

    # VO2 Max
    vo2 = load_data("vo2_max")
    vo2_items = vo2.get("items", [])
    if vo2_items:
        vo2_val = vo2_items[-1].get("vo2Max") or vo2_items[-1].get("value")
        if vo2_val:
            print(f"  🫁 VO2 Max: {vo2_val}")

    print()


def analyze_corrida():
    """Running-specific analysis."""
    runs = load_data("workout_history")
    summary_list = (runs.get("data") or {}).get("summary") or []

    print("═" * 50)
    print("  🏃‍♂️ ANÁLISE DE CORRIDA")
    print("═" * 50)

    if not summary_list:
        print("  Nenhum treino de corrida registrado.")
        print("  📝 Dica: quando voltar a correr, registre os treinos no relógio!")
        print("     Comece com caminhada/corrida leve (Couch to 5K)")
        print("     Meta: 3x por semana, 20-30 min")
        return

    print(f"  Total de treinos: {len(summary_list)}")

    distances = []
    paces = []
    for s in summary_list:
        dist = float(s.get("dis", 0))
        pace = float(s.get("avg_pace", 0))
        if dist > 0:
            distances.append(dist)
        if pace > 0:
            paces.append(pace)

    if distances:
        total_km = sum(distances) / 1000
        print(f"  Distância total: {total_km:.2f} km")

    if paces:
        avg_pace = sum(paces) / len(paces)
        # pace is in seconds per km usually
        pace_min = int(avg_pace // 60)
        pace_sec = int(avg_pace % 60)
        print(f"  Pace médio: {pace_min}:{pace_sec:02d}/km")

    # Recent runs
    recent = summary_list[-5:]
    if recent:
        print(f"\n  ┌─ Últimos treinos ────────────────────────────┐")
        for r in recent:
            dist = float(r.get("dis", 0)) / 1000
            dur = float(r.get("run_time", 0))
            dur_min = int(dur // 60)
            print(f"  │ {r.get('trackid', '?')}  {dist:.2f}km  {dur_min}min")
        print(f"  └──────────────────────────────────────────────┘")

    print()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Analisar dados Amazfit/Zepp")
    parser.add_argument("--weight", action="store_true", help="Análise de peso")
    parser.add_argument("--sleep", action="store_true", help="Análise de sono")
    parser.add_argument("--fitness", action="store_true", help="Análise de fitness")
    parser.add_argument("--corrida", action="store_true", help="Análise de corrida")
    parser.add_argument("--all", action="store_true", help="Análise completa")
    args = parser.parse_args()

    # Default: all if no specific flag
    do_all = args.all or not (args.weight or args.sleep or args.fitness or args.corrida)

    if do_all or args.weight:
        try:
            analyze_weight()
        except Exception as e:
            print(f"[Erro análise peso: {e}]")

    if do_all or args.sleep:
        try:
            analyze_sleep()
        except Exception as e:
            print(f"[Erro análise sono: {e}]")

    if do_all or args.fitness:
        try:
            analyze_fitness()
        except Exception as e:
            print(f"[Erro análise fitness: {e}]")

    if do_all or args.corrida:
        try:
            analyze_corrida()
        except Exception as e:
            print(f"[Erro análise corrida: {e}]")


if __name__ == "__main__":
    main()
