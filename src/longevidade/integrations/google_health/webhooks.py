"""
Modelos e processadores de eventos de Webhook para a Google Health API v4 (P1.7).

Conforme especificação oficial:
- Handshake inicial com {"type": "verification"}
- Eventos de notificação contendo data.healthUserId, data.operation, data.dataType, data.intervals
- Notificações indicam existência de dados alterados ("há dados novos/modificados")
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WebhookInterval(BaseModel):
    startTime: Optional[str] = None
    endTime: Optional[str] = None


class WebhookNotificationData(BaseModel):
    healthUserId: Optional[str] = None
    operation: Optional[str] = None  # e.g. "UPSERT", "DELETE"
    dataType: Optional[str] = None
    intervals: Optional[List[WebhookInterval]] = None


class GoogleHealthWebhookPayload(BaseModel):
    type: Optional[str] = "notification"  # "verification" ou "notification"
    data: Optional[WebhookNotificationData] = None

    # Compatibilidade com payloads simplificados ou alternativos
    dataType: Optional[str] = None
    collectionType: Optional[str] = None
    date: Optional[str] = None
    healthUserId: Optional[str] = None
    operation: Optional[str] = None


def parse_webhook_payload(data: Dict[str, Any]) -> GoogleHealthWebhookPayload:
    """Faz o parse resiliente do payload do webhook da Google Health API."""
    return GoogleHealthWebhookPayload.model_validate(data)
