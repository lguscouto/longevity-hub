"""
Motor de Associações Pessoais & Shrinkage Bayesiano (Fase 3).
Aprende relações individuais empíricas (n de exposições, Cohen's d, correlações, lags e feedback)
para calibrar os priors biológicos na atribuição contextual.
"""

from __future__ import annotations

import json
import math
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from longevidade.context.models import PersonalAssociation


FACTOR_DISPLAY_NAMES: Dict[str, str] = {
    "alcohol": "Consumo de Álcool",
    "sleep_deficit": "Déficit de Sono",
    "acute_training_load": "Carga de Treino Aguda",
    "symptom": "Sintomas ou Doença",
    "late_caffeine": "Cafeína Tardia",
    "travel": "Viagem ou Fuso",
    "stress": "Estresse Elevado",
    "heavy_meal": "Refeição Pesada Tardia",
}

METRIC_DISPLAY_MAP: Dict[str, Tuple[str, str]] = {
    "hrv_ms": ("HRV (VFC)", "ms"),
    "rhr_bpm": ("FC de Repouso", "bpm"),
    "sleep_minutes": ("Sono", "min"),
    "weight_kg": ("Peso", "kg"),
}

CANDIDATE_FACTORS_FOR_METRIC: Dict[str, List[Tuple[str, int]]] = {
    "hrv_ms": [
        ("alcohol", 24),
        ("alcohol", 36),
        ("sleep_deficit", 24),
        ("acute_training_load", 24),
        ("acute_training_load", 48),
        ("symptom", 48),
        ("stress", 24),
    ],
    "rhr_bpm": [
        ("alcohol", 24),
        ("alcohol", 36),
        ("sleep_deficit", 24),
        ("acute_training_load", 24),
        ("symptom", 48),
        ("late_caffeine", 12),
        ("stress", 24),
    ],
    "sleep_minutes": [
        ("alcohol", 24),
        ("late_caffeine", 12),
        ("late_caffeine", 24),
        ("heavy_meal", 12),
        ("acute_training_load", 24),
        ("travel", 48),
        ("stress", 24),
    ],
    "weight_kg": [
        ("heavy_meal", 24),
        ("travel", 72),
        ("acute_training_load", 48),
    ],
}


def _pearson_correlation(x: List[float], y: List[float]) -> Optional[float]:
    """Calcula coeficiente de correlação de Pearson entre x e y."""
    n = len(x)
    if n < 3:
        return None
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    var_x = sum((xi - mean_x) ** 2 for xi in x)
    var_y = sum((yi - mean_y) ** 2 for yi in y)
    if var_x <= 1e-9 or var_y <= 1e-9:
        return None  # Sem variação suficiente
    cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    r = cov / math.sqrt(var_x * var_y)
    return round(max(-1.0, min(1.0, r)), 3)


def _compute_cohens_d(exposed_vals: List[float], unexposed_vals: List[float]) -> Optional[float]:
    """Calcula Cohen's d entre grupo exposto e não exposto."""
    n_e = len(exposed_vals)
    n_u = len(unexposed_vals)
    if n_e < 2 or n_u < 2:
        return None
    mean_e = sum(exposed_vals) / n_e
    mean_u = sum(unexposed_vals) / n_u
    var_e = sum((v - mean_e) ** 2 for v in exposed_vals) / (n_e - 1)
    var_u = sum((v - mean_u) ** 2 for v in unexposed_vals) / (n_u - 1)

    pooled_var = ((n_e - 1) * var_e + (n_u - 1) * var_u) / max(1, n_e + n_u - 2)
    if pooled_var <= 1e-9:
        return 0.0
    d = (mean_e - mean_u) / math.sqrt(pooled_var)
    return round(d, 3)


def get_user_feedback_counts(
    conn: sqlite3.Connection, target_metric: str, factor_key: str
) -> Tuple[int, int]:
    """Retorna contagem de feedback positivo (relevante/útil) e negativo (não relevante)."""
    cur = conn.cursor()
    # Verifica tabela insight_feedback
    cur.execute(
        """
        SELECT is_helpful, user_rating
        FROM insight_feedback
        WHERE target_metric = ? AND (factor_key = ? OR factor_key IS NULL);
        """,
        (target_metric, factor_key),
    )
    rows = cur.fetchall()
    pos = sum(1 for r in rows if r[0] == 1 or r[1] == "relevant")
    neg = sum(1 for r in rows if r[0] == 0 or r[1] == "irrelevant")
    return pos, neg


