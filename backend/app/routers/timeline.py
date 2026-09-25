"""
Router FastAPI para a Linha do Tempo de Saúde (Health Timeline).
Fornece endpoints para feed cronológico, agregações semanais/mensais, CRUD de eventos manuais e reconciliação.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.context.models import (
    BackfillStatus,
    HealthEvent,
    HealthEventCreate,
    HealthEventUpdate,
    TimelineQueryFilter,
    TimelineResponse,
    TimelineSummaryMonth,
    TimelineSummaryWeek,
)
from longevidade.context.service import TimelineContextService, get_timeline_service


router = APIRouter(prefix="/api/timeline", tags=["Timeline"])


def _get_service() -> TimelineContextService:
    return get_timeline_service(get_db_path())


@router.get("", response_model=TimelineResponse)
def get_timeline_feed(
    start_date: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Data final YYYY-MM-DD"),
    category: Optional[str] = Query(None, description="Categoria do evento"),
    event_type: Optional[str] = Query(None, description="Tipo de evento"),
    source: Optional[str] = Query(None, description="Origem do evento (manual, zepp, google_health, etc.)"),
    significance: Optional[str] = Query(None, description="Significância (normal, notável, significativa)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Retorna eventos de saúde ordenados cronologicamente e agrupados por dia."""
    service = _get_service()
    filters = TimelineQueryFilter(
        start_date=start_date,
        end_date=end_date,
        category=category,
        event_type=event_type,
        source=source,
        significance=significance,
        limit=limit,
        offset=offset,
    )
    return service.get_timeline(filters)


@router.get("/summary/weekly", response_model=List[TimelineSummaryWeek])
def get_weekly_summary(
    start_date: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Data final YYYY-MM-DD"),
    limit_weeks: int = Query(8, ge=1, le=52),
):
    """Retorna a síntese semanal agregada para o nível intermediário de zoom."""
    service = _get_service()
    return service.get_weekly_summaries(start_date, end_date, limit_weeks)


@router.get("/summary/monthly", response_model=List[TimelineSummaryMonth])
def get_monthly_summary(
    limit_months: int = Query(6, ge=1, le=24),
):
    """Retorna a visão macro agregada por mês com tendências e intervenções ativas."""
    service = _get_service()
    return service.get_monthly_summaries(limit_months)


@router.post("/events", response_model=HealthEvent, status_code=status.HTTP_201_CREATED)
def create_manual_health_event(payload: HealthEventCreate):
    """Registra manualmente um novo evento de contexto na Timeline."""
    service = _get_service()
    return service.create_manual_event(payload)


@router.patch("/events/{event_id}", response_model=HealthEvent)
def update_health_event(event_id: str, payload: HealthEventUpdate):
    """Atualiza campos de um evento manual existente."""
    service = _get_service()
    updated = service.update_manual_event(event_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Evento não encontrado ou não editável.")
    return updated


@router.delete("/events/{event_id}", status_code=status.HTTP_200_OK)
def delete_health_event(event_id: str):
    """Remove um evento manual da Timeline."""
    service = _get_service()
    success = service.delete_manual_event(event_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Evento não encontrado ou não pertence aos registros manuais.",
        )
    return {"status": "ok", "message": "Evento excluído com sucesso."}


@router.post("/reconcile", status_code=status.HTTP_200_OK)
def trigger_timeline_reconcile():
    """Dispara a sincronização e reconciliação idempotente da Timeline."""
    service = _get_service()
    result = service.reconcile()
    return result


@router.get("/reconcile/status", response_model=List[BackfillStatus])
def get_timeline_reconcile_status():
    """Consulta o progresso e checkpoints de reconciliação de cada fonte canônica."""
    service = _get_service()
    return service.get_reconcile_status()


class TimezonePayload(BaseModel):
    timezone: str


@router.get("/timezone")
def get_timezone_preference():
    """Retorna o fuso horário configurado no perfil do usuário."""
    service = _get_service()
    return {"timezone": service.get_user_timezone()}


@router.put("/timezone")
def update_timezone_preference(payload: TimezonePayload):
    """Atualiza o fuso horário configurado do usuário."""
    service = _get_service()
    success = service.set_user_timezone(payload.timezone)
    if not success:
        raise HTTPException(status_code=400, detail="Não foi possível atualizar o fuso horário.")
    return {"status": "ok", "timezone": payload.timezone}
