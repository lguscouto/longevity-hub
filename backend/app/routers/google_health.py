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
    types: Optional[list[str]] = None
    dry_run: Optional[bool] = False


@router.get("/status")
def get_google_health_status() -> Dict[str, Any]:
    """Retorna o status detalhado da conexão da Google Health API v4 conforme especificação técnica."""
    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    db_path = get_db_path()

    last_sync = None
    if db_path.exists():
        try:
            repo = LongevityRepository(db_path)
            runs = repo.get_pipeline_runs(limit=10)
            gh_run = next((r for r in runs if r.get("source") in ("GoogleHealthAPI", "GoogleHealth", "GoogleFit")), None)
            if gh_run:
                last_sync = gh_run.get("run_time") or gh_run.get("created_at")
        except Exception:
            pass

    is_auth = client.is_authenticated()
    reauth_req = client.is_reauthentication_required()
    creds = client.credentials

    expiry_iso = None
    scopes: list[str] = []
    last_error = None

    if creds:
        if creds.expiry:
            expiry_iso = creds.expiry.isoformat()
        scopes = creds.scopes or []
        last_error = creds.last_error

    return {
        "connected": is_auth and not reauth_req,
        "authenticated": is_auth,
        "reauthentication_required": reauth_req,
        "last_sync": last_sync,
        "authorized_scopes": scopes,
        "last_error": last_error,
        "token_path": str(token_path),
        "has_token_file": token_path.is_file(),
        "token_expiry": expiry_iso,
        "api_version": "v4",
        "service": "Google Health API",
    }


@router.post("/sync")
def sync_google_health(req: GoogleHealthSyncRequest = GoogleHealthSyncRequest()) -> Dict[str, Any]:
    """Aciona a sincronização dos dados da Google Health API para o banco SQLite."""
    days = max(1, min(req.days or 30, 90))  # Limita entre 1 e 90 dias

    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)

    if req.dry_run:
        records, errors = client.fetch_daily_metrics_summary(days=days, selected_types=req.types)
        return {
            "status": "ok",
            "dry_run": True,
            "records_read": len(records),
            "records_inserted": 0,
            "summary": f"[DRY-RUN] {len(records)} registros lidos da Google Health API (sem gravação no banco)",
            "message": f"[DRY-RUN] {len(records)} registros lidos.",
            "data": records,
            "errors": errors,
        }

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    result = sync_google_health_api(repo=repo, days=days, client=client, selected_types=req.types)
    status = "ok" if result["status"] in ("SUCESSO", "AVISO") else "error"
    return {
        "status": status,
        "records_read": result["records_read"],
        "records_inserted": result["records_inserted"],
        "google_fit_records_imported": result["records_inserted"],
        "summary": result["summary"],
        "message": result["summary"],
        "exception_message": result.get("exception_message"),
    }
