"""
Serviço central de contexto e linha do tempo (TimelineContextService).
Orquestra o CRUD de eventos manuais, consultas agregadas e reconciliação.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from longevidade.context.backfill import (
    get_all_backfill_statuses,
    get_db_connection,
    get_user_timezone_from_db,
    reconcile_all_sources,
)
from longevidade.context.events import (
    format_iso_utc,
    get_user_timezone,
    resolve_local_date_and_time,
)
from longevidade.context.models import (
    BackfillStatus,
    BeforeAfterAnalysisResponse,
    ConfounderReport,
    HealthEvent,
    HealthEventCreate,
    HealthEventUpdate,
    MetricChangePoint,
    PersonalAssociation,
    TimelineQueryFilter,
    TimelineResponse,
    TimelineSummaryMonth,
    TimelineSummaryWeek,
)
from longevidade.context.timeline import (
    _row_to_event,
    query_monthly_summaries,
    query_timeline_events,
    query_weekly_summaries,
)


class TimelineContextService:
    """Orquestrador do motor de Linha do Tempo e Contexto."""

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        from longevidade.db.schema import initialize_db
        initialize_db(self.db_path)

    def _get_connection(self) -> sqlite3.Connection:
        return get_db_connection(self.db_path)

    def get_user_timezone(self) -> str:
        with self._get_connection() as conn:
            return get_user_timezone_from_db(conn)

    def set_user_timezone(self, tz_name: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.execute("UPDATE user_profile SET timezone = ? WHERE id = 1;", (tz_name,))
            conn.commit()
            return cur.rowcount > 0

    def create_manual_event(self, payload: HealthEventCreate) -> HealthEvent:
        """Cria um novo evento manual na Timeline."""
        user_tz = self.get_user_timezone()

        if payload.timestamp:
            ts_str = payload.timestamp
            calc_date, calc_time = resolve_local_date_and_time(ts_str, user_tz)
            date_ref = payload.date_ref or calc_date
            time_ref = payload.time_ref or calc_time
        else:
            now_utc = datetime.now(timezone.utc)
            ts_str = format_iso_utc(now_utc)
            calc_date, calc_time = resolve_local_date_and_time(ts_str, user_tz)
            date_ref = payload.date_ref or calc_date
            time_ref = payload.time_ref or calc_time

        event_id = str(uuid4())
        source_key = f"manual:{event_id}"
        meta_json = json.dumps(payload.metadata, ensure_ascii=False)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO health_events (
                    id, timestamp, date_ref, time_ref, event_type, category,
                    title, description, source, source_type, source_id, source_key,
                    confidence, significance, metadata_json, is_pinned, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                """,
                (
                    event_id,
                    ts_str,
                    date_ref,
                    time_ref,
                    payload.event_type,
                    payload.category,
                    payload.title,
                    payload.description,
                    payload.source or "manual",
                    "manual_entry",
                    event_id,
                    source_key,
                    payload.confidence or "high",
                    payload.significance or "notável",
                    meta_json,
                    1 if payload.is_pinned else 0,
                ),
            )
            conn.commit()

        return HealthEvent(
            id=event_id,
            timestamp=ts_str,
            date_ref=date_ref,
            time_ref=time_ref,
            event_type=payload.event_type,
            category=payload.category,
            title=payload.title,
            description=payload.description,
            source=payload.source or "manual",
            source_type="manual_entry",
            source_id=event_id,
            source_key=source_key,
            confidence=payload.confidence or "high",
            significance=payload.significance or "notável",
            metadata=payload.metadata,
            is_pinned=payload.is_pinned,
            created_at=ts_str,
            updated_at=ts_str,
        )

    def update_manual_event(
        self,
        event_id: str,
        payload: HealthEventUpdate,
    ) -> Optional[HealthEvent]:
        """Atualiza campos de um evento manual."""
        with self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM health_events WHERE id = ?;", (event_id,))
            row = cur.fetchone()
            if not row:
                return None

            fields: List[str] = []
            values: List[Any] = []

            if payload.title is not None:
                fields.append("title = ?")
                values.append(payload.title)
            if payload.description is not None:
                fields.append("description = ?")
                values.append(payload.description)
            if payload.date_ref is not None:
                fields.append("date_ref = ?")
                values.append(payload.date_ref)
            if payload.time_ref is not None:
                fields.append("time_ref = ?")
                values.append(payload.time_ref)
            if payload.timestamp is not None:
                fields.append("timestamp = ?")
                values.append(payload.timestamp)
            if payload.category is not None:
                fields.append("category = ?")
                values.append(payload.category)
            if payload.event_type is not None:
                fields.append("event_type = ?")
                values.append(payload.event_type)
            if payload.significance is not None:
                fields.append("significance = ?")
                values.append(payload.significance)
            if payload.is_pinned is not None:
                fields.append("is_pinned = ?")
                values.append(1 if payload.is_pinned else 0)
            if payload.metadata is not None:
                fields.append("metadata_json = ?")
                values.append(json.dumps(payload.metadata, ensure_ascii=False))

            if not fields:
                return _row_to_event(row)

            fields.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE health_events SET {', '.join(fields)} WHERE id = ?;"
            values.append(event_id)
            conn.execute(sql, values)
            conn.commit()

            cur = conn.execute("SELECT * FROM health_events WHERE id = ?;", (event_id,))
            updated_row = cur.fetchone()
            return _row_to_event(updated_row) if updated_row else None

    def delete_manual_event(self, event_id: str) -> bool:
        """Exclui um evento manual."""
        with self._get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM health_events WHERE id = ? AND source = 'manual';",
                (event_id,),
            )
            conn.commit()
            return cur.rowcount > 0

    def get_timeline(self, filters: TimelineQueryFilter) -> TimelineResponse:
        """Retorna eventos paginados e agrupados por dia."""
        with self._get_connection() as conn:
            total, items, days = query_timeline_events(conn, filters)
            return TimelineResponse(
                total=total,
                items=items,
                days=days,
            )

    def get_weekly_summaries(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit_weeks: int = 8,
    ) -> List[TimelineSummaryWeek]:
        """Retorna resumos agregados por semana."""
        with self._get_connection() as conn:
            return query_weekly_summaries(conn, start_date, end_date, limit_weeks)

    def get_monthly_summaries(
        self,
        limit_months: int = 6,
    ) -> List[TimelineSummaryMonth]:
        """Retorna resumos agregados por mês."""
        with self._get_connection() as conn:
            return query_monthly_summaries(conn, limit_months)

    def reconcile(self) -> Dict[str, Any]:
        """Executa a reconciliação e projeção idempotente de todas as fontes."""
        return reconcile_all_sources(self.db_path)

    def get_reconcile_status(self) -> List[BackfillStatus]:
        """Consulta os status de checkpointing de backfill."""
        return get_all_backfill_statuses(self.db_path)

    def explain_change(self, metric: str, target_date: str) -> Any:
        """Calcula a explicação contextual estruturada para a alteração da métrica."""
        from longevidade.context.associations import compute_context_attribution

        user_tz = self.get_user_timezone()
        with self._get_connection() as conn:
            return compute_context_attribution(conn, metric, target_date, user_tz)

    def synthesize_explanation(self, metric: str, target_date: str) -> Dict[str, Any]:
        """Gera síntese narrativa da alteração (usando IA se disponível, com fallback determinístico)."""
        from longevidade.context.explanations import synthesize_explanation_with_ai

        explanation = self.explain_change(metric, target_date)
        with self._get_connection() as conn:
            return synthesize_explanation_with_ai(explanation, conn)

    def record_insight_feedback(
        self,
        target_metric: str,
        date_ref: str,
        is_helpful: bool,
        factor_key: Optional[str] = None,
        user_rating: Optional[str] = None,
        user_notes: Optional[str] = None,
        additional_context: Optional[str] = None,
        insight_id: Optional[str] = None,
    ) -> str:
        """Salva a avaliação do usuário sobre um insight contextual gerado."""
        feedback_id = str(uuid4())
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO insight_feedback (
                    id, insight_id, target_metric, date_ref, factor_key,
                    is_helpful, user_rating, user_notes, additional_context
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    feedback_id,
                    insight_id or str(uuid4()),
                    target_metric,
                    date_ref,
                    factor_key,
                    1 if is_helpful else 0,
                    user_rating or ("relevant" if is_helpful else "irrelevant"),
                    user_notes,
                    additional_context,
                ),
            )
            conn.commit()

            # Recalibra associações pessoais para a métrica avaliada
            try:
                from longevidade.context.personal_associations import recompute_all_personal_associations
                recompute_all_personal_associations(conn, target_metric=target_metric)
            except Exception:
                pass

        return feedback_id

    def get_personal_associations(
        self,
        metric: Optional[str] = None,
        min_confidence: Optional[str] = None,
        min_samples: int = 1,
    ) -> List[PersonalAssociation]:
        """Recupera associações pessoais aprendidas do banco."""
        from longevidade.context.personal_associations import load_personal_associations

        with self._get_connection() as conn:
            return load_personal_associations(
                conn, target_metric=metric, min_confidence=min_confidence, min_samples=min_samples
            )

    def recompute_personal_associations(
        self, metric: Optional[str] = None
    ) -> List[PersonalAssociation]:
        """Força o recálculo das associações pessoais para a métrica informada ou para todas."""
        from longevidade.context.personal_associations import recompute_all_personal_associations

        with self._get_connection() as conn:
            return recompute_all_personal_associations(conn, target_metric=metric)

    def get_metric_change_points(
        self, metric: Optional[str] = None, limit: int = 50
    ) -> List[MetricChangePoint]:
        """Carrega quebras de patamar detectadas e persistidas no banco."""
        from longevidade.context.change_detection import load_change_points

        with self._get_connection() as conn:
            return load_change_points(conn, metric=metric, limit=limit)

    def run_change_point_detection(
        self, metric: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executa a detecção de quebras de patamar e projeta novos eventos na Timeline."""
        from longevidade.context.change_detection import run_full_change_point_pipeline

        with self._get_connection() as conn:
            cps, projected = run_full_change_point_pipeline(conn, metric=metric)
            return {
                "detected_count": len(cps),
                "projected_to_timeline": projected,
                "change_points": cps,
            }


    def get_metric_changes(self, metric: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Varre o histórico recente e lista as datas onde ocorreram alterações notáveis ou significativas."""
        from longevidade.context.baselines import evaluate_metric_baseline

        results: List[Dict[str, Any]] = []
        with self._get_connection() as conn:
            cur = conn.execute(
                f"""
                SELECT date_ref, {metric}
                FROM daily_metrics
                WHERE {metric} IS NOT NULL
                ORDER BY date_ref DESC
                LIMIT ?;
                """,
                (limit,),
            )
            rows = cur.fetchall()

            for r in rows:
                d_ref = r["date_ref"]
                res = evaluate_metric_baseline(conn, metric, d_ref)
                if res.significance in ("notável", "significativa"):
                    results.append(
                        {
                            "date_ref": d_ref,
                            "metric": metric,
                            "observed_value": res.observed_value,
                            "baseline_value": res.baseline_value,
                            "delta_percent": res.delta_percent,
                            "robust_z_score": res.robust_z_score,
                            "significance": res.significance,
                            "confidence": res.confidence,
                        }
                    )
        return results

    def analyze_before_after_intervention(
        self, intervention_id: int, days_before: int = 30, days_after: int = 30
    ) -> BeforeAfterAnalysisResponse:
        """Executa a análise Antes vs. Depois com balanço de covariáveis para uma intervenção/suplemento."""
        from longevidade.context.confounders import analyze_before_after_intervention as run_analysis

        with self._get_connection() as conn:
            return run_analysis(
                conn, intervention_id=intervention_id, days_before=days_before, days_after=days_after
            )

    def analyze_n_of_1_confounders(self, experiment_id: int) -> ConfounderReport:
        """Executa a análise de balanço de covariáveis exógenas para um experimento N-of-1 existente."""
        from longevidade.context.confounders import analyze_n_of_1_confounders as run_analysis

        with self._get_connection() as conn:
            return run_analysis(conn, experiment_id=experiment_id)

    def calculate_custom_covariate_balance(
        self,
        control_start: str,
        control_end: str,
        treatment_start: str,
        treatment_end: str,
        experiment_id: Optional[int] = None,
        intervention_id: Optional[int] = None,
    ) -> ConfounderReport:
        """Calcula o balanço de covariáveis exógenas para duas janelas arbitrárias."""
        from longevidade.context.confounders import calculate_covariate_balance

        with self._get_connection() as conn:
            return calculate_covariate_balance(
                conn,
                control_start=control_start,
                control_end=control_end,
                treatment_start=treatment_start,
                treatment_end=treatment_end,
                experiment_id=experiment_id,
                intervention_id=intervention_id,
            )



_SERVICE_INSTANCE: Optional[TimelineContextService] = None


def get_timeline_service(db_path: Optional[str | Path] = None) -> TimelineContextService:
    """Factory singleton para o serviço da Timeline."""
    global _SERVICE_INSTANCE
    if db_path is not None:
        _SERVICE_INSTANCE = TimelineContextService(db_path)
    elif _SERVICE_INSTANCE is None:
        from backend.app.config import get_db_path
        _SERVICE_INSTANCE = TimelineContextService(get_db_path())
    return _SERVICE_INSTANCE
