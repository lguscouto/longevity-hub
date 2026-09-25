"""
Motor de Detecção de Quebras de Patamar (Change Point Detection & CUSUM) - Fase 4.
Identifica alterações sustentadas de nível (level shift) em séries temporais fisiológicas,
descartando spikes efêmeros de 1 único dia e projetando os pontos de quebra na Timeline.
"""

from __future__ import annotations

import json
import math
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from longevidade.context.models import HealthEvent, MetricChangePoint


METRIC_SPECS: Dict[str, Dict[str, Any]] = {
    "hrv_ms": {
        "label": "HRV",
        "unit": "ms",
        "direction": "drop",
        "min_delta_pct": -15.0,
        "min_delta_abs": -5.0,
        "min_z_score": -1.5,
        "slack": 0.5,
        "cusum_h": 3.5,
    },
    "rhr_bpm": {
        "label": "FC de Repouso",
        "unit": "bpm",
        "direction": "rise",
        "min_delta_pct": 8.0,
        "min_delta_abs": 5.0,
        "min_z_score": 1.5,
        "slack": 0.5,
        "cusum_h": 3.5,
    },
    "sleep_minutes": {
        "label": "Sono",
        "unit": "min",
        "direction": "drop",
        "min_delta_pct": -12.0,
        "min_delta_abs": -60.0,
        "min_z_score": -1.5,
        "slack": 0.5,
        "cusum_h": 3.5,
    },
    "weight_kg": {
        "label": "Peso",
        "unit": "kg",
        "direction": "both",
        "min_delta_pct": 1.5,
        "min_delta_abs": 1.2,
        "min_z_score": 1.5,
        "slack": 0.5,
        "cusum_h": 3.5,
    },
}


