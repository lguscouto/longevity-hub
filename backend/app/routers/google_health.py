import html
import json
import logging
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("backend.app.routers.google_health")

from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import HTMLResponse, JSONResponse
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
from longevidade.integrations.google_health.webhooks import (
    extract_notification_events,
    normalize_webhook_payloads,
)
from longevidade.integrations.google_health.webhooks_signature import signature_verifier

router = APIRouter(prefix="/api/google-health", tags=["GoogleHealth"])


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
DEFAULT_REDIRECT_URI = "http://127.0.0.1:8887/api/google-health/callback"


class OAuthStateManager:
    """Gerencia estados OAuth 2.0 criptograficamente seguros para prevenção contra CSRF."""

    def __init__(self, ttl_seconds: int = 600):
        self.ttl_seconds = ttl_seconds
        self._states: Dict[str, datetime] = {}
        self._lock = threading.Lock()

    def generate_state(self) -> str:
        state = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        with self._lock:
            self._cleanup_expired(now)
            self._states[state] = now
        return state

    def validate_and_consume(self, state: Optional[str]) -> Tuple[bool, str]:
        if not state:
            return False, "Parâmetro state ausente na requisição de callback."
        now = datetime.now(timezone.utc)
        with self._lock:
            self._cleanup_expired(now)
            matched_key = None
            for key, created_at in self._states.items():
                if secrets.compare_digest(key, state):
                    matched_key = key
                    break

            if not matched_key:
                return False, "Parâmetro state inválido, expirado ou já utilizado."

            del self._states[matched_key]
            return True, "State válido."

    def _cleanup_expired(self, now: datetime) -> None:
        expired_keys = [
            k for k, created_at in self._states.items()
            if (now - created_at).total_seconds() > self.ttl_seconds
        ]
        for k in expired_keys:
            del self._states[k]


