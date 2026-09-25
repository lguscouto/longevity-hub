"""
Motor de Análise de Confundidores e Balanço de Covariáveis para N-of-1 e Intervenções.
Calcula a Diferença Padronizada (Cohen's d) e variação relativa (%) para fatores exógenos:
- Consumo de álcool (frequência de dias e doses médias);
- Carga e volume de treino (volume kg/dia, minutos de exercício/dia, frequência);
- Distribuição de dias de fim de semana (Sex/Sáb/Dom) vs. dias úteis;
- Introdução de outros suplementos/medicamentos concomitantemente;
- Duração média de sono diário.

Gera alertas transparentes de viés metodológico para evitar conclusões causais equivocadas.
"""

from __future__ import annotations

import json
import math
import sqlite3
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from longevidade.algorithms.n_of_1 import analyze_n_of_1
from longevidade.context.models import (
    BeforeAfterAnalysisResponse,
    ConfounderReport,
    CovariateItem,
)


METHODOLOGICAL_DISCLAIMER = (
    "Aviso Metodológico (N-of-1): Associação temporal não confirma causalidade isolada. "
    "Fatores exógenos não controlados podem mascarar, simular ou inflar os efeitos observados do protocolo."
)


def _parse_date(d_str: str) -> date:
    """Converte string YYYY-MM-DD em objeto date."""
    return datetime.strptime(d_str[:10], "%Y-%m-%d").date()


def _date_range_days(start_str: str, end_str: str) -> List[str]:
    """Retorna lista de todas as datas no formato YYYY-MM-DD entre start e end (inclusive)."""
    start_d = _parse_date(start_str)
    end_d = _parse_date(end_str)
    if start_d > end_d:
        return []
    days_count = (end_d - start_d).days + 1
    return [(start_d + timedelta(days=i)).isoformat() for i in range(days_count)]


def calculate_continuous_standardized_diff(
    control_vals: Sequence[float],
    treatment_vals: Sequence[float],
) -> Tuple[float, float, float, float]:
    """Calcula média de controle, média de intervenção, delta % e Cohen's d (padronizado).

    Retorna: (control_mean, treatment_mean, delta_pct, standardized_diff)
    """
    c = np.array([x for x in control_vals if x is not None and not math.isnan(x)], dtype=float)
    t = np.array([x for x in treatment_vals if x is not None and not math.isnan(x)], dtype=float)

    if len(c) == 0 and len(t) == 0:
        return 0.0, 0.0, 0.0, 0.0

    c_mean = float(np.mean(c)) if len(c) > 0 else 0.0
    t_mean = float(np.mean(t)) if len(t) > 0 else 0.0

    diff_mean = t_mean - c_mean
    delta_pct = (diff_mean / c_mean * 100.0) if c_mean != 0.0 else (100.0 if t_mean > 0 else 0.0)

    n_c, n_t = len(c), len(t)
    if n_c < 2 or n_t < 2:
        return round(c_mean, 2), round(t_mean, 2), round(delta_pct, 1), 0.0

    c_std = float(np.std(c, ddof=1))
    t_std = float(np.std(t, ddof=1))

    denom = (n_c + n_t - 2)
    s_pooled = math.sqrt(((n_c - 1) * (c_std ** 2) + (n_t - 1) * (t_std ** 2)) / denom) if denom > 0 else 0.0

    cohens_d = (diff_mean / s_pooled) if s_pooled > 1e-6 else 0.0
    return round(c_mean, 2), round(t_mean, 2), round(delta_pct, 1), round(cohens_d, 2)


