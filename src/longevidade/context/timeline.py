"""
Consultas e agregações para os três níveis de visualização da Linha do Tempo:
Dia (feed detalhado), Semana (síntese intermediária) e Mês (tendências macro).
"""

from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from longevidade.context.models import (
    HealthEvent,
    TimelineQueryFilter,
    TimelineResponse,
    TimelineSummaryDay,
    TimelineSummaryMonth,
    TimelineSummaryWeek,
)


WEEKDAY_PT = {
    0: "SEG",
    1: "TER",
    2: "QUA",
    3: "QUI",
    4: "SEX",
    5: "SÁB",
    6: "DOM",
}

MONTHS_PT = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Março",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
}


def _row_to_event(row: sqlite3.Row) -> HealthEvent:
    meta = {}
    if row["metadata_json"]:
        try:
            meta = json.loads(row["metadata_json"])
        except Exception:
            meta = {}

    return HealthEvent(
        id=row["id"],
        timestamp=row["timestamp"],
        date_ref=row["date_ref"],
        time_ref=row["time_ref"],
        event_type=row["event_type"],
        category=row["category"],
        title=row["title"],
        description=row["description"],
        source=row["source"],
        source_type=row["source_type"],
        source_id=row["source_id"],
        source_key=row["source_key"],
        confidence=row["confidence"] or "high",
        significance=row["significance"] or "normal",
        metadata=meta,
        is_pinned=bool(row["is_pinned"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def query_timeline_events(
    conn: sqlite3.Connection,
    filters: TimelineQueryFilter,
) -> Tuple[int, List[HealthEvent], List[TimelineSummaryDay]]:
    """Consulta paginada de eventos na Timeline com agrupamento por dia e enriquecimento de métricas."""
    conditions = ["1=1"]
    params: List[Any] = []

    if filters.start_date:
        conditions.append("date_ref >= ?")
        params.append(filters.start_date)
    if filters.end_date:
        conditions.append("date_ref <= ?")
        params.append(filters.end_date)
    if filters.category:
        conditions.append("category = ?")
        params.append(filters.category)
    if filters.event_type:
        conditions.append("event_type = ?")
        params.append(filters.event_type)
    if filters.source:
        conditions.append("source = ?")
        params.append(filters.source)
    if filters.significance:
        conditions.append("significance = ?")
        params.append(filters.significance)

    where_clause = " AND ".join(conditions)

    count_sql = f"SELECT COUNT(*) FROM health_events WHERE {where_clause};"
    total = conn.execute(count_sql, params).fetchone()[0]

    query_sql = f"""
        SELECT * FROM health_events
        WHERE {where_clause}
        ORDER BY date_ref DESC, timestamp DESC, time_ref DESC
        LIMIT ? OFFSET ?;
    """
    cur = conn.execute(query_sql, params + [filters.limit, filters.offset])
    events = [_row_to_event(r) for r in cur.fetchall()]

    # Agrupa eventos por data
    events_by_date: Dict[str, List[HealthEvent]] = defaultdict(list)
    for ev in events:
        events_by_date[ev.date_ref].append(ev)

    # Busca métricas diárias para as datas presentes
    metrics_by_date: Dict[str, Dict[str, Any]] = {}
    if events_by_date:
        placeholders = ",".join("?" for _ in events_by_date.keys())
        metric_sql = f"""
            SELECT date_ref, steps, sleep_minutes, rhr_bpm, hrv_ms, weight_kg, calories
            FROM daily_metrics
            WHERE date_ref IN ({placeholders});
        """
        metric_rows = conn.execute(metric_sql, list(events_by_date.keys())).fetchall()
        for mr in metric_rows:
            metrics_by_date[mr["date_ref"]] = {
                "steps": mr["steps"],
                "sleep_minutes": mr["sleep_minutes"],
                "rhr_bpm": mr["rhr_bpm"],
                "hrv_ms": mr["hrv_ms"],
                "weight_kg": mr["weight_kg"],
                "calories": mr["calories"],
            }

    # Constrói objetos TimelineSummaryDay ordenados decrescentes por data
    days: List[TimelineSummaryDay] = []
    for d_str in sorted(events_by_date.keys(), reverse=True):
        try:
            dt = datetime.strptime(d_str, "%Y-%m-%d").date()
            weekday = WEEKDAY_PT[dt.weekday()]
            display = dt.strftime("%d/%m")
        except Exception:
            weekday = "DIA"
            display = d_str

        days.append(
            TimelineSummaryDay(
                date_ref=d_str,
                day_of_week=weekday,
                display_date=display,
                events=events_by_date[d_str],
                metrics_summary=metrics_by_date.get(d_str, {}),
            )
        )

    return total, events, days


def query_weekly_summaries(
    conn: sqlite3.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit_weeks: int = 8,
) -> List[TimelineSummaryWeek]:
    """Agrega eventos e métricas em blocos semanais (Segunda a Domingo)."""
    # Define range padrão se não especificado (últimas 8 semanas)
    today = date.today()
    if not end_date:
        end_d = today
    else:
        end_d = datetime.strptime(end_date, "%Y-%m-%d").date()

    if not start_date:
        start_d = end_d - timedelta(weeks=limit_weeks)
    else:
        start_d = datetime.strptime(start_date, "%Y-%m-%d").date()

    # Busca todas as métricas no período
    m_sql = """
        SELECT date_ref, sleep_minutes, hrv_ms, rhr_bpm
        FROM daily_metrics
        WHERE date_ref >= ? AND date_ref <= ?
        ORDER BY date_ref ASC;
    """
    m_rows = conn.execute(m_sql, (start_d.strftime("%Y-%m-%d"), end_d.strftime("%Y-%m-%d"))).fetchall()
    metrics_map = {r["date_ref"]: dict(r) for r in m_rows}

    # Busca eventos relevantes no período
    ev_sql = """
        SELECT * FROM health_events
        WHERE date_ref >= ? AND date_ref <= ?
          AND (significance IN ('notável', 'significativa') OR category IN ('intervention', 'clinical', 'exercise'))
        ORDER BY date_ref DESC, timestamp DESC;
    """
    ev_rows = conn.execute(ev_sql, (start_d.strftime("%Y-%m-%d"), end_d.strftime("%Y-%m-%d"))).fetchall()
    events = [_row_to_event(r) for r in ev_rows]
    events_by_week_key: Dict[str, List[HealthEvent]] = defaultdict(list)

    # Identifica semanas (Segunda a Domingo)
    cur_d = end_d
    summaries: List[TimelineSummaryWeek] = []

    # Ajusta cur_d para o domingo da semana atual
    days_to_sunday = (6 - cur_d.weekday()) % 7
    week_sunday = cur_d + timedelta(days=days_to_sunday)

    while week_sunday >= start_d and len(summaries) < limit_weeks:
        week_monday = week_sunday - timedelta(days=6)
        w_start_str = week_monday.strftime("%Y-%m-%d")
        w_end_str = week_sunday.strftime("%Y-%m-%d")
        w_key = f"{w_start_str}_{w_end_str}"

        # Filtra eventos da semana
        w_events = [e for e in events if w_start_str <= e.date_ref <= w_end_str]
        workout_count = sum(1 for e in w_events if e.event_type == "workout")

        # Filtra métricas da semana
        sleep_vals = []
        hrv_vals = []
        rhr_vals = []
        d = week_monday
        while d <= week_sunday:
            ds = d.strftime("%Y-%m-%d")
            m = metrics_map.get(ds)
            if m:
                if m.get("sleep_minutes"):
                    sleep_vals.append(m["sleep_minutes"])
                if m.get("hrv_ms"):
                    hrv_vals.append(m["hrv_ms"])
                if m.get("rhr_bpm"):
                    rhr_vals.append(m["rhr_bpm"])
            d += timedelta(days=1)

        avg_sleep = (sum(sleep_vals) / len(sleep_vals)) if sleep_vals else None
        avg_sleep_fmt = None
        if avg_sleep:
            hrs = int(avg_sleep // 60)
            mins = int(avg_sleep % 60)
            avg_sleep_fmt = f"{hrs}h {mins:02d}m"

        avg_hrv = (sum(hrv_vals) / len(hrv_vals)) if hrv_vals else None
        avg_rhr = (sum(rhr_vals) / len(rhr_vals)) if rhr_vals else None

        title = f"{week_monday.strftime('%d')}–{week_sunday.strftime('%d %b')}"

        summaries.append(
            TimelineSummaryWeek(
                week_start=w_start_str,
                week_end=w_end_str,
                title=title,
                avg_sleep_min=round(avg_sleep, 1) if avg_sleep else None,
                avg_sleep_formatted=avg_sleep_fmt,
                hrv_delta_pct=None,  # Será enriquecido comparando com baseline
                rhr_delta_bpm=round(avg_rhr, 1) if avg_rhr else None,
                workout_count=workout_count,
                key_events=w_events[:5],
            )
        )

        week_sunday -= timedelta(days=7)

    return summaries


def query_monthly_summaries(
    conn: sqlite3.Connection,
    limit_months: int = 6,
) -> List[TimelineSummaryMonth]:
    """Agrega eventos e tendências macro por mês (YYYY-MM)."""
    today = date.today()
    summaries: List[TimelineSummaryMonth] = []

    for i in range(limit_months):
        # Calcula ano e mês retroativo
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1

        month_str = f"{year:04d}-{month:02d}"
        month_name = MONTHS_PT.get(month, "")
        title = f"{month_name} {year}"

        # Métricas do mês
        cur = conn.execute(
            """
            SELECT date_ref, weight_kg, hrv_ms, rhr_bpm, sleep_minutes
            FROM daily_metrics
            WHERE date_ref LIKE ?
            ORDER BY date_ref ASC;
            """,
            (f"{month_str}%",),
        )
        rows = cur.fetchall()

        weights = [r["weight_kg"] for r in rows if r["weight_kg"] is not None]
        weight_delta = None
        if len(weights) >= 2:
            weight_delta = round(weights[-1] - weights[0], 2)

        hrvs = [r["hrv_ms"] for r in rows if r["hrv_ms"] is not None]
        rhrs = [r["rhr_bpm"] for r in rows if r["rhr_bpm"] is not None]
        sleeps = [r["sleep_minutes"] for r in rows if r["sleep_minutes"] is not None]

        # Eventos do mês
        ev_cur = conn.execute(
            """
            SELECT * FROM health_events
            WHERE date_ref LIKE ?
            ORDER BY date_ref DESC, timestamp DESC;
            """,
            (f"{month_str}%",),
        )
        ev_rows = [_row_to_event(r) for r in ev_cur.fetchall()]
        workouts_count = sum(1 for e in ev_rows if e.event_type == "workout")
        key_events = [e for e in ev_rows if e.significance in ("notável", "significativa")][:6]

        # Intervenções ativas iniciadas no mês ou antes
        supp_cur = conn.execute(
            """
            SELECT name, dosage FROM supplement_stack
            WHERE start_date <= ? AND is_active = 1
            LIMIT 5;
            """,
            (f"{month_str}-31",),
        )
        active_supps = [f"{r['name']} ({r['dosage']})" for r in supp_cur.fetchall()]

        summaries.append(
            TimelineSummaryMonth(
                month_ref=month_str,
                title=title,
                weight_delta_kg=weight_delta,
                hrv_delta_pct=round(sum(hrvs) / len(hrvs), 1) if hrvs else None,
                rhr_delta_bpm=round(sum(rhrs) / len(rhrs), 1) if rhrs else None,
                sleep_delta_min=round(sum(sleeps) / len(sleeps), 1) if sleeps else None,
                total_workouts=workouts_count,
                active_interventions=active_supps,
                key_events_count=len(key_events),
                key_events=key_events,
            )
        )

    return summaries