oauth_state_manager = OAuthStateManager()


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

    scope_status = (
        creds.get_scope_status()
        if creds
        else {"activity": False, "health_metrics": False, "sleep": False, "nutrition": False}
    )
    token_valid = is_auth and not reauth_req
    has_any_scope = any(scope_status.values())

    if creds:
        if creds.expiry:
            expiry_iso = creds.expiry.isoformat()
        scopes = creds.scopes or []
        last_error = creds.last_error

    return {
        "connected": token_valid and has_any_scope,
        "authenticated": is_auth,
        "token_valid": token_valid,
        "reauthentication_required": reauth_req,
        "last_sync": last_sync,
        "scopes": scope_status,
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
        "health_user_id": creds.health_user_id if creds else None,
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
    state = oauth_state_manager.generate_state()
    params = {
        "client_id": cid,
        "redirect_uri": r_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_HEALTH_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {
        "status": "ok",
        "auth_url": auth_url,
        "state": state,
        "redirect_uri": r_uri,
        "scopes": GOOGLE_HEALTH_SCOPES,
    }


def safe_json_for_script(data: Any) -> str:
    """Serializa JSON com escape seguro de caracteres HTML (<, >, &) para inclusão dentro de <script>."""
    return json.dumps(data).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


@router.get("/callback")
def google_health_oauth_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
):
    """Callback do fluxo OAuth 2.0 chamado pelo Google após o consentimento do usuário."""
    # 1. Validação estrita de state contra ataques CSRF (obrigatório, uso único e expiração)
    valid_state, state_msg = oauth_state_manager.validate_and_consume(state)
    if not valid_state:
        safe_msg = html.escape(state_msg)
        js_payload = safe_json_for_script({"type": "GOOGLE_AUTH_ERROR", "error": state_msg})
        html_resp = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Erro de Segurança OAuth</title>
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
                <p>Falha de validação CSRF (state):</p>
                <p><strong>{safe_msg}</strong></p>
                <button onclick="window.close()">Fechar Janela</button>
            </div>
            <script>
                if (window.opener) {{
                    try {{ window.opener.postMessage({js_payload}, window.location.origin); }} catch (e) {{}}
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_resp, status_code=400)

    # 2. Se o provedor retornou erro
    if error:
        safe_error = html.escape(str(error))
        js_payload = safe_json_for_script({"type": "GOOGLE_AUTH_ERROR", "error": str(error)})
        html_resp = f"""
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
                <p><strong>{safe_error}</strong></p>
                <button onclick="window.close()">Fechar Janela</button>
            </div>
            <script>
                if (window.opener) {{
                    try {{ window.opener.postMessage({js_payload}, window.location.origin); }} catch (e) {{}}
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_resp, status_code=400)

    if not code:
        html_resp = """
        <!DOCTYPE html>
        <html><body><p>Código de autorização ausente.</p><script>window.close();</script></body></html>
        """
        return HTMLResponse(content=html_resp, status_code=400)

    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    creds = client.credentials

    cid = (creds.client_id if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_ID")
    csecret = (creds.client_secret if creds else None) or os.environ.get("GOOGLE_HEALTH_CLIENT_SECRET")

    if not cid or not csecret:
        html_resp = """
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
        return HTMLResponse(content=html_resp, status_code=400)

    token_data = {
        "client_id": cid,
        "client_secret": csecret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": DEFAULT_REDIRECT_URI,
    }

    req = UrlRequest(
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
            token_type = data.get("token_type", "Bearer")
            raw_scope = data.get("scope")

            if not access_token:
                raise ValueError("access_token ausente na resposta do Google.")

            # Suporte a consentimento parcial: salva os escopos efetivamente autorizados pelo usuário
            if raw_scope:
                granted_scopes = [s for s in raw_scope.split() if s]
            else:
                granted_scopes = creds.scopes if (creds and creds.scopes) else list(GOOGLE_HEALTH_SCOPES)

            # P0.1: Obtém o healthUserId oficial via GetIdentity (GET /v4/users/me/identity)
            health_user_id = None
            try:
                id_data, _ = client.get_identity(access_token)
                if id_data:
                    health_user_id = id_data.get("healthUserId")
            except Exception as id_err:
                logger.warning("Falha ao obter identity durante OAuth callback: %s", id_err)

            new_creds = GoogleHealthCredentials(
                client_id=cid,
                client_secret=csecret,
                access_token=access_token,
                refresh_token=refresh_token,
                token_uri=GOOGLE_OAUTH_TOKEN_URL,
                token_type=token_type,
                expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                scopes=granted_scopes,
                reauthentication_required=False,
                last_error=None,
                health_user_id=health_user_id,
            )
            new_creds.save_to_file(token_path)


            html_resp = """
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
                            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
                        } catch (e) {}
                    }
                    setTimeout(function() {
                        window.close();
                    }, 1200);
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=html_resp, status_code=200)
    except HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        safe_msg = html.escape(err_msg)
        js_payload = json.dumps({"type": "GOOGLE_AUTH_ERROR", "error": err_msg})
        html_resp = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><style>body{{font-family:sans-serif;background:#0f172a;color:white;padding:2rem;text-align:center;}}</style></head>
        <body>
            <h3 style="color:#ef4444;">Erro HTTP {err.code} ao trocar código por token</h3>
            <pre style="background:#1e293b;padding:1rem;border-radius:0.5rem;text-align:left;max-width:500px;margin:1rem auto;overflow:auto;">{safe_msg}</pre>
            <button onclick="window.close()">Fechar</button>
            <script>if (window.opener) {{ try {{ window.opener.postMessage({js_payload}, window.location.origin); }} catch(e) {{}} }}</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_resp, status_code=400)
    except Exception as exc:
        exc_str = str(exc)
        safe_exc = html.escape(exc_str)
        js_payload = json.dumps({"type": "GOOGLE_AUTH_ERROR", "error": exc_str})
        html_resp = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><style>body{{font-family:sans-serif;background:#0f172a;color:white;padding:2rem;text-align:center;}}</style></head>
        <body>
            <h3 style="color:#ef4444;">Erro inesperado: {safe_exc}</h3>
            <button onclick="window.close()">Fechar</button>
            <script>if (window.opener) {{ try {{ window.opener.postMessage({js_payload}, window.location.origin); }} catch(e) {{}} }}</script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_resp, status_code=500)


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
    days = max(1, min(req.days or 90, 365))  # Padrão 90 dias, até 365 dias

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
    try:
        repo.sync_latest_profile_weight()
    except Exception:
        pass
    status = "ok" if result["status"] in ("SUCESSO", "AVISO") else "error"
    return {
        "status": status,
        "records_read": result["records_read"],
        "records_inserted": result["records_inserted"],
        "google_health_records_imported": result["records_inserted"],
        "summary": result["summary"],
        "message": result["summary"],
        "exception_message": result.get("exception_message"),
    }


class WebhookInterval(BaseModel):
    startTime: Optional[str] = None
    endTime: Optional[str] = None


class WebhookNotificationData(BaseModel):
    healthUserId: Optional[str] = None
    operation: Optional[str] = None
    dataType: Optional[str] = None
    intervals: Optional[List[WebhookInterval]] = None


class GoogleHealthWebhookPayload(BaseModel):
    type: Optional[str] = "notification"
    data: Optional[WebhookNotificationData] = None

    # Compatibilidade com payloads diretos / simplificados
    collectionType: Optional[str] = None
    dataType: Optional[str] = None
    date: Optional[str] = None
    ownerId: Optional[str] = None
    subscriptionId: Optional[str] = None
    notificationType: Optional[str] = None


def _process_webhook_sync(
    data_type: Optional[str] = None,
    date_str: Optional[str] = None,
    health_user_id: Optional[str] = None,
) -> None:
    """Tarefa em background para executar sincronização idempotente após recebimento do webhook."""
    token_path = get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)
    if not client.is_authenticated():
        return

    # P1.4: Lookup e validação defensiva de healthUserId
    if health_user_id:
        if client.credentials and client.credentials.health_user_id:
            if client.credentials.health_user_id != health_user_id:
                logger.warning(
                    "Google Health webhook: healthUserId '%s' recebido difere do usuário local ('%s'). Sincronização ignorada.",
                    health_user_id,
                    client.credentials.health_user_id,
                )
                return
        elif client.credentials and not client.credentials.health_user_id:
            # Associa se ainda não persistido
            client.credentials.health_user_id = health_user_id
            client.credentials.save_to_file(token_path)
            logger.info("healthUserId '%s' associado à credencial local.", health_user_id)

    COLLECTION_MAP: Dict[str, List[str]] = {
        "activity": ["steps", "active-energy-burned", "distance"],
        "steps": ["steps"],
        "body": ["weight", "body-fat"],
        "weight": ["weight"],
        "sleep": ["sleep"],
        "heart_rate": ["heart-rate", "daily-resting-heart-rate"],
        "heart-rate": ["heart-rate", "daily-resting-heart-rate"],
        "daily-resting-heart-rate": ["daily-resting-heart-rate"],
        "oxygen_saturation": ["oxygen-saturation"],
        "oxygen-saturation": ["oxygen-saturation"],
        "daily-oxygen-saturation": ["daily-oxygen-saturation"],
        "heart_rate_variability": ["heart-rate-variability"],
        "heart-rate-variability": ["heart-rate-variability"],
        "daily-heart-rate-variability": ["daily-heart-rate-variability"],
        "respiratory-rate": ["respiratory-rate"],
        "daily-respiratory-rate": ["daily-respiratory-rate"],
        "daily-heart-rate-zones": ["daily-heart-rate-zones"],
        "daily-vo2-max": ["daily-vo2-max"],
    }

    types_to_sync: Optional[List[str]] = None
    if data_type:
        types_to_sync = COLLECTION_MAP.get(data_type, [data_type])

    days = 3
    if date_str:
        try:
            target_date = date.fromisoformat(date_str[:10])
            diff = (date.today() - target_date).days
            days = max(1, min(diff + 2, 30))
        except Exception:
            days = 7

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    sync_google_health_api(repo=repo, days=days, client=client, selected_types=types_to_sync)


@router.post("/webhook")
async def google_health_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    signature: Optional[str] = Header(None, alias="GOOGLE-HEALTH-API-SIGNATURE"),
) -> Response:
    """
    Endpoint de notificação e webhook da Google Health API (P1.3, P1.4, P1.7).
    - Validação de endpointAuthorization (Header Authorization).
    - Handshake de verificação ({"type": "verification"}).
    - Verificação criptográfica de GOOGLE-HEALTH-API-SIGNATURE (ECDSA P-256 / SHA-256).
    - Suporte a lotes/batches de eventos e normalização resiliente (P1.3).
    - Tratamento de operações UPSERT, DELETE, user-deleted e user-revoked-access.
    - Mapeamento e lookup de healthUserId (P1.4).
    - Resposta imediata HTTP 204 No Content para eventos.
    - Sincronização assíncrona em background com processamento idempotente.
    """
    raw_body = await request.body()

    try:
        body_json = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Corpo da requisição deve ser JSON válido.")

    is_verification = isinstance(body_json, dict) and body_json.get("type") == "verification"

    # 1. Validação de Autorização (endpointAuthorization)
    expected_secret = os.environ.get("GOOGLE_HEALTH_WEBHOOK_SECRET") or os.environ.get("GOOGLE_HEALTH_ENDPOINT_AUTH")
    if expected_secret:
        if not authorization:
            raise HTTPException(status_code=401, detail="Header Authorization ausente.")
        clean_auth = authorization[7:].strip() if authorization.startswith("Bearer ") else authorization.strip()
        if not secrets.compare_digest(clean_auth, expected_secret):
            raise HTTPException(status_code=401, detail="Credenciais de Authorization inválidas.")
    elif is_verification:
        # No handshake, a documentação exige rejeitar requisições não autorizadas
        if not authorization or not authorization.strip():
            raise HTTPException(status_code=401, detail="Autorização obrigatória para verificação de webhook.")

    # 2. Handshake de verificação
    if is_verification:
        return JSONResponse(status_code=200, content={"status": "verified"})

    # 3. Verificação da assinatura GOOGLE-HEALTH-API-SIGNATURE
    if signature:
        sig_valid = signature_verifier.verify(raw_body, signature)
        if not sig_valid:
            raise HTTPException(status_code=401, detail="Assinatura GOOGLE-HEALTH-API-SIGNATURE inválida.")
    elif os.environ.get("GOOGLE_HEALTH_REQUIRE_SIGNATURE", "").lower() in ("true", "1"):
        raise HTTPException(status_code=401, detail="Header GOOGLE-HEALTH-API-SIGNATURE obrigatório.")

    # 4. Normalização de batches e extração de eventos (P1.3)
    payloads = normalize_webhook_payloads(body_json)
    events = extract_notification_events(payloads)

    # 5. Processamento independente de cada evento no lote com tolerância a falhas parciais
    token_path = get_default_token_path()
    for ev in events:
        try:
            op = (ev.operation or "UPSERT").lower()
            if op in ("user-deleted", "user-revoked-access", "revoked"):
                logger.warning(
                    "Google Health webhook: evento de ciclo de vida '%s' recebido para healthUserId=%s.",
                    ev.operation,
                    ev.healthUserId,
                )
                cl = GoogleHealthClient(token_path=token_path)
                if cl.credentials:
                    if not ev.healthUserId or cl.credentials.health_user_id == ev.healthUserId:
                        cl.credentials.reauthentication_required = True
                        cl.credentials.last_error = f"Acesso revogado/deletado (evento webhook: {ev.operation})."
                        cl.credentials.save_to_file(token_path)
                continue

            if op == "delete":
                logger.info(
                    "Google Health webhook: notificação DELETE recebida para dataType=%s, healthUserId=%s.",
                    ev.dataType,
                    ev.healthUserId,
                )
                continue

            # Eventos de UPSERT ou modificação de dados
            target_type = ev.dataType
            date_str = None
            if ev.intervals and len(ev.intervals) > 0:
                st = ev.intervals[0].startTime
                if st and isinstance(st, str) and len(st) >= 10:
                    date_str = st[:10]

            background_tasks.add_task(
                _process_webhook_sync,
                data_type=target_type,
                date_str=date_str,
                health_user_id=ev.healthUserId,
            )
        except Exception as item_err:
            logger.error("Erro isolado ao processar evento de webhook: %s", item_err)

    # 6. Resposta imediata 204 No Content
    return Response(status_code=status.HTTP_204_NO_CONTENT)


