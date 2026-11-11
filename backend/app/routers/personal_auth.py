"""
Router FastAPI para Autenticação e Gestão de Sessões do Portal do Personal Trainer.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
from pathlib import Path
import secrets
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field

from backend.app.config import get_db_path

router = APIRouter(prefix="/api/personal", tags=["Personal Trainer Auth"])

# Salt e Hash padrão para o usuário willian (senha: 1234)
DEFAULT_PT_USERNAME = "willian"
DEFAULT_PT_NAME = "Willian"
DEFAULT_PT_HASH = "longevidade_salt_pt:7a9653805a58e701d328238b2551cf673dae0fd405709214c84c0547873410f2"

# Armazenamento em memória de tokens de sessão ativos
_ACTIVE_TRAINER_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_EXPIRATION_DAYS = 30


class PersonalLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class PersonalSessionResponse(BaseModel):
    authenticated: bool
    username: str
    name: str
    role: str = "personal_trainer"
    token: str
    expires_at: str
    requires_password_change: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12, max_length=200)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return f"{salt}:{dk}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, h = stored_hash.split(":")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
        return secrets.compare_digest(dk, h)
    except Exception:
        return False


def _get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_trainer_accounts_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS personal_trainer_accounts (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'personal_trainer',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );
        """
    )
    # Garante que o usuário padrão willian esteja cadastrado
    conn.execute(
        """
        INSERT OR IGNORE INTO personal_trainer_accounts (
            username, password_hash, name, role, is_active
        ) VALUES (?, ?, ?, 'personal_trainer', 1);
        """,
        (DEFAULT_PT_USERNAME, DEFAULT_PT_HASH, DEFAULT_PT_NAME),
    )
    conn.commit()


@router.post("/login", response_model=PersonalSessionResponse)
def login_personal_trainer(payload: PersonalLoginRequest, request: Request, response: Response) -> PersonalSessionResponse:
    username_clean = payload.username.strip().lower()
    password = payload.password

    try:
        conn = _get_connection()
        try:
            _ensure_trainer_accounts_table(conn)
            row = conn.execute(
                "SELECT username, password_hash, name, role, is_active FROM personal_trainer_accounts WHERE lower(username) = ?;",
                (username_clean,),
            ).fetchone()
        finally:
            conn.close()
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível verificar as credenciais. Tente novamente mais tarde.",
        ) from exc

    is_valid = False
    user_name = DEFAULT_PT_NAME
    user_role = "personal_trainer"

    if row:
        if row["is_active"] == 1 and verify_password(password, row["password_hash"]):
            is_valid = True
            user_name = row["name"] or DEFAULT_PT_NAME
            user_role = row["role"] or "personal_trainer"
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos. Verifique suas credenciais de acesso ao Portal do Personal.",
        )

    # Gera token seguro de sessão
    token = secrets.token_hex(32)
    now = datetime.now()
    expires_at = now + timedelta(days=SESSION_EXPIRATION_DAYS)

    _ACTIVE_TRAINER_SESSIONS[token] = {
        "username": username_clean,
        "name": user_name,
        "role": user_role,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "requires_password_change": password == "1234" or secrets.compare_digest(row["password_hash"], DEFAULT_PT_HASH),
    }
    from backend.app.access import TRAINER_COOKIE, _effective_scheme
    response.set_cookie(TRAINER_COOKIE, token, httponly=True,
                        secure=_effective_scheme(request) == "https",
                        samesite="strict", max_age=SESSION_EXPIRATION_DAYS * 86400, path="/")

    # Atualiza timestamp de último login no banco de dados
    try:
        conn = _get_connection()
        try:
            conn.execute(
                "UPDATE personal_trainer_accounts SET last_login = ? WHERE lower(username) = ?;",
                (now.isoformat(), username_clean),
            )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass

    return PersonalSessionResponse(
        authenticated=True,
        username=username_clean,
        name=user_name,
        role=user_role,
        token=token,
        expires_at=expires_at.isoformat(),
        requires_password_change=_ACTIVE_TRAINER_SESSIONS[token]["requires_password_change"],
    )


