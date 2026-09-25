"""
Motor de Atribuição Contextual & Scoring (Contextual Insight Engine).
Calcula a força de associação temporal e magnitude de fatores candidatos com base em priors e decaimento temporal.
"""

from __future__ import annotations

import math
import sqlite3
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from longevidade.context.baselines import evaluate_metric_baseline
from longevidade.context.events import get_user_timezone
from longevidade.context.personal_associations import get_calibrated_prior_and_evidence
from longevidade.context.windows import (
    evaluate_factor_dose,
    find_candidate_events_for_metric,
)


SAFETY_DISCLAIMER = (
    "Esses fatores ocorreram no mesmo período. Isso indica associação temporal no seu "
    "histórico pessoal e não confirma causalidade."
)


class FactorAttribution(BaseModel):
    """Representa a força de associação e impacto de um fator identificado."""

    factor_key: str
    factor_name: str
    strength: str             # 'forte', 'moderada', 'fraca'
    strength_score: float     # 0.0 a 1.0
    summary: str
    window_hours: float
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    event_timestamp: Optional[str] = None
    personal_evidence: Optional[str] = None
    personal_stats: Optional[Dict[str, Any]] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class ContextExplanation(BaseModel):
    """Payload completo e auditável da explicação de uma mudança em métrica."""

    metric: str
    metric_name: str
    unit: str
    target_date: str
    observed_value: float
    baseline_value: float
    delta_absolute: float
    delta_percent: float
    robust_z_score: float
    significance: str          # 'normal', 'notável', 'significativa'
    analysis_confidence: str   # 'baixa', 'moderada', 'alta'
    data_coverage_days: int
    total_baseline_days: int
    factors: List[FactorAttribution] = Field(default_factory=list)
    summary_headline: str
    structured_explanation: str
    disclaimer: str = SAFETY_DISCLAIMER
    provenance: Dict[str, Any] = Field(default_factory=dict)


METRIC_NAME_MAP = {
    "hrv_ms": ("HRV", "ms"),
    "rhr_bpm": ("FC de Repouso", "bpm"),
    "sleep_minutes": ("Sono", "min"),
    "weight_kg": ("Peso", "kg"),
}


