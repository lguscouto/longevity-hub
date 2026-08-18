from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from pathlib import Path

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.google_health_client import GoogleHealthClient, get_default_token_path
from longevidade.ingestion.google_importer import sync_google_health_api

router = APIRouter(prefix="/api/google-health", tags=["GoogleHealth"])


class GoogleHealthSyncRequest(BaseModel):
    days: Optional[int] = 30


@router.get("/status")
def get_google_health_status() -> Dict[str, Any]:
    """Retorna o status da conexão e configuração da Google Health API v4."""
    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)

    is_auth = client.is_authenticated()
    expiry_iso = None
    if client.credentials and client.credentials.expiry:
        expiry_iso = client.credentials.expiry.isoformat()

    return {
        "authenticated": is_auth,
        "token_path": str(token_path),
        "has_token_file": token_path.is_file(),
        "token_expiry": expiry_iso,
        "api_version": "v4",
        "service": "Google Health API",
    }


@router.post("/sync")
def sync_google_health(req: GoogleHealthSyncRequest = GoogleHealthSyncRequest()) -> Dict[str, Any]:
    """Aciona a sincronização dos dados da Google Health API para o banco SQLite."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    days = req.days or 30
    result = sync_google_health_api(repo=repo, days=days)
    return {
        "status": result["status"],
        "records_read": result["records_read"],
        "records_inserted": result["records_inserted"],
        "summary": result["summary"],
        "exception_message": result.get("exception_message"),
    }
