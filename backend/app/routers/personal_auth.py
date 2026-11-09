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

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=4, max_length=200)


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
def login_personal_trainer(payload: PersonalLoginRequest) -> PersonalSessionResponse:
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
    except Exception:
        row = None

    is_valid = False
    user_name = DEFAULT_PT_NAME
    user_role = "personal_trainer"

    if row:
        if row["is_active"] == 1 and verify_password(password, row["password_hash"]):
            is_valid = True
            user_name = row["name"] or DEFAULT_PT_NAME
            user_role = row["role"] or "personal_trainer"
    elif username_clean == DEFAULT_PT_USERNAME and password == "1234":
        is_valid = True

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
    }

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
    )


@router.get("/session", response_model=PersonalSessionResponse)
def verify_session(
    token: Optional[str] = Query(None),
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
    authorization: Optional[str] = Header(None),
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

    return PersonalSessionResponse(
        authenticated=True,
        username=session["username"],
        name=session["name"],
        role=session["role"],
        token=effective_token,
        expires_at=session["expires_at"],
    )


@router.post("/logout")
def logout_personal_trainer(
    token: Optional[str] = Query(None),
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
) -> Dict[str, Any]:
    effective_token = token or x_personal_token
    if effective_token and effective_token in _ACTIVE_TRAINER_SESSIONS:
        del _ACTIVE_TRAINER_SESSIONS[effective_token]
    return {"status": "ok", "message": "Desconectado do Portal do Personal Trainer com sucesso."}


@router.post("/change-password")
def change_trainer_password(
    payload: ChangePasswordRequest,
    x_personal_token: Optional[str] = Header(None, alias="X-Personal-Token"),
) -> Dict[str, Any]:
    if not x_personal_token or x_personal_token not in _ACTIVE_TRAINER_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória para alterar a senha.",
        )

    session = _ACTIVE_TRAINER_SESSIONS[x_personal_token]
    username = session["username"]

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

    return {"status": "ok", "message": "Senha alterada com sucesso."}