@router.get("/session", response_model=PersonalSessionResponse)
def verify_session(
    token: Optional[str] = Query(None),
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
    authorization: Optional[str] = Header(None),
    request: Request = None,
    response: Response = None,
) -> PersonalSessionResponse:
    effective_token = token or x_personal_token
    if not effective_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            effective_token = parts[1]

    if not effective_token or effective_token not in _ACTIVE_TRAINER_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão não encontrada ou expirada. Faça login novamente.",
        )

    session = _ACTIVE_TRAINER_SESSIONS[effective_token]
    expires_at = datetime.fromisoformat(session["expires_at"])
    if datetime.now() > expires_at:
        del _ACTIVE_TRAINER_SESSIONS[effective_token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada. Faça login novamente.",
        )

    if request is not None and response is not None:
        from backend.app.access import TRAINER_COOKIE, _effective_scheme
        remaining = max(0, int((expires_at - datetime.now()).total_seconds()))
        response.set_cookie(TRAINER_COOKIE, effective_token, httponly=True,
                            secure=_effective_scheme(request) == "https",
                            samesite="strict", max_age=remaining, path="/")

    return PersonalSessionResponse(
        authenticated=True,
        username=session["username"],
        name=session["name"],
        role=session["role"],
        token=effective_token,
        expires_at=session["expires_at"],
        requires_password_change=session.get("requires_password_change", False),
    )


@router.post("/logout")
def logout_personal_trainer(
    request: Request,
    response: Response,
    token: Optional[str] = Query(None),
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
) -> Dict[str, Any]:
    from backend.app.access import TRAINER_COOKIE
    effective_token = token or x_personal_token or request.cookies.get(TRAINER_COOKIE)
    if effective_token and effective_token in _ACTIVE_TRAINER_SESSIONS:
        del _ACTIVE_TRAINER_SESSIONS[effective_token]
    response.delete_cookie(TRAINER_COOKIE, path="/")
    return {"status": "ok", "message": "Desconectado do Portal do Personal Trainer com sucesso."}


@router.post("/change-password")
def change_trainer_password(
    payload: ChangePasswordRequest,
    request: Request,
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
) -> Dict[str, Any]:
    session = verify_session(token=None, x_personal_token=x_personal_token, authorization=None)
    username = session.username
    if session.requires_password_change:
        from backend.app.access import OWNER_COOKIE, _loopback, owner_authenticated
        peer = request.client.host if request.client else ""
        local_request = (_loopback(peer) and _loopback(request.url.hostname)
                         and not request.headers.get("x-forwarded-proto"))
        if not local_request and not owner_authenticated(request.cookies.get(OWNER_COOKIE)):
            raise HTTPException(status_code=403, detail="A senha inicial deve ser alterada localmente ou pelo proprietário autenticado.")

    conn = _get_connection()
    try:
        _ensure_trainer_accounts_table(conn)
        row = conn.execute(
            "SELECT password_hash FROM personal_trainer_accounts WHERE lower(username) = ?;",
            (username,),
        ).fetchone()

        if not row or not verify_password(payload.current_password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta.",
            )

        new_hash = hash_password(payload.new_password)
        conn.execute(
            "UPDATE personal_trainer_accounts SET password_hash = ? WHERE lower(username) = ?;",
            (new_hash, username),
        )
        conn.commit()
    finally:
        conn.close()

    active = _ACTIVE_TRAINER_SESSIONS.get(session.token)
    if active is not None:
        active["requires_password_change"] = False
    # As demais sessões não devem sobreviver à troca de credencial.
    for token, active_session in list(_ACTIVE_TRAINER_SESSIONS.copy().items()):
        if token != session.token and active_session.get("username") == username:
            _ACTIVE_TRAINER_SESSIONS.pop(token, None)

    return {"status": "ok", "message": "Senha alterada com sucesso."}
