import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.google_health_client import (
    GOOGLE_HEALTH_SCOPES,
    GOOGLE_OAUTH_TOKEN_URL,
    GoogleHealthClient,
    GoogleHealthCredentials,
    get_default_token_path,
)
from longevidade.ingestion.google_importer import sync_google_health_api

router = APIRouter(prefix="/api/google-health", tags=["GoogleHealth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
DEFAULT_REDIRECT_URI = "http://127.0.0.1:8887/api/google-health/callback"


class GoogleHealthSyncRequest(BaseModel):
    days: Optional[int] = 30
    types: Optional[list[str]] = None
    dry_run: Optional[bool] = False


class GoogleHealthCredentialsInput(BaseModel):
    client_id: str
    client_secret: Optional[str] = None


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
    has_client_id = bool(creds and creds.client_id and "test_id" not in creds.client_id)
    raw_client_id = creds.client_id if (creds and "test_id" not in (creds.client_id or "")) else None
    has_client_secret = bool(creds and creds.client_secret and "test_secret" not in creds.client_secret)
    masked_client_id = (raw_client_id[:8] + "..." + raw_client_id[-12:]) if (raw_client_id and len(raw_client_id) > 20) else raw_client_id

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
        "has_client_id": has_client_id,
        "client_id": raw_client_id,
        "has_client_secret": has_client_secret,
        "masked_client_id": masked_client_id,
        "token_path": str(token_path),
        "has_token_file": token_path.is_file(),
        "token_expiry": expiry_iso,
        "api_version": "v4",
        "service": "Google Health API",
        "redirect_uri": DEFAULT_REDIRECT_URI,
    }


@router.get("/auth-url")
def get_google_health_auth_url(
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    redirect_uri: Optional[str] = None,
) -> Dict[str, Any]:
    """Gera a URL de consentimento OAuth 2.0 para abertura no navegador."""
    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    creds = client.credentials

    cid = client_id or (creds.client_id if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_ID")
    csecret = client_secret or (creds.client_secret if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_SECRET")

    # Salva temporariamente client_id e client_secret se informados
    if cid and csecret:
        if not creds:
            creds = GoogleHealthCredentials(client_id=cid, client_secret=csecret)
        else:
            creds.client_id = cid
            creds.client_secret = csecret
        creds.save_to_file(token_path)

    if not cid:
        return {
            "status": "error",
            "message": "Google Client ID não configurado.",
            "auth_url": None,
        }

    r_uri = redirect_uri or DEFAULT_REDIRECT_URI
    params = {
        "client_id": cid,
        "redirect_uri": r_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_HEALTH_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {
        "status": "ok",
        "auth_url": auth_url,
        "redirect_uri": r_uri,
        "scopes": GOOGLE_HEALTH_SCOPES,
    }


@router.get("/callback")
def google_health_oauth_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
):
    """Callback do fluxo OAuth 2.0 chamado pelo Google após o consentimento do usuário."""
    if error:
        html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Erro de Autenticação</title>
            <style>
                body {{ font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
                .card {{ background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #ef4444; text-align: center; max-width: 420px; }}
                h2 {{ color: #ef4444; margin-top: 0; }}
                button {{ background: #ef4444; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Falha na Autorização</h2>
                <p>O Google retornou o seguinte erro:</p>
                <p><strong>{error}</strong></p>
                <button onclick="window.close()">Fechar Janela</button>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{ type: 'GOOGLE_AUTH_ERROR', error: '{error}' }}, '*');
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=400)

    if not code:
        html = """
        <!DOCTYPE html>
        <html><body><p>Código de autorização ausente.</p><script>window.close();</script></body></html>
        """
        return HTMLResponse(content=html, status_code=400)

    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    creds = client.credentials

    cid = (creds.client_id if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_ID")
    csecret = (creds.client_secret if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_SECRET")

    if not cid or not csecret:
        html = """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><style>body{font-family:sans-serif;background:#0f172a;color:white;padding:2rem;text-align:center;}</style></head>
        <body>
            <h3>Erro: Client ID ou Client Secret ausentes no servidor.</h3>
            <p>Configure as credenciais antes de autorizar.</p>
            <button onclick="window.close()">Fechar</button>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=400)

    token_data = {
        "client_id": cid,
        "client_secret": csecret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": DEFAULT_REDIRECT_URI,
    }

    req = Request(
        GOOGLE_OAUTH_TOKEN_URL,
        data=urlencode(token_data).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token") or (creds.refresh_token if creds else None)
            expires_in = data.get("expires_in", 3600)

            if not access_token:
                raise ValueError("access_token ausente na resposta do Google.")

            new_creds = GoogleHealthCredentials(
                client_id=cid,
                client_secret=csecret,
                access_token=access_token,
                refresh_token=refresh_token,
                token_uri=GOOGLE_OAUTH_TOKEN_URL,
                expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                scopes=list(GOOGLE_HEALTH_SCOPES),
                reauthentication_required=False,
                last_error=None,
            )
            new_creds.save_to_file(token_path)

            html = """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Conexão Realizada com Sucesso</title>
                <style>
                    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #1e293b; padding: 2.5rem; border-radius: 1.25rem; border: 1px solid #10b981; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                    .icon { width: 56px; height: 56px; background: rgba(16,185,129,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #10b981; font-size: 28px; }
                    h2 { color: #10b981; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0; }
                    .badge { display: inline-block; padding: 0.35rem 0.8rem; background: #0f172a; border-radius: 9999px; font-size: 0.75rem; color: #38bdf8; border: 1px solid #38bdf8; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✓</div>
                    <div class="badge">Google Health API v4</div>
                    <h2>Conectado com Sucesso!</h2>
                    <p>Sua conta Google foi vinculada ao Hub Longevidade. Esta janela será fechada automaticamente em instantes.</p>
                </div>
                <script>
                    if (window.opener) {
                        try {
                            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                        } catch (e) {}
                    }
                    setTimeout(function() {
                        window.close();
                    }, 1200);
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=html, status_code=200)
    except HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><style>body{{font-family:sans-serif;background:#0f172a;color:white;padding:2rem;text-align:center;}}</style></head>
        <body>
            <h3 style="color:#ef4444;">Erro HTTP {err.code} ao trocar código por token</h3>
            <pre style="background:#1e293b;padding:1rem;border-radius:0.5rem;text-align:left;max-width:500px;margin:1rem auto;overflow:auto;">{err_msg}</pre>
            <button onclick="window.close()">Fechar</button>
            <script>if (window.opener) {{ window.opener.postMessage({{ type: 'GOOGLE_AUTH_ERROR', error: '{err_msg}' }}, '*'); }}</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=400)
    except Exception as exc:
        html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><style>body{{font-family:sans-serif;background:#0f172a;color:white;padding:2rem;text-align:center;}}</style></head>
        <body>
            <h3 style="color:#ef4444;">Erro inesperado: {exc}</h3>
            <button onclick="window.close()">Fechar</button>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=500)


@router.post("/credentials")
def save_google_health_credentials(input_data: GoogleHealthCredentialsInput) -> Dict[str, Any]:
    """Salva ou atualiza Client ID e Client Secret da Google Health API."""
    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    creds = client.credentials or GoogleHealthCredentials()

    if input_data.client_id:
        creds.client_id = input_data.client_id.strip()
    if input_data.client_secret and input_data.client_secret.strip():
        creds.client_secret = input_data.client_secret.strip()
    creds.save_to_file(token_path)

    return {
        "status": "ok",
        "message": "Credenciais da Google Health salvas com sucesso.",
        "has_client_id": True,
        "token_path": str(token_path),
    }


@router.post("/disconnect")
def disconnect_google_health() -> Dict[str, Any]:
    """Desvincula a conta Google Health removendo os tokens de acesso."""
    token_path = get_default_token_path()
    if token_path.is_file():
        try:
            data = json.loads(token_path.read_text(encoding="utf-8"))
            data["access_token"] = None
            data["refresh_token"] = None
            data["expiry"] = None
            data["reauthentication_required"] = False
            data["last_error"] = None
            token_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            token_path.unlink(missing_ok=True)

    return {
        "status": "ok",
        "message": "Conta Google Health desconectada com sucesso.",
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