def extract_paired_factor_data(
    conn: sqlite3.Connection,
    target_metric: str,
    factor_key: str,
    window_hours: int = 24,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Identifica pares de observação no histórico:
    - exposed_days: dias em que o fator ocorreu na janela temporal prévia com a métrica medida.
    - unexposed_days: dias em que o fator NÃO ocorreu na janela prévia e a métrica foi medida.
    """
    cur = conn.cursor()

    # 1. Carrega todas as medições da métrica com date_ref ordenado
    col_map = {
        "hrv_ms": "hrv_ms",
        "rhr_bpm": "rhr_bpm",
        "sleep_minutes": "sleep_minutes",
        "weight_kg": "weight_kg",
    }
    col = col_map.get(target_metric)
    if not col:
        return [], []

    cur.execute(
        f"""
        SELECT date_ref, {col}
        FROM daily_metrics
        WHERE {col} IS NOT NULL
        ORDER BY date_ref ASC;
        """
    )
    metric_rows = cur.fetchall()
    if len(metric_rows) < 5:
        return [], []

    date_to_val: Dict[str, float] = {r[0]: float(r[1]) for r in metric_rows}
    all_dates = sorted(date_to_val.keys())

    # 2. Identifica ocorrências do fator com timestamps precisos
    factor_events_with_time: List[Tuple[datetime, float, str]] = []

    if factor_key == "sleep_deficit":
        # Déficit de sono derivado de daily_metrics
        cur.execute(
            """
            SELECT date_ref, sleep_minutes
            FROM daily_metrics
            WHERE sleep_minutes IS NOT NULL
            ORDER BY date_ref ASC;
            """
        )
        sleep_data = {r[0]: float(r[1]) for r in cur.fetchall()}
        sleep_dates = sorted(sleep_data.keys())

        for i, d in enumerate(sleep_dates):
            prev_dates = [sd for sd in sleep_dates[:i] if sd >= f"{int(d[:4])-1}-01-01"][-30:]
            if len(prev_dates) >= 7:
                avg_sleep = sum(sleep_data[pd] for pd in prev_dates) / len(prev_dates)
                cur_val = sleep_data[d]
                if avg_sleep - cur_val >= 45.0:  # Mais de 45 min abaixo da média
                    dt = datetime.strptime(f"{d} 06:00:00", "%Y-%m-%d %H:%M:%S")
                    factor_events_with_time.append((dt, round(avg_sleep - cur_val, 1), d))

    elif factor_key == "acute_training_load":
        cur.execute(
            """
            SELECT timestamp, date_ref, time_ref, metadata_json
            FROM health_events
            WHERE event_type = 'workout'
            ORDER BY date_ref ASC;
            """
        )
        for r in cur.fetchall():
            ts_str, d_ref, t_ref, meta_raw = r[0], r[1], r[2], r[3]
            meta = json.loads(meta_raw) if meta_raw else {}
            vol = float(meta.get("volume_kg", 0) or 0)
            dur = float(meta.get("duration_min", 0) or 0)
            dose = vol if vol > 0 else (dur or 1.0)
            try:
                cleaned = ts_str.replace("Z", "+00:00")
                dt = datetime.fromisoformat(cleaned).replace(tzinfo=None)
            except Exception:
                dt = datetime.strptime(f"{d_ref} {t_ref or '18:00'}:00", "%Y-%m-%d %H:%M:%S")
            factor_events_with_time.append((dt, dose, d_ref))

    else:
        # Eventos de health_events correspondentes ao event_type
        cur.execute(
            """
            SELECT timestamp, date_ref, time_ref, metadata_json
            FROM health_events
            WHERE event_type = ?
            ORDER BY date_ref ASC;
            """,
            (factor_key,),
        )
        for r in cur.fetchall():
            ts_str, d_ref, t_ref, meta_raw = r[0], r[1], r[2], r[3]
            meta = json.loads(meta_raw) if meta_raw else {}
            dose = float(meta.get("servings", meta.get("dose", meta.get("cups", 1.0))) or 1.0)
            try:
                cleaned = ts_str.replace("Z", "+00:00")
                dt = datetime.fromisoformat(cleaned).replace(tzinfo=None)
            except Exception:
                dt = datetime.strptime(f"{d_ref} {t_ref or '21:00'}:00", "%Y-%m-%d %H:%M:%S")
            factor_events_with_time.append((dt, dose, d_ref))

    # 3. Emparelhamento e cálculo de delta vs baseline de 30 dias prévio
    exposed_list: List[Dict[str, Any]] = []
    unexposed_list: List[Dict[str, Any]] = []

    for i, target_d in enumerate(all_dates):
        # Mínimo de 7 dias de histórico prévio para ter baseline estável
        prior_dates = all_dates[max(0, i - 30) : i]
        if len(prior_dates) < 7:
            continue

        prior_vals = sorted(date_to_val[pd] for pd in prior_dates)
        # Mediana do baseline
        mid = len(prior_vals) // 2
        baseline_median = (
            prior_vals[mid]
            if len(prior_vals) % 2 != 0
            else (prior_vals[mid - 1] + prior_vals[mid]) / 2.0
        )

        obs_val = date_to_val[target_d]
        if baseline_median == 0:
            continue
        delta_pct = ((obs_val - baseline_median) / baseline_median) * 100.0

        # Momento presumido de leitura da métrica matinal (08:00)
        ref_metric_dt = datetime.strptime(f"{target_d} 08:00:00", "%Y-%m-%d %H:%M:%S")

        matched_events = [
            (ev_dt, dose)
            for ev_dt, dose, _ in factor_events_with_time
            if 0.0 <= (ref_metric_dt - ev_dt).total_seconds() / 3600.0 <= float(window_hours)
        ]

        item = {
            "date_ref": target_d,
            "observed_value": obs_val,
            "baseline_value": round(baseline_median, 2),
            "delta_pct": round(delta_pct, 2),
        }

        if matched_events:
            max_dose = max(d for _, d in matched_events)
            item["dose"] = max_dose
            exposed_list.append(item)
        else:
            unexposed_list.append(item)

    return exposed_list, unexposed_list


def compute_personal_association(
    conn: sqlite3.Connection,
    target_metric: str,
    factor_key: str,
    window_hours: int = 24,
) -> Optional[PersonalAssociation]:
    """Calcula estatísticas de associação individual e shrinkage para o par (métrica, fator, janela)."""
    exposed, unexposed = extract_paired_factor_data(
        conn, target_metric, factor_key, window_hours
    )
    n = len(exposed)
    if n == 0:
        return None

    factor_name = FACTOR_DISPLAY_NAMES.get(factor_key, factor_key)
    metric_label, unit = METRIC_DISPLAY_MAP.get(target_metric, (target_metric, ""))

    exposed_deltas = [item["delta_pct"] for item in exposed]
    unexposed_deltas = [item["delta_pct"] for item in unexposed]
    exposed_vals = [item["observed_value"] for item in exposed]
    unexposed_vals = [item["observed_value"] for item in unexposed]

    mean_delta = sum(exposed_deltas) / n
    cohens_d = _compute_cohens_d(exposed_vals, unexposed_vals)

    # Correlação dose-resposta (se houver dose numérica registrada com variação)
    doses = [item.get("dose", 1.0) for item in exposed]
    correlation = _pearson_correlation(doses, exposed_deltas)

    # Níveis de confiança
    if n >= 14:
        confidence = "high"
    elif n >= 5:
        confidence = "moderate"
    else:
        confidence = "low"

    # Feedback do usuário para calibração
    pos_fb, neg_fb = get_user_feedback_counts(conn, target_metric, factor_key)
    feedback_balance = pos_fb - neg_fb

    # Shrinkage Bayesiano com saturação em N_max = 15
    n_max = 15.0
    base_shrinkage = min(n, int(n_max)) / n_max

    # Modulação por feedback explícito do usuário
    feedback_mult = max(0.2, min(1.5, 1.0 + 0.15 * feedback_balance))
    calibrated_shrinkage = round(min(1.0, max(0.0, base_shrinkage * feedback_mult)), 3)

    # Textos de síntese e evidência individual
    direction = "redução" if mean_delta < 0 else "elevação"
    delta_mag = abs(round(mean_delta, 1))

    headline = f"{factor_name} associado a {direction} de {delta_mag}% no {metric_label}"
    evidence_text = (
        f"No seu histórico pessoal (n={n}), episódios de {factor_name.lower()} "
        f"foram acompanhados por {direction} média de {delta_mag}% no {metric_label} "
        f"(janela de {window_hours}h)."
    )
    if feedback_balance > 0:
        evidence_text += " Calibrado positivamente com base nas suas avaliações."
    elif feedback_balance < 0:
        evidence_text += " Atenuado com base no seu feedback prévio."

    first_obs = exposed[0]["date_ref"] if exposed else None
    last_obs = exposed[-1]["date_ref"] if exposed else None

    # Coverage aproximado
    total_metric_days = len(exposed) + len(unexposed)
    data_coverage = (
        round((n / total_metric_days) * 100.0, 1) if total_metric_days > 0 else 0.0
    )

    metadata_payload = {
        "positive_feedback_count": pos_fb,
        "negative_feedback_count": neg_fb,
        "feedback_multiplier": round(feedback_mult, 2),
        "mean_delta_pct": round(mean_delta, 2),
        "cohens_d": cohens_d,
        "raw_samples": n,
        "unexposed_samples": len(unexposed),
        "window_hours": window_hours,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }

    return PersonalAssociation(
        id=str(uuid4()),
        target_metric=target_metric,
        factor=factor_key,
        factor_name=factor_name,
        window_hours=window_hours,
        sample_size=n,
        effect_size=cohens_d,
        mean_delta_pct=round(mean_delta, 2),
        correlation=correlation,
        shrinkage_factor=calibrated_shrinkage,
        confidence=confidence,
        data_coverage_pct=data_coverage,
        user_feedback_balance=feedback_balance,
        headline=headline,
        evidence_text=evidence_text,
        first_observation_at=first_obs,
        last_observation_at=last_obs,
        metadata=metadata_payload,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


def save_personal_association(conn: sqlite3.Connection, assoc: PersonalAssociation) -> None:
    """Insere ou atualiza associação pessoal na tabela personal_associations."""
    with conn:
        conn.execute(
            """
            INSERT INTO personal_associations (
                id, target_metric, factor, window_hours, sample_size,
                effect_size, correlation, shrinkage_factor, confidence,
                data_coverage_pct, mean_delta_pct, metadata_json,
                first_observation_at, last_observation_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(target_metric, factor, window_hours) DO UPDATE SET
                sample_size = excluded.sample_size,
                effect_size = excluded.effect_size,
                correlation = excluded.correlation,
                shrinkage_factor = excluded.shrinkage_factor,
                confidence = excluded.confidence,
                data_coverage_pct = excluded.data_coverage_pct,
                mean_delta_pct = excluded.mean_delta_pct,
                metadata_json = excluded.metadata_json,
                first_observation_at = excluded.first_observation_at,
                last_observation_at = excluded.last_observation_at,
                updated_at = CURRENT_TIMESTAMP;
            """,
            (
                assoc.id,
                assoc.target_metric,
                assoc.factor,
                assoc.window_hours,
                assoc.sample_size,
                assoc.effect_size,
                assoc.correlation,
                assoc.shrinkage_factor,
                assoc.confidence,
                assoc.data_coverage_pct,
                assoc.mean_delta_pct,
                json.dumps(assoc.metadata),
                assoc.first_observation_at,
                assoc.last_observation_at,
            ),
        )


def load_personal_associations(
    conn: sqlite3.Connection,
    target_metric: Optional[str] = None,
    min_confidence: Optional[str] = None,
    min_samples: int = 1,
) -> List[PersonalAssociation]:
    """Carrega associações pessoais persistidas do banco."""
    query = """
        SELECT id, target_metric, factor, window_hours, sample_size,
               effect_size, correlation, shrinkage_factor, confidence,
               data_coverage_pct, mean_delta_pct, metadata_json,
               first_observation_at, last_observation_at, created_at, updated_at
        FROM personal_associations
        WHERE sample_size >= ?
    """
    params: List[Any] = [min_samples]

    if target_metric:
        query += " AND target_metric = ?"
        params.append(target_metric)

    if min_confidence:
        if min_confidence == "high":
            query += " AND confidence = 'high'"
        elif min_confidence == "moderate":
            query += " AND confidence IN ('moderate', 'high')"

    query += " ORDER BY sample_size DESC, shrinkage_factor DESC;"

    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()

    results: List[PersonalAssociation] = []
    for r in rows:
        meta = json.loads(r[11]) if r[11] else {}
        factor_key = r[2]
        metric_key = r[1]
        factor_name = FACTOR_DISPLAY_NAMES.get(factor_key, factor_key)
        metric_label, _ = METRIC_DISPLAY_MAP.get(metric_key, (metric_key, ""))

        mean_delta = r[10] or 0.0
        direction = "redução" if mean_delta < 0 else "elevação"
        n = r[4]
        window_h = r[3]

        headline = f"{factor_name} associado a {direction} de {abs(round(mean_delta, 1))}% no {metric_label}"
        evidence = (
            f"No seu histórico pessoal (n={n}), episódios de {factor_name.lower()} "
            f"foram acompanhados por {direction} média de {abs(round(mean_delta, 1))}% no {metric_label} "
            f"(janela de {window_h}h)."
        )

        pos_fb = meta.get("positive_feedback_count", 0)
        neg_fb = meta.get("negative_feedback_count", 0)
        fb_balance = pos_fb - neg_fb

        results.append(
            PersonalAssociation(
                id=r[0],
                target_metric=metric_key,
                factor=factor_key,
                factor_name=factor_name,
                window_hours=window_h,
                sample_size=n,
                effect_size=r[5],
                correlation=r[6],
                shrinkage_factor=r[7] or 0.0,
                confidence=r[8],
                data_coverage_pct=r[9],
                mean_delta_pct=mean_delta,
                user_feedback_balance=fb_balance,
                headline=headline,
                evidence_text=evidence,
                first_observation_at=r[12],
                last_observation_at=r[13],
                metadata=meta,
                created_at=r[14],
                updated_at=r[15],
            )
        )

    return results


def recompute_all_personal_associations(
    conn: sqlite3.Connection,
    target_metric: Optional[str] = None,
) -> List[PersonalAssociation]:
    """Executa o pipeline completo de aprendizado de associações individuais e salva no banco."""
    metrics_to_run = (
        [target_metric] if target_metric else ["hrv_ms", "rhr_bpm", "sleep_minutes", "weight_kg"]
    )
    computed: List[PersonalAssociation] = []

    for m in metrics_to_run:
        candidates = CANDIDATE_FACTORS_FOR_METRIC.get(m, [])
        for factor_key, window_h in candidates:
            assoc = compute_personal_association(conn, m, factor_key, window_h)
            if assoc and assoc.sample_size >= 1:
                save_personal_association(conn, assoc)
                computed.append(assoc)

    return computed


def get_calibrated_prior_and_evidence(
    conn: sqlite3.Connection,
    target_metric: str,
    factor_key: str,
    window_hours: float,
    base_prior: float,
) -> Tuple[float, Optional[str], Optional[Dict[str, Any]]]:
    """
    Consulta se existe associação pessoal aprendida para o par (métrica, fator).
    Se existir (n >= 3), combina o prior biológico com a evidência individual via Shrinkage Bayesiano:
        S_effective = (1 - w) * P0 + w * S_personal
    Retorna (calibrated_prior, evidence_text, personal_stats).
    """
    cur = conn.cursor()
    # Busca a associação mais próxima da janela solicitada
    cur.execute(
        """
        SELECT sample_size, effect_size, shrinkage_factor, confidence,
               mean_delta_pct, metadata_json, window_hours
        FROM personal_associations
        WHERE target_metric = ? AND factor = ?
        ORDER BY ABS(window_hours - ?) ASC
        LIMIT 1;
        """,
        (target_metric, factor_key, window_hours),
    )
    row = cur.fetchone()
    if not row or row[0] < 3:
        return base_prior, None, None

    sample_size = row[0]
    shrinkage = float(row[2] or 0.0)
    confidence = row[3]
    mean_delta = float(row[4] or 0.0)
    meta = json.loads(row[5]) if row[5] else {}
    matched_window = row[6]

    # Força empírica pessoal normalizada: quanto maior o desvio médio histórico, maior a força (teto em 30% de desvio)
    personal_strength = min(0.95, max(0.20, abs(mean_delta) / 25.0))

    # Equação de Shrinkage Bayesiano:
    # S_eff = (1 - w) * Prior_Bio + w * Força_Pessoal
    calibrated_prior = (1.0 - shrinkage) * base_prior + shrinkage * personal_strength

    # Modulação de feedback: se tiver muito feedback negativo, amortece ainda mais
    pos_fb = meta.get("positive_feedback_count", 0)
    neg_fb = meta.get("negative_feedback_count", 0)
    if neg_fb > pos_fb:
        penalty = min(0.5, 0.15 * (neg_fb - pos_fb))
        calibrated_prior = max(0.15, calibrated_prior - penalty)

    factor_name = FACTOR_DISPLAY_NAMES.get(factor_key, factor_key)
    metric_label, _ = METRIC_DISPLAY_MAP.get(target_metric, (target_metric, ""))
    direction = "redução" if mean_delta < 0 else "elevação"

    evidence_text = (
        f"Histórico pessoal (n={sample_size}): associado a {direction} média de "
        f"{abs(round(mean_delta, 1))}% no {metric_label}."
    )

    stats = {
        "sample_size": sample_size,
        "mean_delta_pct": round(mean_delta, 1),
        "cohens_d": row[1],
        "shrinkage_factor": round(shrinkage, 2),
        "confidence": confidence,
        "matched_window_hours": matched_window,
        "feedback_balance": pos_fb - neg_fb,
    }

    return round(calibrated_prior, 3), evidence_text, stats
