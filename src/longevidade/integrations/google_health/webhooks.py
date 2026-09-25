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
    operation: Optional[str] = "UPSERT"  # "UPSERT", "DELETE", "user-deleted", "user-revoked-access"
    dataType: Optional[str] = None
    intervals: Optional[List[WebhookInterval]] = None
    deviceInfo: Optional[Dict[str, Any]] = None


class GoogleHealthWebhookPayload(BaseModel):
    type: Optional[str] = "notification"  # "verification" ou "notification"
    data: Optional[WebhookNotificationData] = None

    # Compatibilidade com payloads diretos / simplificados ou legados
    dataType: Optional[str] = None
    collectionType: Optional[str] = None
    date: Optional[str] = None
    healthUserId: Optional[str] = None
    ownerId: Optional[str] = None
    operation: Optional[str] = None
    subscriptionId: Optional[str] = None
    notificationType: Optional[str] = None


def parse_webhook_payload(data: Dict[str, Any]) -> GoogleHealthWebhookPayload:
    """Faz o parse resiliente do payload do webhook da Google Health API."""
    return GoogleHealthWebhookPayload.model_validate(data)


def normalize_webhook_payloads(raw_data: Any) -> List[GoogleHealthWebhookPayload]:
    """
    Normaliza o corpo do webhook recebido para uma lista interna de payloads (P1.3).
    Suporta payload único {"data": {...}}, lote [{"data": {...}}, ...], ou dicts envelopados {"events": [...]}.
    """
    if not raw_data:
        return []

    items: List[Dict[str, Any]] = []
    if isinstance(raw_data, list):
        items = [i for i in raw_data if isinstance(i, dict)]
    elif isinstance(raw_data, dict):
        if "events" in raw_data and isinstance(raw_data["events"], list):
            items = [i for i in raw_data["events"] if isinstance(i, dict)]
        elif "notifications" in raw_data and isinstance(raw_data["notifications"], list):
            items = [i for i in raw_data["notifications"] if isinstance(i, dict)]
        else:
            items = [raw_data]

    results: List[GoogleHealthWebhookPayload] = []
    for item in items:
        try:
            results.append(parse_webhook_payload(item))
        except Exception:
            # Continua processando itens restantes mesmo com item corrompido
            continue
    return results


def extract_notification_events(payloads: List[GoogleHealthWebhookPayload]) -> List[WebhookNotificationData]:
    """Extrai lista unificada de eventos de notificação a partir dos payloads normalizados."""
    events: List[WebhookNotificationData] = []
    for p in payloads:
        if p.type == "verification":
            continue

        if p.data:
            ev = p.data
            # Mescla campos de topo se ausentes no objeto data
            h_id = ev.healthUserId or p.healthUserId or p.ownerId
            dt = ev.dataType or p.dataType or p.collectionType
            op = ev.operation or p.operation or "UPSERT"
            events.append(
                WebhookNotificationData(
                    healthUserId=h_id,
                    dataType=dt,
                    operation=op,
                    intervals=ev.intervals,
                    deviceInfo=ev.deviceInfo,
                )
            )
        else:
            # Payload em formato plano
            intervals = None
            if p.date:
                intervals = [WebhookInterval(startTime=f"{p.date}T00:00:00Z", endTime=f"{p.date}T23:59:59Z")]
            events.append(
                WebhookNotificationData(
                    healthUserId=p.healthUserId or p.ownerId,
                    dataType=p.dataType or p.collectionType,
                    operation=p.operation or "UPSERT",
                    intervals=intervals,
                )
            )
    return events

