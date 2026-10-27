import base64
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query

from backend.app.config import ZEPP_DATA_DIR, get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/steps", tags=["Steps"])

APP_TIMEZONE_NAME = os.environ.get(
    "APP_TIMEZONE", os.environ.get("ZEPP_TIMEZONE", "America/Sao_Paulo")
)
try:
    APP_TIMEZONE = ZoneInfo(APP_TIMEZONE_NAME)
except Exception:
    APP_TIMEZONE = timezone.utc

MONTH_NAMES_PT = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
]

WEEKDAY_NAMES_PT = [
    {"name": "Segunda-feira", "short": "Seg"},
    {"name": "Terça-feira", "short": "Ter"},
    {"name": "Quarta-feira", "short": "Qua"},
    {"name": "Quinta-feira", "short": "Qui"},
    {"name": "Sexta-feira", "short": "Sex"},
    {"name": "Sábado", "short": "Sáb"},
    {"name": "Domingo", "short": "Dom"},
]

# Cache em memória para band_data.json invalidado por (path, mtime_ns)
_zepp_band_cache: Dict[str, Any] = {
    "key": None,
    "details": {},
    "hourly_profile": [],
}


def _load_zepp_step_details() -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    """Decodifica band_data.json do Zepp com cache por mtime_ns para extrair meta,

    distância, calorias, tempos ativos e distribuição horária intradia.
    """
    zepp_file = ZEPP_DATA_DIR / "band_data.json"
    if not zepp_file.is_file():
        return {}, []

    try:
        stat = zepp_file.stat()
        cache_key = (str(zepp_file.resolve()), stat.st_mtime_ns)
        if _zepp_band_cache.get("key") == cache_key:
            return _zepp_band_cache["details"], _zepp_band_cache["hourly_profile"]

        raw = json.loads(zepp_file.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("data", [])
        details: Dict[str, Dict[str, Any]] = {}

        hourly_totals = [0] * 24
        days_with_stages = 0

        for item in items:
            dt = item.get("date_time")
            summary_b64 = item.get("summary")
            if not dt or not summary_b64:
                continue

            try:
                decoded = json.loads(base64.b64decode(summary_b64).decode("utf-8"))
                stp = decoded.get("stp") or {}
                goal = decoded.get("goal") or 8000
                dis_m = float(stp.get("dis") or 0.0)
                cal = float(stp.get("cal") or 0.0)
                wk_min = int(stp.get("wk") or 0)
                rn_min = int(stp.get("rn") or 0)
                ttl_steps = int(stp.get("ttl") or 0)

                stages = stp.get("stage") or []
                day_hourly = [0] * 24
                has_stage_steps = False
                if isinstance(stages, list):
                    for stg in stages:
                        if not isinstance(stg, dict):
                            continue
                        st_steps = int(stg.get("step") or 0)
                        start_min = int(stg.get("start") or 0)
                        if st_steps > 0 and 0 <= start_min < 1440:
                            hour_idx = min(23, max(0, start_min // 60))
                            day_hourly[hour_idx] += st_steps
                            has_stage_steps = True

                if has_stage_steps:
                    days_with_stages += 1
                    for h in range(24):
                        hourly_totals[h] += day_hourly[h]

                details[dt] = {
                    "goal": int(goal),
                    "distance_m": dis_m,
                    "distance_km": round(dis_m / 1000.0, 2),
                    "calories": int(cal),
                    "walking_min": wk_min,
                    "running_min": rn_min,
                    "active_minutes": wk_min + rn_min,
                    "zepp_steps": ttl_steps,
                }
            except Exception:
                continue

        hourly_profile = [
            {
                "hour": h,
                "label": f"{h:02d}h",
                "avg_steps": round(hourly_totals[h] / days_with_stages)
                if days_with_stages > 0
                else 0,
            }
            for h in range(24)
        ]

        _zepp_band_cache["key"] = cache_key
        _zepp_band_cache["details"] = details
        _zepp_band_cache["hourly_profile"] = hourly_profile
        return details, hourly_profile
    except Exception:
        return {}, []


def _get_zepp_last_sync() -> Optional[str]:
    """Obtém data e hora do último sync concluído do Zepp."""
    metadata_file = ZEPP_DATA_DIR / "metadata.json"
    if metadata_file.is_file():
        try:
            meta = json.loads(metadata_file.read_text(encoding="utf-8"))
            return meta.get("fetched_at")
        except Exception:
            pass
    return None


@router.get("/analytics")
def get_steps_analytics(days: Optional[int] = Query(None, ge=1)):
    """Retorna análise detalhada de passos: médias semanais, mensais, tendências,

    metas, distribuição horária e histórico enriquecido a partir do Zepp OS e daily_metrics.
    """
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # 1. Carrega métricas do banco (até 3650 dias por padrão para cobrir histórico completo)
    actual_days = days if isinstance(days, int) else None
    fetch_days = actual_days if actual_days is not None else 3650
    raw_metrics = repo.get_daily_metrics(days=fetch_days)

    # 2. Carrega enriquecimento fino do Zepp (com cache em memória)
    zepp_details, hourly_profile = _load_zepp_step_details()
    last_sync = _get_zepp_last_sync()

    # 3. Filtra apenas registros com contagem positiva de passos (ignora dias sem uso do relógio = 0)
    step_records = [
        m for m in raw_metrics if m.get("steps") is not None and int(m.get("steps") or 0) > 0
    ]

    if not step_records:
        return {
            "summary": {
                "total_days": 0,
                "total_steps": 0,
                "overall_avg_steps": 0,
                "max_steps": 0,
                "max_steps_date": None,
                "min_steps": 0,
                "min_steps_date": None,
                "current_streak_goal_days": 0,
                "best_streak_goal_days": 0,
                "days_above_goal": 0,
                "goal_completion_rate_pct": 0.0,
                "default_goal": 8000,
                "total_calories": 0,
                "total_distance_km": 0.0,
                "avg_distance_km": 0.0,
                "total_active_minutes": 0,
                "avg_active_minutes": 0,
                "total_walking_min": 0,
                "total_running_min": 0,
            },
            "weekly_stats": [],
            "weekday_averages": [
                {
                    "weekday": i,
                    "day_name": item["name"],
                    "short_name": item["short"],
                    "avg_steps": 0,
                    "days_count": 0,
                    "goal_hit_pct": 0.0,
                }
                for i, item in enumerate(WEEKDAY_NAMES_PT)
            ],
            "hourly_distribution": [
                {"hour": h, "label": f"{h:02d}h", "avg_steps": 0} for h in range(24)
            ],
            "monthly_stats": [],
            "trend": {
                "direction": "stable",
                "description": "Nenhum dado registrado para análise de tendência.",
                "current_7d_avg": 0,
                "previous_7d_avg": 0,
                "delta_7d_pct": 0.0,
                "current_30d_avg": 0,
                "previous_30d_avg": 0,
                "delta_30d_pct": 0.0,
                "longevity_tier": {
                    "tier": "Sem dados",
                    "color": "slate",
                    "badge": "Neutro",
                    "message": "Sincronize seu dispositivo Zepp para visualizar seu índice de longevidade.",
                    "target_range": "8.000 - 10.000 passos/dia",
                },
            },
            "zepp_sync_info": {
                "last_sync": last_sync,
                "source": "Zepp OS (Amazfit)",
                "configured_goal": 8000,
                "total_zepp_records": len(zepp_details),
                "has_band_data": bool(zepp_details),
            },
            "daily_records": [],
        }

    # Ordena cronologicamente ASC para calcular médias móveis e streaks
    step_records_asc = sorted(step_records, key=lambda x: str(x.get("date_ref", "")))

    # Determina meta padrão baseada na data mais recente do Zepp ou 8000
    configured_goal = 8000
    if zepp_details:
        latest_zepp_dt = max(zepp_details.keys())
        configured_goal = zepp_details[latest_zepp_dt].get("goal") or 8000

    today_str = datetime.now(APP_TIMEZONE).date().isoformat()

    # Enriquece cada dia
    enriched_asc: List[Dict[str, Any]] = []
    total_steps_sum = 0
    total_calories_sum = 0
    total_distance_km_sum = 0.0
    total_walking_min_sum = 0
    total_running_min_sum = 0
    total_active_min_sum = 0

    best_streak = 0
    current_streak = 0
    days_above_goal_count = 0

    max_steps_val = -1
    max_steps_date_val = None
    min_steps_val = 99999999
    min_steps_date_val = None

    num_records = len(step_records_asc)

    for i, rec in enumerate(step_records_asc):
        dt_ref = str(rec.get("date_ref"))
        steps = int(rec.get("steps") or 0)
        source = rec.get("source") or "Zepp"

        # Detalhes Zepp
        zd = zepp_details.get(dt_ref, {})
        day_goal = zd.get("goal") or configured_goal
        distance_km = (
            zd.get("distance_km")
            if zd.get("distance_km") is not None
            else round(steps * 0.00075, 2)
        )
        calories = zd.get("calories") or rec.get("calories") or int(steps * 0.04)
        walking_min = zd.get("walking_min", 0)
        running_min = zd.get("running_min", 0)
        active_min = zd.get("active_minutes") or (walking_min + running_min)

        total_steps_sum += steps
        total_calories_sum += calories
        total_distance_km_sum += distance_km
        total_walking_min_sum += walking_min
        total_running_min_sum += running_min
        total_active_min_sum += active_min

        goal_met = steps >= day_goal
        is_in_progress_today = (dt_ref == today_str) and (i == num_records - 1) and (not goal_met)

        if steps > max_steps_val:
            max_steps_val = steps
            max_steps_date_val = dt_ref

        # Evita que o dia de hoje ainda em andamento (ex: 7h da manhã) vire o mínimo histórico
        if not is_in_progress_today or num_records == 1:
            if steps < min_steps_val:
                min_steps_val = steps
                min_steps_date_val = dt_ref

        if goal_met:
            days_above_goal_count += 1
            current_streak += 1
            if current_streak > best_streak:
                best_streak = current_streak
        elif not is_in_progress_today:
            # Só zera o streak se for um dia encerrado que não atingiu a meta
            current_streak = 0

        # Média Móvel de 7 dias (MA7)
        window_start = max(0, i - 6)
        ma7_window = [
            int(step_records_asc[k].get("steps") or 0)
            for k in range(window_start, i + 1)
        ]
        ma7_val = round(sum(ma7_window) / len(ma7_window))

        # Status
        if steps >= day_goal:
            status = "above_goal"
        elif steps >= day_goal * 0.7:
            status = "near_goal"
        else:
            status = "below_goal"

        enriched_asc.append(
            {
                "date_ref": dt_ref,
                "steps": steps,
                "goal": day_goal,
                "goal_met": goal_met,
                "distance_km": distance_km,
                "calories": calories,
                "walking_min": walking_min,
                "running_min": running_min,
                "active_minutes": active_min,
                "source": source,
                "ma7_steps": ma7_val,
                "status": status,
                "is_today_in_progress": is_in_progress_today,
            }
        )

    # Inverte para formato DESC para apresentação em tabelas e listagens
    daily_records_desc = list(reversed(enriched_asc))

    # Lista de dias completos (sem o dia parcial de hoje, caso haja mais dias) para médias/tendências justas
    has_incomplete_today = (
        len(daily_records_desc) > 1 and bool(daily_records_desc[0].get("is_today_in_progress"))
    )
    completed_records_desc = (
        daily_records_desc[1:] if has_incomplete_today else daily_records_desc
    )

    total_days = len(enriched_asc)
    completed_days_count = len(completed_records_desc)
    completed_steps_sum = sum(r["steps"] for r in completed_records_desc)

    overall_avg_steps = (
        round(completed_steps_sum / completed_days_count)
        if completed_days_count > 0
        else 0
    )
    goal_completion_rate = (
        round((days_above_goal_count / completed_days_count) * 100.0, 1)
        if completed_days_count > 0
        else 0.0
    )

    # 4. Agrupamento Semanal (ISO Weeks)
    weeks_map: Dict[str, List[Dict[str, Any]]] = {}
    for item in enriched_asc:
        try:
            d_obj = datetime.strptime(item["date_ref"], "%Y-%m-%d").date()
            iso_year, iso_week, _ = d_obj.isocalendar()
            w_key = f"{iso_year}-W{iso_week:02d}"
            if w_key not in weeks_map:
                weeks_map[w_key] = []
            weeks_map[w_key].append(item)
        except Exception:
            continue

    sorted_week_keys = sorted(weeks_map.keys(), reverse=True)
    weekly_stats: List[Dict[str, Any]] = []

    for i, w_key in enumerate(sorted_week_keys):
        w_records = weeks_map[w_key]
        w_days = len(w_records)
        w_steps_sum = sum(r["steps"] for r in w_records)

        # Para média da semana, se houver mais de 1 dia e o último for hoje incompleto, usa os dias completos na média
        w_completed = [r for r in w_records if not r.get("is_today_in_progress")]
        w_eval_records = w_completed if w_completed else w_records
        w_avg = (
            round(sum(r["steps"] for r in w_eval_records) / len(w_eval_records))
            if w_eval_records
            else 0
        )
        w_goal_hits = sum(1 for r in w_records if r["goal_met"])
        w_max = max((r["steps"] for r in w_records), default=0)

        w_dates = [r["date_ref"] for r in w_records]
        w_start = min(w_dates)
        w_end = max(w_dates)

        try:
            d1 = datetime.strptime(w_start, "%Y-%m-%d")
            d2 = datetime.strptime(w_end, "%Y-%m-%d")
            w_label = f"{d1.day:02d}/{d1.month:02d} a {d2.day:02d}/{d2.month:02d}"
        except Exception:
            w_label = f"{w_start} a {w_end}"

        # Comparativo com a semana cronologicamente anterior (omite se a semana atual só tiver hoje em andamento)
        trend_vs_prev_pct = None
        only_incomplete_today = len(w_records) == 1 and bool(
            w_records[0].get("is_today_in_progress")
        )
        if not only_incomplete_today and i + 1 < len(sorted_week_keys):
            prev_key = sorted_week_keys[i + 1]
            prev_records = weeks_map[prev_key]
            prev_avg = (
                round(sum(r["steps"] for r in prev_records) / len(prev_records))
                if prev_records
                else 0
            )
            if prev_avg > 0:
                trend_vs_prev_pct = round(((w_avg - prev_avg) / prev_avg) * 100.0, 1)

        weekly_stats.append(
            {
                "week_key": w_key,
                "week_label": w_label,
                "start_date": w_start,
                "end_date": w_end,
                "days_recorded": w_days,
                "total_steps": w_steps_sum,
                "avg_steps": w_avg,
                "goal_met_days": w_goal_hits,
                "goal_hit_pct": round((w_goal_hits / len(w_eval_records)) * 100.0, 1)
                if w_eval_records
                else 0.0,
                "max_steps": w_max,
                "trend_vs_previous_pct": trend_vs_prev_pct,
            }
        )

    # 5. Padrão por Dia da Semana (Segunda a Domingo - usando dias completos)
    weekday_bins: Dict[int, List[int]] = {i: [] for i in range(7)}
    for item in completed_records_desc:
        try:
            d_obj = datetime.strptime(item["date_ref"], "%Y-%m-%d").date()
            weekday_bins[d_obj.weekday()].append(item["steps"])
        except Exception:
            continue

    weekday_averages: List[Dict[str, Any]] = []
    for day_idx, info in enumerate(WEEKDAY_NAMES_PT):
        st_list = weekday_bins[day_idx]
        cnt = len(st_list)
        avg = round(sum(st_list) / cnt) if cnt > 0 else 0
        hits = sum(1 for s in st_list if s >= configured_goal)
        weekday_averages.append(
            {
                "weekday": day_idx,
                "day_name": info["name"],
                "short_name": info["short"],
                "avg_steps": avg,
                "days_count": cnt,
                "goal_hit_pct": round((hits / cnt) * 100.0, 1) if cnt > 0 else 0.0,
            }
        )

    # 6. Agrupamento Mensal (YYYY-MM)
    months_map: Dict[str, List[Dict[str, Any]]] = {}
    for item in enriched_asc:
        ym = item["date_ref"][:7]
        if ym not in months_map:
            months_map[ym] = []
        months_map[ym].append(item)

    sorted_month_keys = sorted(months_map.keys(), reverse=True)
    monthly_stats: List[Dict[str, Any]] = []

    for i, ym in enumerate(sorted_month_keys):
        m_records = months_map[ym]
        m_count = len(m_records)
        m_steps_total = sum(r["steps"] for r in m_records)

        m_completed = [r for r in m_records if not r.get("is_today_in_progress")]
        m_eval = m_completed if m_completed else m_records
        m_avg = round(sum(r["steps"] for r in m_eval) / len(m_eval)) if m_eval else 0

        m_dist_total = round(sum(r["distance_km"] for r in m_records), 1)
        m_cal_total = sum(r["calories"] for r in m_records)
        m_goal_hits = sum(1 for r in m_records if r["goal_met"])

        best_rec = max(m_records, key=lambda x: x["steps"], default=None)
        worst_rec = min(m_eval, key=lambda x: x["steps"], default=None)

        try:
            y_str, m_str = ym.split("-")
            month_label = f"{MONTH_NAMES_PT[int(m_str)]} {y_str}"
        except Exception:
            month_label = ym

        trend_vs_prev_month = None
        if i + 1 < len(sorted_month_keys):
            prev_ym = sorted_month_keys[i + 1]
            prev_recs = months_map[prev_ym]
            prev_avg = (
                round(sum(r["steps"] for r in prev_recs) / len(prev_recs))
                if prev_recs
                else 0
            )
            if prev_avg > 0:
                trend_vs_prev_month = round(((m_avg - prev_avg) / prev_avg) * 100.0, 1)

        monthly_stats.append(
            {
                "month": ym,
                "month_label": month_label,
                "days_recorded": m_count,
                "total_steps": m_steps_total,
                "avg_steps": m_avg,
                "max_steps": best_rec["steps"] if best_rec else 0,
                "max_steps_date": best_rec["date_ref"] if best_rec else None,
                "min_steps": worst_rec["steps"] if worst_rec else 0,
                "goal_hit_days": m_goal_hits,
                "goal_hit_pct": round((m_goal_hits / len(m_eval)) * 100.0, 1)
                if m_eval
                else 0.0,
                "total_distance_km": m_dist_total,
                "total_calories": m_cal_total,
                "trend_vs_previous_month_pct": trend_vs_prev_month,
            }
        )

    # 7. Análise de Tendência e Longevidade (sobre dias completos para não distorcer pela manhã)
    last_7 = completed_records_desc[:7]
    prev_7 = completed_records_desc[7:14]
    curr_7_avg = (
        round(sum(r["steps"] for r in last_7) / len(last_7)) if last_7 else 0
    )
    prev_7_avg = (
        round(sum(r["steps"] for r in prev_7) / len(prev_7)) if prev_7 else 0
    )
    delta_7_pct = (
        round(((curr_7_avg - prev_7_avg) / prev_7_avg) * 100.0, 1)
        if prev_7_avg > 0
        else 0.0
    )

    last_30 = completed_records_desc[:30]
    prev_30 = completed_records_desc[30:60]
    curr_30_avg = (
        round(sum(r["steps"] for r in last_30) / len(last_30)) if last_30 else 0
    )
    prev_30_avg = (
        round(sum(r["steps"] for r in prev_30) / len(prev_30)) if prev_30 else 0
    )
    delta_30_pct = (
        round(((curr_30_avg - prev_30_avg) / prev_30_avg) * 100.0, 1)
        if prev_30_avg > 0
        else 0.0
    )

    if delta_7_pct >= 5.0:
        trend_direction = "improving"
        trend_desc = f"Tendência positiva: alta de {delta_7_pct}% nos últimos 7 dias completos em relação à semana anterior."
    elif delta_7_pct <= -5.0:
        trend_direction = "declining"
        trend_desc = f"Tendência de desaceleração: queda de {abs(delta_7_pct)}% nos últimos 7 dias completos em relação à semana anterior."
    else:
        trend_direction = "stable"
        trend_desc = "Atividade física estável nos últimos 7 dias com consistência diária."

    # Classificação de Longevidade baseada em evidência (JAMA / Lancet)
    ref_eval_avg = curr_30_avg if curr_30_avg > 0 else overall_avg_steps
    if ref_eval_avg >= 10000:
        longevity_tier = {
            "tier": "Alta Longevidade & Vigor Metabólico",
            "color": "emerald",
            "badge": "Excelente",
            "message": "Faixa de máxima cardioproteção e sensibilidade à insulina evidenciada em grandes estudos de longevidade.",
            "target_range": ">= 10.000 passos/dia",
        }
    elif ref_eval_avg >= 7500:
        longevity_tier = {
            "tier": "Zona Cardioprotetora (Longevidade Otimizada)",
            "color": "teal",
            "badge": "Ótimo",
            "message": "Atinge o platô cardioprotetor demonstrado por meta-análises internacionais para redução de mortalidade geral.",
            "target_range": "7.500 - 9.999 passos/dia",
        }
    elif ref_eval_avg >= 5000:
        longevity_tier = {
            "tier": "Atividade Baixa a Moderada",
            "color": "amber",
            "badge": "Moderado",
            "message": "Acima do limiar sedentário, mas com margem protetora para avançar rumo aos 8.000 passos diários.",
            "target_range": "5.000 - 7.499 passos/dia",
        }
    else:
        longevity_tier = {
            "tier": "Zona Sedentária",
            "color": "rose",
            "badge": "Atenção",
            "message": "Abaixo de 5.000 passos diários. Caminhadas curtas de 10 a 15 minutos já geram expressivo ganho de sobrevida.",
            "target_range": "< 5.000 passos/dia",
        }

    return {
        "summary": {
            "total_days": total_days,
            "total_steps": total_steps_sum,
            "overall_avg_steps": overall_avg_steps,
            "max_steps": max_steps_val if max_steps_val != -1 else 0,
            "max_steps_date": max_steps_date_val,
            "min_steps": min_steps_val if min_steps_val != 99999999 else 0,
            "min_steps_date": min_steps_date_val,
            "current_streak_goal_days": current_streak,
            "best_streak_goal_days": best_streak,
            "days_above_goal": days_above_goal_count,
            "goal_completion_rate_pct": goal_completion_rate,
            "default_goal": configured_goal,
            "total_calories": total_calories_sum,
            "total_distance_km": round(total_distance_km_sum, 1),
            "avg_distance_km": round(total_distance_km_sum / completed_days_count, 2)
            if completed_days_count > 0
            else 0.0,
            "total_active_minutes": total_active_min_sum,
            "avg_active_minutes": round(total_active_min_sum / completed_days_count)
            if completed_days_count > 0
            else 0,
            "total_walking_min": total_walking_min_sum,
            "total_running_min": total_running_min_sum,
        },
        "weekly_stats": weekly_stats,
        "weekday_averages": weekday_averages,
        "hourly_distribution": hourly_profile
        if hourly_profile
        else [{"hour": h, "label": f"{h:02d}h", "avg_steps": 0} for h in range(24)],
        "monthly_stats": monthly_stats,
        "trend": {
            "direction": trend_direction,
            "description": trend_desc,
            "current_7d_avg": curr_7_avg,
            "previous_7d_avg": prev_7_avg,
            "delta_7d_pct": delta_7_pct,
            "current_30d_avg": curr_30_avg,
            "previous_30d_avg": prev_30_avg,
            "delta_30d_pct": delta_30_pct,
            "longevity_tier": longevity_tier,
        },
        "zepp_sync_info": {
            "last_sync": last_sync,
            "source": "Zepp OS (Amazfit)",
            "configured_goal": configured_goal,
            "total_zepp_records": len(zepp_details),
            "has_band_data": bool(zepp_details),
        },
        "daily_records": daily_records_desc,
    }