def calculate_proportion_standardized_diff(
    control_count: int,
    control_total: int,
    treatment_count: int,
    treatment_total: int,
) -> Tuple[float, float, float, float]:
    """Calcula diferença padronizada para taxas/proporções binárias.

    Retorna: (p_control_pct, p_treatment_pct, delta_pct, standardized_diff)
    """
    p_c = (control_count / control_total) if control_total > 0 else 0.0
    p_t = (treatment_count / treatment_total) if treatment_total > 0 else 0.0

    diff_p = p_t - p_c
    delta_pct = (diff_p / p_c * 100.0) if p_c > 0.0 else (100.0 if p_t > 0 else 0.0)

    # Variância pooled para proporções
    s_prop = math.sqrt((p_t * (1.0 - p_t) + p_c * (1.0 - p_c)) / 2.0)
    cohens_d = (diff_p / s_prop) if s_prop > 1e-6 else 0.0

    return round(p_c * 100.0, 1), round(p_t * 100.0, 1), round(delta_pct, 1), round(cohens_d, 2)


def extract_period_lifestyle_data(
    conn: sqlite3.Connection,
    start_str: str,
    end_str: str,
    exclude_intervention_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Extrai ocorrências de fatores exógenos para um dado período contínuo [start_str, end_str]."""
    days = _date_range_days(start_str, end_str)
    n_days = max(1, len(days))
    date_set = set(days)

    # 1. Álcool: health_events com event_type = 'alcohol'
    cur = conn.execute(
        """
        SELECT date_ref, metadata_json, title
        FROM health_events
        WHERE date_ref >= ? AND date_ref <= ?
          AND (event_type = 'alcohol' OR category = 'lifestyle' AND LOWER(title) LIKE '%álcool%');
        """,
        (start_str, end_str),
    )
    alcohol_rows = cur.fetchall()
    alcohol_days = set()
    total_alcohol_doses = 0.0
    for r in alcohol_rows:
        alcohol_days.add(r["date_ref"])
        doses = 1.0
        meta_raw = r["metadata_json"]
        if meta_raw:
            try:
                meta = json.loads(meta_raw)
                doses = float(meta.get("servings") or meta.get("doses") or 1.0)
            except Exception:
                doses = 1.0
        total_alcohol_doses += doses

    # 2. Treinos: tabela workouts e health_events (workouts)
    cur = conn.execute(
        """
        SELECT workout_date, duration_min, volume_kg
        FROM workouts
        WHERE workout_date >= ? AND workout_date <= ?;
        """,
        (start_str, end_str),
    )
    workout_rows = cur.fetchall()

    daily_volume: Dict[str, float] = {d: 0.0 for d in days}
    daily_duration: Dict[str, float] = {d: 0.0 for d in days}
    workout_days = set()

    for r in workout_rows:
        w_d = r["workout_date"]
        if w_d in daily_volume:
            workout_days.add(w_d)
            daily_duration[w_d] += float(r["duration_min"] or 0.0)
            daily_volume[w_d] += float(r["volume_kg"] or 0.0)

    # Verifica se há health_events de treino não refletidos em workouts
    cur = conn.execute(
        """
        SELECT date_ref, metadata_json
        FROM health_events
        WHERE date_ref >= ? AND date_ref <= ? AND event_type = 'workout';
        """,
        (start_str, end_str),
    )
    for r in cur.fetchall():
        w_d = r["date_ref"]
        if w_d in daily_volume and w_d not in workout_days:
            workout_days.add(w_d)
            if r["metadata_json"]:
                try:
                    m = json.loads(r["metadata_json"])
                    daily_duration[w_d] += float(m.get("duration_min") or 45.0)
                    daily_volume[w_d] += float(m.get("volume_kg") or 0.0)
                except Exception:
                    daily_duration[w_d] += 45.0

    # 3. Dias de fim de semana (Sexta, Sábado e Domingo)
    weekend_days_count = 0
    for d_str in days:
        dt = _parse_date(d_str)
        if dt.weekday() in (4, 5, 6):  # Sex (4), Sáb (5), Dom (6)
            weekend_days_count += 1

    # 4. Suplementos concomitantes ativos durante o período
    # Busca em supplement_stack e supplement_logs
    cur = conn.execute(
        """
        SELECT DISTINCT name
        FROM supplement_stack
        WHERE start_date <= ? AND is_active = 1;
        """,
        (end_str,),
    )
    active_supps = {r["name"].strip() for r in cur.fetchall()}

    # Suplementos com logs no período
    cur = conn.execute(
        """
        SELECT DISTINCT s.name
        FROM supplement_logs l
        JOIN supplement_stack s ON l.supplement_id = s.id
        WHERE l.taken_at_date >= ? AND l.taken_at_date <= ?;
        """,
        (start_str, end_str),
    )
    for r in cur.fetchall():
        active_supps.add(r["name"].strip())

    # Se informado o nome da intervenção avaliada, exclui do conjunto de concorrentes
    if exclude_intervention_name:
        clean_name = exclude_intervention_name.strip().lower()
        active_supps = {s for s in active_supps if s.strip().lower() != clean_name}

    # 5. Sono diário (daily_metrics)
    cur = conn.execute(
        """
        SELECT date_ref, sleep_minutes
        FROM daily_metrics
        WHERE date_ref >= ? AND date_ref <= ?;
        """,
        (start_str, end_str),
    )
    sleep_rows = cur.fetchall()
    daily_sleep = {r["date_ref"]: float(r["sleep_minutes"]) for r in sleep_rows if r["sleep_minutes"] is not None}
    sleep_values = [daily_sleep[d] for d in days if d in daily_sleep]

    return {
        "days": days,
        "n_days": n_days,
        "alcohol_days_count": len(alcohol_days),
        "total_alcohol_doses": total_alcohol_doses,
        "daily_alcohol_doses": [total_alcohol_doses / n_days] * n_days,  # ou lista de doses
        "workout_days_count": len(workout_days),
        "daily_workout_volumes": [daily_volume[d] for d in days],
        "daily_workout_durations": [daily_duration[d] for d in days],
        "weekend_days_count": weekend_days_count,
        "active_supplements": sorted(list(active_supps)),
        "sleep_values": sleep_values,
    }


def calculate_covariate_balance(
    conn: sqlite3.Connection,
    control_start: str,
    control_end: str,
    treatment_start: str,
    treatment_end: str,
    experiment_id: Optional[int] = None,
    intervention_id: Optional[int] = None,
    exclude_intervention_name: Optional[str] = None,
) -> ConfounderReport:
    """Calcula o balanço de covariáveis exógenas entre o período de controle e de intervenção."""
    ctrl_data = extract_period_lifestyle_data(conn, control_start, control_end, exclude_intervention_name)
    treat_data = extract_period_lifestyle_data(conn, treatment_start, treatment_end, exclude_intervention_name)

    covariates: List[CovariateItem] = []
    imbalanced_factors: List[str] = []

    # 1. Consumo de Álcool - Frequência (% de dias expostos)
    c_alc_p, t_alc_p, alc_delta_pct, alc_d = calculate_proportion_standardized_diff(
        ctrl_data["alcohol_days_count"], ctrl_data["n_days"],
        treat_data["alcohol_days_count"], treat_data["n_days"],
    )
    is_alc_imbalanced = abs(alc_d) >= 0.30 or (c_alc_p > 0 and abs(alc_delta_pct) >= 20.0) or (c_alc_p == 0 and t_alc_p >= 15.0)
    covariates.append(
        CovariateItem(
            key="alcohol_frequency",
            name="Consumo de Álcool (frequência de dias)",
            category="substance",
            control_mean=c_alc_p,
            treatment_mean=t_alc_p,
            unit="%",
            delta_pct=alc_delta_pct,
            standardized_diff=alc_d,
            is_imbalanced=is_alc_imbalanced,
            detail_text=f"{ctrl_data['alcohol_days_count']}d de {ctrl_data['n_days']}d no controle vs {treat_data['alcohol_days_count']}d de {treat_data['n_days']}d na intervenção",
        )
    )
    if is_alc_imbalanced:
        imbalanced_factors.append(f"consumo de álcool ({alc_delta_pct:+.1f}%)")

    # 2. Volume Médio Diário de Treino (kg/dia)
    c_vol_m, t_vol_m, vol_delta_pct, vol_d = calculate_continuous_standardized_diff(
        ctrl_data["daily_workout_volumes"],
        treat_data["daily_workout_volumes"],
    )
    is_vol_imbalanced = abs(vol_d) >= 0.30 or (c_vol_m > 0 and abs(vol_delta_pct) >= 20.0) or (c_vol_m == 0 and t_vol_m > 500.0)
    covariates.append(
        CovariateItem(
            key="workout_volume_daily",
            name="Volume de Treino (carga total média diária)",
            category="exercise",
            control_mean=c_vol_m,
            treatment_mean=t_vol_m,
            unit="kg/dia",
            delta_pct=vol_delta_pct,
            standardized_diff=vol_d,
            is_imbalanced=is_vol_imbalanced,
            detail_text=f"{c_vol_m:.0f} kg/dia vs {t_vol_m:.0f} kg/dia",
        )
    )
    if is_vol_imbalanced:
        imbalanced_factors.append(f"volume de treino ({vol_delta_pct:+.1f}%)")

    # 3. Frequência de Treino (% de dias com exercício)
    c_w_p, t_w_p, w_delta_pct, w_d = calculate_proportion_standardized_diff(
        ctrl_data["workout_days_count"], ctrl_data["n_days"],
        treat_data["workout_days_count"], treat_data["n_days"],
    )
    is_w_imbalanced = abs(w_d) >= 0.30 or (c_w_p > 0 and abs(w_delta_pct) >= 20.0)
    covariates.append(
        CovariateItem(
            key="workout_frequency",
            name="Frequência de Treino (% de dias ativos)",
            category="exercise",
            control_mean=c_w_p,
            treatment_mean=t_w_p,
            unit="%",
            delta_pct=w_delta_pct,
            standardized_diff=w_d,
            is_imbalanced=is_w_imbalanced,
            detail_text=f"{ctrl_data['workout_days_count']} treinos ({c_w_p:.0f}%) vs {treat_data['workout_days_count']} treinos ({t_w_p:.0f}%)",
        )
    )

    # 4. Distribuição de Fim de Semana (Sex/Sáb/Dom)
    c_wknd_p, t_wknd_p, wknd_delta_pct, wknd_d = calculate_proportion_standardized_diff(
        ctrl_data["weekend_days_count"], ctrl_data["n_days"],
        treat_data["weekend_days_count"], treat_data["n_days"],
    )
    is_wknd_imbalanced = abs(wknd_d) >= 0.30 or (c_wknd_p > 0 and abs(wknd_delta_pct) >= 20.0)
    covariates.append(
        CovariateItem(
            key="weekend_ratio",
            name="Proporção de Fins de Semana (Sex/Sáb/Dom)",
            category="routine",
            control_mean=c_wknd_p,
            treatment_mean=t_wknd_p,
            unit="%",
            delta_pct=wknd_delta_pct,
            standardized_diff=wknd_d,
            is_imbalanced=is_wknd_imbalanced,
            detail_text=f"{c_wknd_p:.1f}% dos dias no controle vs {t_wknd_p:.1f}% na intervenção",
        )
    )
    if is_wknd_imbalanced:
        imbalanced_factors.append(f"proporção de fins de semana ({wknd_delta_pct:+.1f}%)")

    # 5. Suplementação Concomitante
    c_supps = set(ctrl_data["active_supplements"])
    t_supps = set(treat_data["active_supplements"])
    new_supps = t_supps - c_supps
    c_supp_count = float(len(c_supps))
    t_supp_count = float(len(t_supps))
    supp_delta_pct = ((t_supp_count - c_supp_count) / c_supp_count * 100.0) if c_supp_count > 0 else (100.0 if t_supp_count > 0 else 0.0)
    is_supp_imbalanced = len(new_supps) > 0 or abs(t_supp_count - c_supp_count) >= 1.0
    supp_d = 0.50 if is_supp_imbalanced else 0.0
    covariates.append(
        CovariateItem(
            key="concurrent_supplements",
            name="Outros Suplementos Concomitantes",
            category="supplement",
            control_mean=c_supp_count,
            treatment_mean=t_supp_count,
            unit="compostos",
            delta_pct=round(supp_delta_pct, 1),
            standardized_diff=supp_d,
            is_imbalanced=is_supp_imbalanced,
            detail_text=f"{len(new_supps)} novos compostos introduzidos: {', '.join(sorted(new_supps))}" if new_supps else f"{int(c_supp_count)} compostos mantidos estáveis",
        )
    )
    if is_supp_imbalanced and new_supps:
        imbalanced_factors.append(f"introdução concomitante de {', '.join(sorted(new_supps))}")

    # 6. Duração do Sono (minutos diários) se houver dados
    if len(ctrl_data["sleep_values"]) >= 3 and len(treat_data["sleep_values"]) >= 3:
        c_slp_m, t_slp_m, slp_delta_pct, slp_d = calculate_continuous_standardized_diff(
            ctrl_data["sleep_values"], treat_data["sleep_values"]
        )
        is_slp_imbalanced = abs(slp_d) >= 0.30 or abs(slp_delta_pct) >= 15.0
        covariates.append(
            CovariateItem(
                key="sleep_duration",
                name="Duração do Sono",
                category="sleep",
                control_mean=c_slp_m,
                treatment_mean=t_slp_m,
                unit="min",
                delta_pct=slp_delta_pct,
                standardized_diff=slp_d,
                is_imbalanced=is_slp_imbalanced,
                detail_text=f"{c_slp_m:.0f} min/noite vs {t_slp_m:.0f} min/noite",
            )
        )
        if is_slp_imbalanced:
            imbalanced_factors.append(f"tempo de sono ({slp_delta_pct:+.1f}%)")

    # Avaliação de viés severo
    has_severe = any(cov.is_imbalanced for cov in covariates if cov.key in ("alcohol_frequency", "workout_volume_daily", "concurrent_supplements", "weekend_ratio"))
    imbalanced_count = sum(1 for c in covariates if c.is_imbalanced)

    if has_severe:
        factors_str = " e ".join(imbalanced_factors) if imbalanced_factors else "fatores de estilo de vida"
        warning_summary = (
            f"Resultado com possível confundidor: durante o período com a intervenção, "
            f"foram observadas variações expressivas em covariáveis exógenas ({factors_str}). "
            f"A melhora ou alteração nas métricas não pode ser atribuída exclusivamente ao protocolo "
            f"testado devido a variações simultâneas em fatores exógenos."
        )
    else:
        warning_summary = (
            "Covariáveis balanceadas: não foram detectadas distorções exógenas expressivas "
            "(álcool, treino, rotina de fim de semana e suplementação concomitante) entre os períodos comparados."
        )

    return ConfounderReport(
        experiment_id=experiment_id,
        intervention_id=intervention_id,
        control_period={
            "start": control_start,
            "end": control_end,
            "days": ctrl_data["n_days"],
        },
        treatment_period={
            "start": treatment_start,
            "end": treatment_end,
            "days": treat_data["n_days"],
        },
        covariates=covariates,
        has_severe_confounding=has_severe,
        imbalanced_factors_count=imbalanced_count,
        warning_summary=warning_summary,
        disclaimer=METHODOLOGICAL_DISCLAIMER,
    )


def analyze_before_after_intervention(
    conn: sqlite3.Connection,
    intervention_id: int,
    days_before: int = 30,
    days_after: int = 30,
) -> BeforeAfterAnalysisResponse:
    """Realiza a análise comparativa Antes vs. Depois de um protocolo/intervenção."""
    cur = conn.execute("SELECT * FROM interventions WHERE id = ?;", (intervention_id,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Intervenção com ID {intervention_id} não encontrada.")

    start_date = row["start_date"]
    end_date = row["end_date"]
    name = row["name"]
    category = row["category"]
    target_metric = row["target_metric"] or "hrv_ms"

    start_d = _parse_date(start_date)
    control_start = (start_d - timedelta(days=days_before)).isoformat()
    control_end = (start_d - timedelta(days=1)).isoformat()

    treatment_start = start_date
    if end_date:
        treat_end_d = min(_parse_date(end_date), start_d + timedelta(days=days_after - 1))
    else:
        # Usa até a data atual ou dias após
        today = date.today()
        treat_end_d = min(today, start_d + timedelta(days=days_after - 1))
        if treat_end_d < start_d:
            treat_end_d = start_d + timedelta(days=days_after - 1)
    treatment_end = treat_end_d.isoformat()

    # Busca valores da métrica alvo no banco
    cur = conn.execute(
        f"""
        SELECT date_ref, {target_metric}
        FROM daily_metrics
        WHERE date_ref >= ? AND date_ref <= ? AND {target_metric} IS NOT NULL
        ORDER BY date_ref ASC;
        """,
        (control_start, treatment_end),
    )
    metric_map = {r["date_ref"]: float(r[target_metric]) for r in cur.fetchall()}

    ctrl_days = _date_range_days(control_start, control_end)
    treat_days = _date_range_days(treatment_start, treatment_end)

    ctrl_vals = [metric_map[d] for d in ctrl_days if d in metric_map]
    treat_vals = [metric_map[d] for d in treat_days if d in metric_map]

    stats_res = analyze_n_of_1(ctrl_vals, treat_vals)

    confounder_rep = calculate_covariate_balance(
        conn=conn,
        control_start=control_start,
        control_end=control_end,
        treatment_start=treatment_start,
        treatment_end=treatment_end,
        intervention_id=intervention_id,
        exclude_intervention_name=name,
    )

    metric_labels = {
        "hrv_ms": "HRV (VFC)",
        "rhr_bpm": "FC de Repouso (RHR)",
        "sleep_minutes": "Duração do Sono",
        "sleep_deep_min": "Sono Profundo",
        "sleep_rem_min": "Sono REM",
        "readiness_score": "Readiness Score",
        "weight_kg": "Peso Corporal",
    }

    return BeforeAfterAnalysisResponse(
        intervention_id=intervention_id,
        intervention_name=name,
        category=category,
        start_date=start_date,
        end_date=end_date,
        target_metric=target_metric,
        target_metric_name=metric_labels.get(target_metric, target_metric),
        control_period={
            "start": control_start,
            "end": control_end,
            "days_count": len(ctrl_days),
            "observations_count": len(ctrl_vals),
        },
        treatment_period={
            "start": treatment_start,
            "end": treatment_end,
            "days_count": len(treat_days),
            "observations_count": len(treat_vals),
        },
        metric_comparison=stats_res,
        confounder_report=confounder_rep,
    )


def analyze_n_of_1_confounders(
    conn: sqlite3.Connection,
    experiment_id: int,
) -> ConfounderReport:
    """Calcula o relatório de balanceamento de covariáveis para um experimento N-of-1 existente."""
    cur = conn.execute("SELECT * FROM n_of_1_experiments WHERE id = ?;", (experiment_id,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Experimento N-of-1 com ID {experiment_id} não encontrado.")

    ctrl_start = row["control_start"]
    ctrl_end = row["control_end"]
    treat_start = row["treatment_start"]
    treat_end = row["treatment_end"]

    return calculate_covariate_balance(
        conn=conn,
        control_start=ctrl_start,
        control_end=ctrl_end,
        treatment_start=treat_start,
        treatment_end=treat_end,
        experiment_id=experiment_id,
    )
