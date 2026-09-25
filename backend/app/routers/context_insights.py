"""
Router FastAPI para o Contextual Insight Engine.
Fornece endpoints para explicar alterações em métricas fisiológicas, sintetizar com IA e registrar feedback.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.config import get_db_path
from longevidade.context.associations import ContextExplanation
from longevidade.context.models import (
    BeforeAfterAnalysisResponse,
    ChangePointsResponse,
    ConfounderBalanceRequest,
    ConfounderReport,
    MetricChangePoint,
    PersonalAssociation,
    PersonalAssociationsResponse,
)
from longevidade.context.service import TimelineContextService, get_timeline_service


router = APIRouter(prefix="/api/context", tags=["Context Insights"])


def _get_service() -> TimelineContextService:
    return get_timeline_service(get_db_path())


class InsightFeedbackPayload(BaseModel):
    metric: str
    date_ref: str
    is_helpful: bool
    factor_key: Optional[str] = None
    user_rating: Optional[str] = None
    user_notes: Optional[str] = None
    additional_context: Optional[str] = None
    insight_id: Optional[str] = None


class SynthesizePayload(BaseModel):
    metric: str
    date_ref: str


@router.get("/changes/{metric}")
def get_recent_metric_changes(
    metric: str,
    limit: int = Query(30, ge=1, le=100),
):
    """Lista as datas em que a métrica apresentou alterações notáveis ou significativas."""
    service = _get_service()
    return service.get_metric_changes(metric, limit)


@router.get("/explain/{metric}", response_model=ContextExplanation)
def explain_metric_change(
    metric: str,
    date: str = Query(..., description="Data da ocorrência YYYY-MM-DD"),
    baseline_days: int = Query(30, ge=7, le=90),
):
    """Gera a explicação contextual estruturada para a alteração na data informada."""
    service = _get_service()
    try:
        return service.explain_change(metric, date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao processar explicação: {exc}")


@router.post("/explain/synthesize")
def synthesize_explanation_endpoint(payload: SynthesizePayload):
    """Gera síntese narrativa da alteração (usando IA se configurada, com fallback determinístico)."""
    service = _get_service()
    try:
        return service.synthesize_explanation(payload.metric, payload.date_ref)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao sintetizar explicação: {exc}")


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_insight_feedback(payload: InsightFeedbackPayload):
    """Salva a avaliação e feedback do usuário sobre a utilidade do insight contextual."""
    service = _get_service()
    feedback_id = service.record_insight_feedback(
        target_metric=payload.metric,
        date_ref=payload.date_ref,
        is_helpful=payload.is_helpful,
        factor_key=payload.factor_key,
        user_rating=payload.user_rating,
        user_notes=payload.user_notes,
        additional_context=payload.additional_context,
        insight_id=payload.insight_id,
    )
    return {"status": "ok", "feedback_id": feedback_id}


@router.get("/associations", response_model=PersonalAssociationsResponse)
def get_personal_associations(
    metric: Optional[str] = Query(None, description="Filtra por métrica alvo ('hrv_ms', 'rhr_bpm', etc.)"),
    min_confidence: Optional[str] = Query(None, description="Filtro de confiança mínima ('low', 'moderate', 'high')"),
    min_samples: int = Query(1, ge=1, description="Número mínimo de amostras pareadas"),
):
    """Lista as associações pessoais aprendidas estatisticamente pelo histórico do usuário."""
    service = _get_service()
    items = service.get_personal_associations(
        metric=metric, min_confidence=min_confidence, min_samples=min_samples
    )
    return PersonalAssociationsResponse(
        total=len(items),
        items=items,
    )


@router.post("/associations/recompute")
def recompute_personal_associations(
    metric: Optional[str] = Query(None, description="Métrica específica a recalcular ou todas se omitido"),
):
    """Força o recálculo estatístico e shrinkage bayesiano das associações pessoais."""
    service = _get_service()
    items = service.recompute_personal_associations(metric=metric)
    return {
        "status": "ok",
        "computed_count": len(items),
        "items": [
            {
                "target_metric": it.target_metric,
                "factor": it.factor,
                "sample_size": it.sample_size,
                "shrinkage_factor": it.shrinkage_factor,
                "confidence": it.confidence,
                "mean_delta_pct": it.mean_delta_pct,
            }
            for it in items
        ],
    }


@router.get("/change-points", response_model=ChangePointsResponse)
def get_change_points(
    metric: Optional[str] = Query(None, description="Filtra por métrica alvo ('hrv_ms', 'rhr_bpm', etc.)"),
    limit: int = Query(50, ge=1, le=200, description="Limite máximo de quebras de patamar a retornar"),
):
    """Lista as quebras de patamar persistentes detectadas pelo motor estatístico CUSUM."""
    service = _get_service()
    items = service.get_metric_change_points(metric=metric, limit=limit)
    return ChangePointsResponse(
        total=len(items),
        items=items,
    )


@router.post("/change-points/detect")
def trigger_change_point_detection(
    metric: Optional[str] = Query(None, description="Métrica específica a escanear ou todas se omitido"),
):
    """Dispara detecção de quebras de patamar persistentes e projeta novos eventos na Linha do Tempo."""
    service = _get_service()
    res = service.run_change_point_detection(metric=metric)
    return {
        "status": "ok",
        "detected_count": res["detected_count"],
        "projected_to_timeline": res["projected_to_timeline"],
        "items": [
            {
                "metric": cp.metric,
                "date_ref": cp.date_ref,
                "headline": cp.headline,
                "baseline_value": cp.baseline_value,
                "observed_value": cp.observed_value,
                "delta_percent": cp.delta_percent,
                "persisted_days": cp.persisted_days,
                "detection_method": cp.detection_method,
                "significance": cp.significance,
            }
            for cp in res["change_points"]
        ],
    }


@router.get("/before-after/{intervention_id}", response_model=BeforeAfterAnalysisResponse)
def get_before_after_intervention(
    intervention_id: int,
    days_before: int = Query(30, ge=7, le=180, description="Dias de histórico para controle pré-intervenção"),
    days_after: int = Query(30, ge=7, le=180, description="Dias de observação pós-início da intervenção"),
):
    """Executa a análise Antes vs. Depois de uma intervenção/suplemento com balanço de confundidores exógenos."""
    service = _get_service()
    try:
        return service.analyze_before_after_intervention(
            intervention_id=intervention_id,
            days_before=days_before,
            days_after=days_after,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao processar análise Antes vs. Depois: {exc}")


@router.get("/n-of-1/{experiment_id}/confounders", response_model=ConfounderReport)
def get_n_of_1_confounders(experiment_id: int):
    """Retorna o relatório de balanço de covariáveis exógenas para um experimento N-of-1 existente."""
    service = _get_service()
    try:
        return service.analyze_n_of_1_confounders(experiment_id=experiment_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular balanço de confundidores: {exc}")


@router.post("/confounders/balance", response_model=ConfounderReport)
def calculate_custom_confounders(payload: ConfounderBalanceRequest):
    """Calcula o balanço de covariáveis exógenas dinamicamente para duas janelas temporais arbitrárias."""
    service = _get_service()
    try:
        return service.calculate_custom_covariate_balance(
            control_start=payload.control_start,
            control_end=payload.control_end,
            treatment_start=payload.treatment_start,
            treatment_end=payload.treatment_end,
            experiment_id=payload.experiment_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao calcular balanço de covariáveis: {exc}")


