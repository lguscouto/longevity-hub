"""Módulo de autenticação e proteção contra CSRF para OAuth 2.0 da Google Health API."""

from __future__ import annotations

import json
import secrets
import threading
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

DEFAULT_REDIRECT_URI = "http://127.0.0.1:8887/api/google-health/callback"


class OAuthStateManager:
    """Gerenciador seguro de estado CSRF com TTL estrito e consumo de uso único (single-use)."""

    def __init__(self, ttl_seconds: int = 600) -> None:
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


def safe_json_for_script(data: dict) -> str:
    """Serializa dict para JSON seguro para inserção em tags <script> HTML (mitiga XSS)."""
    return json.dumps(data).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