def compute_context_attribution(
    conn: sqlite3.Connection,
    metric_name: str,
    target_date: str,
    user_tz_name: Optional[str] = None,
) -> ContextExplanation:
    """Executa a análise de atribuição contextual completa para a métrica e data informadas."""
    label, unit = METRIC_NAME_MAP.get(metric_name, (metric_name, ""))

    baseline_res = evaluate_metric_baseline(conn, metric_name, target_date, baseline_days=30)

    # 1. Se histórico for insuficiente (< 7 dias)
    if baseline_res.confidence == "insufficient_history":
        return ContextExplanation(
            metric=metric_name,
            metric_name=label,
            unit=unit,
            target_date=target_date,
            observed_value=baseline_res.observed_value,
            baseline_value=baseline_res.baseline_value,
            delta_absolute=baseline_res.delta_absolute,
            delta_percent=baseline_res.delta_percent,
            robust_z_score=baseline_res.robust_z_score,
            significance=baseline_res.significance,
            analysis_confidence="baixa",
            data_coverage_days=baseline_res.valid_days_count,
            total_baseline_days=30,
            factors=[],
            summary_headline="Histórico insuficiente para atribuição contextual",
            structured_explanation=baseline_res.status_message,
            disclaimer=SAFETY_DISCLAIMER,
            provenance={
                "coverage": f"{baseline_res.valid_days_count}/30 dias",
                "reason": "Mínimo de 7 dias de dados prévios exigido",
            },
        )

    # 2. Busca eventos contextuais na janela temporal
    raw_candidates = find_candidate_events_for_metric(conn, metric_name, target_date, user_tz_name)

    # 3. Verifica cofatores fisiológicos em daily_metrics (ex: sono curto afetando HRV ou FC repouso)
    if metric_name in ("hrv_ms", "rhr_bpm"):
        cur_sleep = conn.execute(
            "SELECT sleep_minutes FROM daily_metrics WHERE date_ref = ? LIMIT 1;",
            (target_date,),
        ).fetchone()
        if cur_sleep and cur_sleep[0] is not None:
            sleep_min = float(cur_sleep[0])
            # Compara sono com média histórica prévia
            cur_hist_sleep = conn.execute(
                "SELECT AVG(sleep_minutes) FROM daily_metrics WHERE date_ref < ? AND date_ref >= date(?, '-30 days');",
                (target_date, target_date),
            ).fetchone()
            avg_sleep = float(cur_hist_sleep[0]) if (cur_hist_sleep and cur_hist_sleep[0]) else 420.0
            deficit_min = avg_sleep - sleep_min

            if deficit_min >= 45.0:  # Pelo menos 45 min de déficit de sono
                # Simula um fator de déficit de sono
                hours_ago = 4.0  # Madrugada
                deficit_h = int(deficit_min // 60)
                deficit_m = int(deficit_min % 60)
                def_str = f"{deficit_h}h{deficit_m:02d}m" if deficit_h > 0 else f"{deficit_m}m"
                cur_h = int(sleep_min // 60)
                cur_m = int(sleep_min % 60)

                # Score para déficit de sono
                sleep_prior = 0.75 if metric_name == "hrv_ms" else 0.70
                sleep_score = min(0.95, sleep_prior * (1.0 + (deficit_min / 180.0) * 0.3))
                raw_candidates.append(
                    (
                        None,  # Sem regra externa
                        None,  # Sem evento pontual
                        (
                            "sleep_deficit",
                            "Déficit de sono",
                            f"Sono de {cur_h}h{cur_m:02d}m ({def_str} abaixo da média pessoal)",
                            hours_ago,
                            sleep_score,
                        ),
                    )
                )

    # 4. Avalia e pontua os fatores identificados
    scored_factors: List[FactorAttribution] = []
    num_competing = len(raw_candidates)

    for item in raw_candidates:
        if item[0] is None and item[1] is None:
            # Fator interno derivado de métricas (ex: sono)
            f_key, f_name, f_sum, f_hours, f_score = item[2]
            calibrated_prior, pers_ev, pers_stats = get_calibrated_prior_and_evidence(
                conn, metric_name, f_key, f_hours, f_score
            )
            # Desconto por coocorrência de múltiplos fatores
            cooccur_discount = max(0.70, 1.0 - 0.10 * max(0, num_competing - 1))
            final_score = calibrated_prior * cooccur_discount

            strength = "forte" if final_score >= 0.70 else ("moderada" if final_score >= 0.40 else "fraca")
            scored_factors.append(
                FactorAttribution(
                    factor_key=f_key,
                    factor_name=f_name,
                    strength=strength,
                    strength_score=round(final_score, 2),
                    summary=f_sum,
                    window_hours=f_hours,
                    personal_evidence=pers_ev,
                    personal_stats=pers_stats,
                    details={
                        "source": "daily_metrics_sleep_analysis",
                        "personal_calibration": pers_stats is not None,
                    },
                )
            )
        else:
            rule, ev, hours_before = item
            base_prior = rule.priors.get(metric_name, 0.40)
            calibrated_prior, pers_ev, pers_stats = get_calibrated_prior_and_evidence(
                conn, metric_name, rule.factor_key, hours_before, base_prior
            )
            dose_factor = evaluate_factor_dose(ev)

            # Decaimento temporal exponencial suave
            decay = math.exp(-rule.decay_lambda * (hours_before / rule.window_hours_before))

            # Penalização por múltiplos fatores concorrentes
            cooccur_discount = max(0.65, 1.0 - 0.10 * max(0, num_competing - 1))

            raw_score = calibrated_prior * (0.6 + 0.4 * dose_factor) * (0.7 + 0.3 * decay) * cooccur_discount
            normalized_score = min(0.95, max(0.15, raw_score))

            strength = "forte" if normalized_score >= 0.70 else ("moderada" if normalized_score >= 0.40 else "fraca")

            summary_text = ev.description or ev.title
            if hours_before < 24:
                summary_text += f" (ocorrido há {int(hours_before)}h)"
            else:
                summary_text += f" (ocorrido há {hours_before/24:.1f} dias)"

            scored_factors.append(
                FactorAttribution(
                    factor_key=rule.factor_key,
                    factor_name=rule.display_name,
                    strength=strength,
                    strength_score=round(normalized_score, 2),
                    summary=summary_text,
                    window_hours=round(hours_before, 1),
                    event_id=ev.id,
                    event_title=ev.title,
                    event_timestamp=ev.timestamp,
                    personal_evidence=pers_ev,
                    personal_stats=pers_stats,
                    details={
                        "base_prior": base_prior,
                        "calibrated_prior": calibrated_prior,
                        "dose_multiplier": dose_factor,
                        "temporal_decay": round(decay, 2),
                        "cooccurrence_discount": round(cooccur_discount, 2),
                        "personal_calibration": pers_stats is not None,
                    },
                )
            )

    # Ordena fatores por score decrescente
    scored_factors.sort(key=lambda x: x.strength_score, reverse=True)

    # 5. Define Confiança Geral da Análise
    if baseline_res.valid_days_count >= 14 and len(scored_factors) >= 1:
        analysis_confidence = "alta"
    elif baseline_res.valid_days_count >= 7:
        analysis_confidence = "moderada"
    else:
        analysis_confidence = "baixa"

    # 6. Gera manchete e explicação estruturada determinística
    delta_sign = "+" if baseline_res.delta_percent > 0 else ""
    delta_str = f"{delta_sign}{baseline_res.delta_percent:.1f}%"

    if baseline_res.significance == "significativa":
        summary_headline = f"{label} apresentou alteração significativa de {delta_str} versus baseline pessoal."
    elif baseline_res.significance == "notável":
        summary_headline = f"{label} variou {delta_str}, fora do padrão habitual dos últimos 30 dias."
    else:
        summary_headline = f"{label} permaneceu dentro da faixa de estabilidade usual ({delta_str})."

    expl_parts: List[str] = [
        f"Valor observado em {target_date}: {baseline_res.observed_value} {unit} "
        f"(mediana do baseline de 30 dias: {baseline_res.baseline_value} {unit}, robust Z-Score: {baseline_res.robust_z_score:.2f})."
    ]

    if scored_factors:
        expl_parts.append(
            f"Foram identificados {len(scored_factors)} fatores associados temporalmente que podem ter influenciado o organismo neste período:"
        )
        for idx, f in enumerate(scored_factors[:4], 1):
            line = f"• {f.factor_name} (Associação {f.strength}): {f.summary}"
            if f.personal_evidence:
                line += f" [{f.personal_evidence}]"
            expl_parts.append(line)
    else:
        expl_parts.append(
            "Nenhum evento registrado (álcool, treino intenso, sintomas ou intervenções) coincidiu com a janela de influência prévia desta medição."
        )

    structured_text = "\n".join(expl_parts)

    provenance_data = {
        "baseline_days": 30,
        "valid_days_coverage": f"{baseline_res.valid_days_count}/30 dias",
        "factors_identified_count": len(scored_factors),
        "robust_method": "Median + MAD (1.4826 scale)",
        "source": "health_events + daily_metrics",
    }

    return ContextExplanation(
        metric=metric_name,
        metric_name=label,
        unit=unit,
        target_date=target_date,
        observed_value=baseline_res.observed_value,
        baseline_value=baseline_res.baseline_value,
        delta_absolute=baseline_res.delta_absolute,
        delta_percent=baseline_res.delta_percent,
        robust_z_score=baseline_res.robust_z_score,
        significance=baseline_res.significance,
        analysis_confidence=analysis_confidence,
        data_coverage_days=baseline_res.valid_days_count,
        total_baseline_days=30,
        factors=scored_factors,
        summary_headline=summary_headline,
        structured_explanation=structured_text,
        disclaimer=SAFETY_DISCLAIMER,
        provenance=provenance_data,
    )
