from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import os
from pathlib import Path

from backend.app.config import ZEPP_DIR

router = APIRouter(prefix="/api/zepp", tags=["Zepp"])

ZEPP_CLI_DIR = ZEPP_DIR / "zepp-health-cli"
ZEPP_CONFIG_FILE = ZEPP_CLI_DIR / "config.json"


class ZeppCredentialsInput(BaseModel):
    app_token: str
    user_id: str
    host: Optional[str] = "api-mifit-us3.zepp.com"
    app_platform: Optional[str] = "ios_phone"
    lang: Optional[str] = "en"
    country: Optional[str] = "US"
    timezone: Optional[str] = "America/Sao_Paulo"


def _get_config_path() -> Path:
    # Permite override em ambiente de teste via HERMES_HOME ou variável ZEPP_CONFIG_PATH
    custom_path = os.environ.get("ZEPP_CONFIG_PATH")
    if custom_path:
        return Path(custom_path)
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home and not ZEPP_CONFIG_FILE.parent.exists():
        fallback_dir = Path(hermes_home) / "zepp"
        fallback_dir.mkdir(parents=True, exist_ok=True)
        return fallback_dir / "config.json"
    return ZEPP_CONFIG_FILE


def _load_zepp_config() -> Dict[str, Any]:
    config_path = _get_config_path()
    if config_path.is_file():
        try:
            return json.loads(config_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass

    token = os.environ.get("ZEPP_APP_TOKEN", "").strip()
    user_id = os.environ.get("ZEPP_USER_ID", "").strip()
    if token and user_id:
        return {
            "app_token": token,
            "user_id": user_id,
            "host": os.environ.get("ZEPP_HOST", "api-mifit-us3.zepp.com"),
        }
    return {}


@router.get("/status")
def get_zepp_status() -> Dict[str, Any]:
    """Retorna o status atual da configuração e credenciais do Zepp OS (Amazfit)."""
    cfg = _load_zepp_config()
    token = cfg.get("app_token", "").strip()
    user_id = cfg.get("user_id", "").strip()
    host = cfg.get("host", "api-mifit-us3.zepp.com")

    is_configured = bool(token and user_id)
    masked_token = None
    if token:
        masked_token = f"{token[:6]}...{token[-4:]}" if len(token) > 10 else "***"

    return {
        "configured": is_configured,
        "connected": is_configured,
        "user_id": user_id if user_id else None,
        "host": host,
        "masked_app_token": masked_token,
        "has_app_token": bool(token),
        "error": None if is_configured else "Credenciais do Zepp não configuradas.",
    }


@router.post("/credentials")
def save_zepp_credentials(data: ZeppCredentialsInput) -> Dict[str, Any]:
    """Salva credenciais do Zepp em config.json de forma atômica."""
    clean_token = data.app_token.strip()
    clean_user_id = data.user_id.strip()
    clean_host = (data.host or "api-mifit-us3.zepp.com").strip()

    if not clean_token:
        raise HTTPException(status_code=400, detail="O app_token do Zepp não pode estar vazio.")
    if not clean_user_id:
        raise HTTPException(status_code=400, detail="O user_id do Zepp não pode estar vazio.")

    config_path = _get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "app_token": clean_token,
        "user_id": clean_user_id,
        "host": clean_host,
        "app_platform": data.app_platform or "ios_phone",
        "lang": data.lang or "en",
        "country": data.country or "US",
        "timezone": data.timezone or "America/Sao_Paulo",
    }

    # Escrita atômica segura
    tmp_path = config_path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp_path.replace(config_path)

    masked_token = f"{clean_token[:6]}...{clean_token[-4:]}" if len(clean_token) > 10 else "***"

    return {
        "status": "ok",
        "message": "Credenciais Zepp salvas com sucesso.",
        "user_id": clean_user_id,
        "host": clean_host,
        "masked_app_token": masked_token,
    }
