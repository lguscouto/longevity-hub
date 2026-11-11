"""Autenticação do proprietário e autorização das rotas da aplicação."""
from __future__ import annotations

import getpass
import hashlib
import ipaddress
import os
import re
import secrets
import time
import threading
from urllib.parse import urlsplit

import keyring
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

SERVICE = "longevidade-hub"
OWNER_KEY = "owner-password-hash"
OWNER_COOKIE = "longevidade_owner"
TRAINER_COOKIE = "longevidade_trainer"
SESSION_SECONDS = 12 * 60 * 60
_owner_sessions: dict[str, float] = {}
_login_attempts: dict[tuple[str, str], list[float]] = {}
_attempts_lock = threading.Lock()
router = APIRouter(prefix="/api/owner", tags=["Owner authentication"])


def password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000).hex()
    return f"{salt}:{digest}"


def check_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split(":", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000).hex()
        return secrets.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _loopback(value: str | None) -> bool:
    try:
        return ipaddress.ip_address(value or "").is_loopback
    except ValueError:
        return (value or "").lower() == "localhost"


def _effective_scheme(request: Request) -> str:
    peer = request.client.host if request.client else ""
    trusted = {v.strip() for v in os.getenv("LONGEVIDADE_TRUSTED_PROXIES", "").split(",") if v.strip()}
    scheme = request.url.scheme
    if peer in trusted:
        forwarded = request.headers.get("x-forwarded-proto", "").strip().lower()
        if forwarded in ("http", "https"):
            scheme = forwarded
    return scheme


def secure_transport(request: Request) -> bool:
    # Os cabeçalhos de proxy só são aceitos de IPs explicitamente configurados.
    peer = request.client.host if request.client else ""
    scheme = _effective_scheme(request)
    if scheme == "https":
        return True
    return _loopback(peer) and _loopback(request.url.hostname)


def owner_authenticated(token: str | None) -> bool:
    if not token:
        return False
    expiry = _owner_sessions.get(token, 0)
    if expiry <= time.monotonic():
        _owner_sessions.pop(token, None)
        return False
    return True


class OwnerLogin(BaseModel):
    password: str = Field(min_length=1, max_length=1024)


@router.post("/login")
def owner_login(payload: OwnerLogin, request: Request, response: Response):
    try:
        stored = keyring.get_password(SERVICE, OWNER_KEY)
    except Exception as exc:
        raise HTTPException(503, "Cofre de credenciais indisponível.") from exc
    if not stored:
        raise HTTPException(503, "Senha do proprietário ainda não configurada no computador servidor.")
    if not check_password(payload.password, stored):
        raise HTTPException(401, "Senha incorreta.")
    token = secrets.token_urlsafe(32)
    _owner_sessions[token] = time.monotonic() + SESSION_SECONDS
    response.set_cookie(OWNER_COOKIE, token, httponly=True, secure=_effective_scheme(request) == "https", samesite="strict", max_age=SESSION_SECONDS, path="/")
    return {"authenticated": True}


@router.get("/session")
def owner_session(request: Request):
    if not owner_authenticated(request.cookies.get(OWNER_COOKIE)):
        raise HTTPException(401, "Sessão não encontrada ou expirada.")
    return {"authenticated": True}


@router.post("/logout")
def owner_logout(request: Request, response: Response):
    _owner_sessions.pop(request.cookies.get(OWNER_COOKIE, ""), None)
    response.delete_cookie(OWNER_COOKIE, path="/")
    return {"authenticated": False}


_TRAINER_GET = (
    re.compile(r"^/api/labs/?$"),
    re.compile(r"^/api/physical-assessments/?$"),
    re.compile(r"^/api/physical-assessments/(?:compare|timeline|athlete-profile)$"),
    re.compile(r"^/api/physical-assessments/[^/]+/photos/(?:download|[^/]+/content)$"),
)


def _trainer_allowed(request: Request) -> bool:
    if request.method != "GET" or not any(p.fullmatch(request.url.path) for p in _TRAINER_GET):
        return False
    token = request.cookies.get(TRAINER_COOKIE) or request.headers.get("x-personal-token")
    if not token:
        return False
    from backend.app.routers.personal_auth import verify_session
    try:
        session = verify_session(token=None, x_personal_token=token, authorization=None)
        return not session.requires_password_change
    except HTTPException:
        return False


async def authorization_middleware(request: Request, call_next):
    path = request.url.path
    api = path.startswith("/api/") or path in ("/docs", "/redoc", "/openapi.json")
    if not api or request.method == "OPTIONS":
        return await call_next(request)
    public_callback = request.method == "GET" and path == "/api/google-health/callback"
    public_webhook = request.method == "POST" and path == "/api/google-health/webhook"
    if not secure_transport(request):
        return JSONResponse({"detail": "HTTPS é obrigatório fora do acesso local."}, status_code=403)
    if request.method not in ("GET", "HEAD", "OPTIONS") and not public_webhook:
        origin = request.headers.get("origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme != _effective_scheme(request) or parsed.netloc != request.headers.get("host"):
                return JSONResponse({"detail": "Origem não permitida."}, status_code=403)
    if public_callback or public_webhook or path in {
        "/api/owner/login", "/api/owner/session", "/api/owner/logout",
        "/api/personal/login", "/api/personal/session", "/api/personal/logout", "/api/personal/change-password",
    }:
        if request.method == "POST" and path in {"/api/owner/login", "/api/personal/login"}:
            now = time.monotonic()
            peer_key = (request.client.host if request.client else "", path)
            with _attempts_lock:
                if len(_login_attempts) > 4096:
                    _login_attempts.clear()
                attempts = [t for t in _login_attempts.get(peer_key, []) if now - t < 60]
                if len(attempts) >= 8:
                    return JSONResponse({"detail": "Muitas tentativas. Aguarde um minuto."}, status_code=429)
                _login_attempts[peer_key] = attempts + [now]
            result = await call_next(request)
            if result.status_code < 400:
                with _attempts_lock:
                    _login_attempts.pop(peer_key, None)
            return result
        return await call_next(request)
    if owner_authenticated(request.cookies.get(OWNER_COOKIE)) or _trainer_allowed(request):
        return await call_next(request)
    return JSONResponse({"detail": "Autenticação necessária."}, status_code=401)


def main() -> None:
    password = getpass.getpass("Nova senha do proprietário (mínimo 12 caracteres): ")
    if len(password) < 12 or password != getpass.getpass("Confirme a senha: "):
        raise SystemExit("Senha curta ou confirmação diferente; nenhuma alteração realizada.")
    keyring.set_password(SERVICE, OWNER_KEY, password_hash(password))
    print("Senha do proprietário configurada no cofre do sistema.")


if __name__ == "__main__":
    main()