def _calculate_median_and_mad(values: List[float]) -> Tuple[float, float]:
    """Calcula a mediana e a escala MAD normalizada (1.4826 * MAD)."""
    if not values:
        return 0.0, 1.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mid = n // 2
    median = (
        sorted_vals[mid]
        if n % 2 != 0
        else (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0
    )

    diffs = sorted(abs(v - median) for v in sorted_vals)
    mad = diffs[mid] if n % 2 != 0 else (diffs[mid - 1] + diffs[mid]) / 2.0
    # Piso mínimo de dispersão para evitar escala nula quando histórico é muito homogêneo
    effective_mad = max(mad, 0.03 * abs(median), 0.5)
    scale = 1.4826 * effective_mad
    return round(median, 2), round(scale, 4)


def detect_change_points_for_metric(
    conn: sqlite3.Connection,
    metric_name: str,
    min_persisted_days: int = 3,
    baseline_window_days: int = 30,
) -> List[MetricChangePoint]:
    """
    Analisa a série temporal da métrica e identifica quebras de patamar com confirmação CUSUM.
    Requer no mínimo 14 dias prévios de baseline e persistência de min_persisted_days dias consecutivos.
    """
    spec = METRIC_SPECS.get(metric_name)
    if not spec:
        return []

    cur = conn.cursor()
    col = metric_name
    cur.execute(
        f"""
        SELECT date_ref, {col}
        FROM daily_metrics
        WHERE {col} IS NOT NULL
        ORDER BY date_ref ASC;
        """
    )
    rows = cur.fetchall()
    if len(rows) < 14 + min_persisted_days:
        return []

    dates = [r[0] for r in rows]
    vals = [float(r[1]) for r in rows]
    n_points = len(rows)

    change_points: List[MetricChangePoint] = []
    i = 14  # Inicia após no mínimo 14 dias de baseline prévio

    while i < n_points - min_persisted_days + 1:
        target_d = dates[i]
        # Janela de baseline prévio (14 a 30 dias móveis anteriores a target_d)
        pre_vals = vals[max(0, i - baseline_window_days) : i]
        if len(pre_vals) < 14:
            i += 1
            continue

        baseline_median, scale = _calculate_median_and_mad(pre_vals)
        if scale <= 1e-6 or baseline_median == 0:
            i += 1
            continue

        # Janela pós-evento (min_persisted_days a 7 dias)
        max_lookahead = min(7, n_points - i)
        post_vals = vals[i : i + max_lookahead]
        post_median, _ = _calculate_median_and_mad(post_vals[:min_persisted_days])

        delta_abs = post_median - baseline_median
        delta_pct = (delta_abs / baseline_median) * 100.0
        robust_z = delta_abs / scale

        # Avaliação de CUSUM na janela pós-evento
        direction = spec["direction"]
        cusum_val = 0.0
        slack = spec["slack"]
        is_sustained = True
        persisted_count = 0

        for j in range(max_lookahead):
            val_j = vals[i + j]
            z_j = (val_j - baseline_median) / scale

            if direction == "drop":
                # Detecta queda
                if z_j <= -1.0 or val_j < baseline_median:
                    persisted_count += 1
                    cusum_val = max(0.0, cusum_val - z_j - slack)
                else:
                    if j < min_persisted_days:
                        is_sustained = False
                    break
            elif direction == "rise":
                # Detecta elevação
                if z_j >= 1.0 or val_j > baseline_median:
                    persisted_count += 1
                    cusum_val = max(0.0, cusum_val + z_j - slack)
                else:
                    if j < min_persisted_days:
                        is_sustained = False
                    break
            else:
                # Both directions (ex: peso)
                if abs(z_j) >= 1.0:
                    persisted_count += 1
                    cusum_val = max(0.0, cusum_val + abs(z_j) - slack)
                else:
                    if j < min_persisted_days:
                        is_sustained = False
                    break

        if not is_sustained or persisted_count < min_persisted_days:
            i += 1
            continue

        # Verifica conformidade com pisos mínimos clínicos da métrica
        passes_threshold = False
        if direction == "drop":
            if delta_pct <= spec["min_delta_pct"] and delta_abs <= spec["min_delta_abs"]:
                passes_threshold = True
        elif direction == "rise":
            if delta_pct >= spec["min_delta_pct"] and delta_abs >= spec["min_delta_abs"]:
                passes_threshold = True
        else:
            if abs(delta_pct) >= spec["min_delta_pct"] and abs(delta_abs) >= spec["min_delta_abs"]:
                passes_threshold = True

        if not passes_threshold:
            i += 1
            continue

        # Define método de detecção e significância
        detection_method = "cusum_confirmed" if cusum_val >= spec["cusum_h"] else "robust_level_shift"
        if abs(robust_z) >= 2.0 or persisted_count >= 5 or cusum_val >= 5.0:
            significance = "significativa"
        else:
            significance = "notável"

        metric_label = spec["label"]
        unit = spec["unit"]
        dir_text = "reduziu" if delta_pct < 0 else "elevou"
        sign_str = "+" if delta_pct > 0 else ""

        headline = f"Mudança de Patamar: {metric_label} {dir_text} {abs(delta_pct):.1f}%"
        description = (
            f"{metric_label} manteve-se {sign_str}{delta_pct:.1f}% ({delta_abs:+.1f} {unit}) "
            f"em relação ao baseline prévio de {baseline_median:.1f} {unit} por {persisted_count} "
            f"dias consecutivos (novo patamar: {post_median:.1f} {unit})."
        )

        cp = MetricChangePoint(
            id=str(uuid4()),
            metric=metric_name,
            metric_name=metric_label,
            unit=unit,
            timestamp=f"{target_d}T08:00:00Z",
            date_ref=target_d,
            baseline_value=round(baseline_median, 2),
            observed_value=round(post_median, 2),
            delta_absolute=round(delta_abs, 2),
            delta_percent=round(delta_pct, 2),
            robust_z_score=round(robust_z, 2),
            significance=significance,
            detection_method=detection_method,
            persisted_days=persisted_count,
            headline=headline,
            description=description,
            metadata={
                "cusum_score": round(cusum_val, 2),
                "scale": scale,
                "baseline_window": len(pre_vals),
                "evaluated_at": datetime.now(timezone.utc).isoformat(),
            },
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        change_points.append(cp)
        # Salva imediatamente no banco
        save_change_point(conn, cp)

        # Salta os dias de persistência para não duplicar o mesmo evento contíguo
        i += persisted_count

    return change_points


def save_change_point(conn: sqlite3.Connection, cp: MetricChangePoint) -> None:
    """Insere ou atualiza o change point em metric_change_points."""
    with conn:
        conn.execute(
            """
            INSERT INTO metric_change_points (
                id, metric, timestamp, date_ref, baseline_value, observed_value,
                delta_absolute, delta_percent, robust_z_score, significance,
                detection_method, persisted_days, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(metric, date_ref, detection_method) DO UPDATE SET
                observed_value = excluded.observed_value,
                delta_absolute = excluded.delta_absolute,
                delta_percent = excluded.delta_percent,
                robust_z_score = excluded.robust_z_score,
                significance = excluded.significance,
                persisted_days = excluded.persisted_days,
                metadata_json = excluded.metadata_json;
            """,
            (
                cp.id,
                cp.metric,
                cp.timestamp,
                cp.date_ref,
                cp.baseline_value,
                cp.observed_value,
                cp.delta_absolute,
                cp.delta_percent,
                cp.robust_z_score,
                cp.significance,
                cp.detection_method,
                cp.persisted_days,
                json.dumps(cp.metadata),
            ),
        )


def load_change_points(
    conn: sqlite3.Connection,
    metric: Optional[str] = None,
    limit: int = 50,
) -> List[MetricChangePoint]:
    """Carrega os change points persistidos na tabela metric_change_points."""
    query = """
        SELECT id, metric, timestamp, date_ref, baseline_value, observed_value,
               delta_absolute, delta_percent, robust_z_score, significance,
               detection_method, persisted_days, metadata_json, created_at
        FROM metric_change_points
    """
    params: List[Any] = []
    if metric:
        query += " WHERE metric = ?"
        params.append(metric)

    query += " ORDER BY date_ref DESC LIMIT ?;"
    params.append(limit)

    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()

    results: List[MetricChangePoint] = []
    for r in rows:
        m_name = r[1]
        spec = METRIC_SPECS.get(m_name, {"label": m_name, "unit": ""})
        metric_label = spec["label"]
        unit = spec["unit"]
        delta_pct = r[7]
        dir_text = "reduziu" if delta_pct < 0 else "elevou"
        sign_str = "+" if delta_pct > 0 else ""

        headline = f"Mudança de Patamar: {metric_label} {dir_text} {abs(delta_pct):.1f}%"
        description = (
            f"{metric_label} manteve-se {sign_str}{delta_pct:.1f}% ({r[6]:+.1f} {unit}) "
            f"em relação ao baseline prévio de {r[4]:.1f} {unit} por {r[11]} "
            f"dias consecutivos (novo patamar: {r[5]:.1f} {unit})."
        )
        meta = json.loads(r[12]) if r[12] else {}

        results.append(
            MetricChangePoint(
                id=r[0],
                metric=m_name,
                metric_name=metric_label,
                unit=unit,
                timestamp=r[2],
                date_ref=r[3],
                baseline_value=r[4],
                observed_value=r[5],
                delta_absolute=r[6],
                delta_percent=delta_pct,
                robust_z_score=r[8],
                significance=r[9],
                detection_method=r[10],
                persisted_days=r[11],
                headline=headline,
                description=description,
                metadata=meta,
                created_at=r[13],
            )
        )
    return results


def project_change_points_to_timeline(
    conn: sqlite3.Connection,
    change_points: List[MetricChangePoint],
) -> int:
    """
    Projeta os change points na tabela health_events com source_key idempotente:
    source_key = change_point:{date_ref}:{metric}
    Retorna o número de eventos gravados.
    """
    projected_count = 0
    cur = conn.cursor()

    for cp in change_points:
        source_key = f"change_point:{cp.date_ref}:{cp.metric}"
        meta = {
            "metric": cp.metric,
            "change_point_id": cp.id,
            "baseline_value": cp.baseline_value,
            "observed_value": cp.observed_value,
            "delta_absolute": cp.delta_absolute,
            "delta_percent": cp.delta_percent,
            "robust_z_score": cp.robust_z_score,
            "persisted_days": cp.persisted_days,
            "detection_method": cp.detection_method,
        }

        confidence = "high" if cp.detection_method == "cusum_confirmed" else "moderate"

        with conn:
            cur.execute(
                """
                INSERT INTO health_events (
                    id, timestamp, date_ref, time_ref, event_type, category,
                    title, description, source, source_type, source_id, source_key,
                    confidence, significance, metadata_json, is_pinned,
                    created_at, updated_at
                ) VALUES (?, ?, ?, '08:00', 'metric_change', 'metric',
                          ?, ?, 'derived', 'change_point', ?, ?,
                          ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(source_key) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    confidence = excluded.confidence,
                    significance = excluded.significance,
                    metadata_json = excluded.metadata_json,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                (
                    str(uuid4()),
                    cp.timestamp,
                    cp.date_ref,
                    cp.headline,
                    cp.description,
                    cp.id,
                    source_key,
                    confidence,
                    cp.significance,
                    json.dumps(meta),
                ),
            )
            projected_count += 1

    return projected_count


def run_full_change_point_pipeline(
    conn: sqlite3.Connection,
    metric: Optional[str] = None,
) -> Tuple[List[MetricChangePoint], int]:
    """Executa detecção de quebras de patamar em todas as métricas-alvo e projeta na Timeline."""
    metrics_to_scan = [metric] if metric else list(METRIC_SPECS.keys())
    all_cps: List[MetricChangePoint] = []

    for m in metrics_to_scan:
        cps = detect_change_points_for_metric(conn, m)
        all_cps.extend(cps)

    projected = project_change_points_to_timeline(conn, all_cps)
    return all_cps, projected
