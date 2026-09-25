"""
Cliente oficial para a Google Health API v4 (https://health.googleapis.com/v4).

Conforme especificação Longevidade Hub Codex (P0 e P1):
- Autenticação OAuth 2.0 com renovação automática e detecção de reauthentication_required.
- Scopes oficiais da Google Health API v4.
- Filtro temporal server-side com formato canônico (snake_case, RFC 3339 UTC).
- Validação temporal defensiva no client-side com precisão completa de microssegundos/nanossegundos.
- Operações REST v4 canônicas: list, reconcile (com dataSourceFamily), rollUp (POST JSON) e dailyRollUp (POST JSON civilTime).
- Camada raw health_data_points com ID determinístico (hash SHA-256) garantindo idempotência total.
- Suporte a consentimento parcial (Partial Consent).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import time as pytime
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from longevidade.integrations.google_health.registry import (
    GoogleHealthDataTypeRegistry,
    SCOPE_ACTIVITY,
    SCOPE_HEALTH_METRICS,
    SCOPE_SLEEP,
    SCOPE_NUTRITION,
    SCOPE_CATEGORY_MAP,
)

logger = logging.getLogger("longevidade.google_health.client")

GOOGLE_HEALTH_BASE_URL = "https://health.googleapis.com/v4"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_HEALTH_SCOPES = [
    SCOPE_ACTIVITY,
    SCOPE_HEALTH_METRICS,
    SCOPE_SLEEP,
]


@dataclass
class GoogleHealthCredentials:
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_uri: str = GOOGLE_OAUTH_TOKEN_URL
    token_type: Optional[str] = "Bearer"
    expiry: Optional[datetime] = None
    scopes: List[str] = field(default_factory=lambda: list(GOOGLE_HEALTH_SCOPES))
    reauthentication_required: bool = False
    last_error: Optional[str] = None
    health_user_id: Optional[str] = None
    project_number: Optional[str] = None

    def has_scope(self, scope_or_category: str) -> bool:
        """Verifica se um escopo específico ou categoria foi autorizado."""
        target_scope = SCOPE_CATEGORY_MAP.get(scope_or_category, scope_or_category)
        return target_scope in (self.scopes or [])

    def get_scope_status(self) -> Dict[str, bool]:
        """Retorna o status de consentimento detalhado por módulo."""
        return {
            "activity": self.has_scope("activity"),
            "health_metrics": self.has_scope("health_metrics"),
            "sleep": self.has_scope("sleep"),
            "nutrition": self.has_scope("nutrition"),
        }

    @classmethod
    def from_file(cls, path: str | Path) -> Optional[GoogleHealthCredentials]:
        token_path = Path(path)
        if not token_path.is_file():
            return None
        try:
            data = json.loads(token_path.read_text(encoding="utf-8"))
            expiry_dt = None
            if "expiry" in data and data["expiry"]:
                try:
                    expiry_dt = datetime.fromisoformat(str(data["expiry"]).replace("Z", "+00:00"))
                except Exception:
                    pass
            return cls(
                client_id=data.get("client_id"),
                client_secret=data.get("client_secret"),
                access_token=data.get("access_token") or data.get("token"),
                refresh_token=data.get("refresh_token"),
                token_uri=data.get("token_uri") or GOOGLE_OAUTH_TOKEN_URL,
                token_type=data.get("token_type") or "Bearer",
                expiry=expiry_dt,
                scopes=data.get("scopes") or list(GOOGLE_HEALTH_SCOPES),
                reauthentication_required=bool(data.get("reauthentication_required", False)),
                last_error=data.get("last_error"),
                health_user_id=data.get("health_user_id") or data.get("healthUserId"),
                project_number=data.get("project_number") or data.get("projectNumber"),
            )
        except Exception:
            return None

    def save_to_file(self, path: str | Path) -> None:
        token_path = Path(path)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "token_uri": self.token_uri,
            "token_type": self.token_type or "Bearer",
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "scopes": self.scopes,
            "reauthentication_required": self.reauthentication_required,
            "last_error": self.last_error,
            "health_user_id": self.health_user_id,
            "healthUserId": self.health_user_id,
            "project_number": self.project_number,
        }
        token_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")



def get_default_token_path() -> Path:
    """Local padrão do arquivo de token do Google Health."""
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home) / "google_health_token.json"
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "hermes" / "google_health_token.json"
    return Path.home() / "AppData" / "Local" / "hermes" / "google_health_token.json"


def format_rfc3339_utc(dt: datetime) -> str:
    """Formata datetime para string RFC 3339 UTC com preservação de precisão."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    if dt.microsecond > 0:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


DAILY_DATA_TYPES = {
    "daily-resting-heart-rate",
    "daily_resting_heart_rate",
    "daily-heart-rate-variability",
    "daily_heart_rate_variability",
    "daily-oxygen-saturation",
    "daily_oxygen_saturation",
    "daily-respiratory-rate",
    "daily_respiratory_rate",
    "daily-heart-rate-zones",
    "daily_heart_rate_zones",
    "daily-sleep-temperature-derivations",
    "daily_sleep_temperature_derivations",
    "daily-vo2-max",
    "daily_vo2_max",
}

SAMPLE_DATA_TYPES = {
    "heart-rate",
    "heart_rate",
    "heart-rate-variability",
    "heart_rate_variability",
    "weight",
    "body-fat",
    "body_fat",
    "oxygen-saturation",
    "oxygen_saturation",
    "respiratory-rate",
    "respiratory_rate",
    "core-body-temperature",
    "core_body_temperature",
    "respiratory-rate-sleep-summary",
    "respiratory_rate_sleep_summary",
    "vo2-max",
    "vo2_max",
    "run-vo2-max",
    "run_vo2_max",
}

SLEEP_DATA_TYPES = {
    "sleep",
}


def build_server_filter(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    data_type: Optional[str] = None,
) -> Optional[str]:
    """
    Constrói a expressão de filtro temporal server-side para a Google Health API v4 (AIP-160).
    
    Regras da especificação oficial do Google (Record Types):
    - Sessões de Sono (sleep):
      filtra exclusivamente por physical end_time UTC: sleep.interval.end_time >= "..." AND sleep.interval.end_time < "..."
      (A API rejeita sleep.interval.start_time com INVALID_DATA_POINT_FILTER)
    - Tipos Daily (ex: daily-resting-heart-rate, daily-heart-rate-variability, daily-oxygen-saturation):
      filtra por data civil YYYY-MM-DD: {dataType}.date >= "YYYY-MM-DD" AND {dataType}.date < "YYYY-MM-DD"
    - Tipos Sample / Instantâneo (ex: heart-rate, heart-rate-variability, weight, body-fat, oxygen-saturation):
      filtra por physical_time UTC: {dataType}.sample_time.physical_time >= "..." AND {dataType}.sample_time.physical_time < "..."
    - Tipos Interval / Sessão (ex: steps, active-energy-burned, distance, exercise):
      filtra por start_time UTC: {dataType}.interval.start_time >= "..." AND {dataType}.interval.start_time < "..."
    - Compatibilidade: se data_type for None, utiliza a expressão genérica start_time / end_time.
    """
    if start_time is not None and end_time is not None:
        st_utc = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
        et_utc = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
        if st_utc >= et_utc:
            raise ValueError("start_time deve ser estritamente anterior a end_time")

    if data_type is not None:
        filter_name = data_type.replace("-", "_")
        clean_type = data_type.lower().strip()

        if clean_type in SLEEP_DATA_TYPES or clean_type.replace("_", "-") in SLEEP_DATA_TYPES:
            field_path = "sleep.interval.end_time"
            st_val = format_rfc3339_utc(start_time) if start_time else None
            et_val = format_rfc3339_utc(end_time) if end_time else None
        elif (
            clean_type in DAILY_DATA_TYPES
            or clean_type.replace("_", "-") in DAILY_DATA_TYPES
            or clean_type.startswith("daily-")
            or clean_type.startswith("daily_")
        ):
            field_path = f"{filter_name}.date"
            st_val = (start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)).strftime("%Y-%m-%d") if start_time else None
            et_val = (end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)).strftime("%Y-%m-%d") if end_time else None
        elif clean_type in SAMPLE_DATA_TYPES or clean_type.replace("_", "-") in SAMPLE_DATA_TYPES:
            field_path = f"{filter_name}.sample_time.physical_time"
            st_val = format_rfc3339_utc(start_time) if start_time else None
            et_val = format_rfc3339_utc(end_time) if end_time else None
        else:
            field_path = f"{filter_name}.interval.start_time"
            st_val = format_rfc3339_utc(start_time) if start_time else None
            et_val = format_rfc3339_utc(end_time) if end_time else None

        if st_val is not None and et_val is not None:
            return f'{field_path} >= "{st_val}" AND {field_path} < "{et_val}"'
        if st_val is not None:
            return f'{field_path} >= "{st_val}"'
        if et_val is not None:
            return f'{field_path} < "{et_val}"'
        return None

    if start_time is not None and end_time is not None:
        return f'start_time >= "{format_rfc3339_utc(start_time)}" AND end_time < "{format_rfc3339_utc(end_time)}"'
    if start_time is not None:
        return f'start_time >= "{format_rfc3339_utc(start_time)}"'
    if end_time is not None:
        return f'end_time < "{format_rfc3339_utc(end_time)}"'
    return None


def parse_point_timestamp_utc(pt: Dict[str, Any], field_key: Optional[str] = None) -> Optional[datetime]:
    """
    Extrai datetime UTC de alta precisão de um dataPoint da Google Health API.
    Preserva nanos/microssegundos e suporta physicalTime, startTime, endTime, recordedAt e civilTime.
    Para registros de sono (sleep), prioriza endTime como referência temporal canônica.
    """
    data_obj = {}
    if field_key:
        val = pt.get(field_key) or pt.get(field_key.replace("-", "_"))
        if isinstance(val, dict):
            data_obj = val

    sample_time = data_obj.get("sampleTime") or pt.get("sampleTime") or {}
    interval = data_obj.get("interval") or pt.get("interval") or {}

    st_val = interval.get("startTime") if isinstance(interval, dict) else None
    st_phys = st_val.get("physicalTime") if isinstance(st_val, dict) else (st_val if isinstance(st_val, str) else None)

    et_val = interval.get("endTime") if isinstance(interval, dict) else None
    et_phys = et_val.get("physicalTime") if isinstance(et_val, dict) else (et_val if isinstance(et_val, str) else None)

    is_sleep = (
        (field_key and field_key.lower().replace("_", "-") in ("sleep", "sleep-session"))
        or "sleep" in pt
        or "sleep" in data_obj
    )

    if is_sleep and et_phys:
        phys = et_phys
    else:
        phys = (
            (sample_time.get("physicalTime") if isinstance(sample_time, dict) else None)
            or st_phys
            or et_phys
            or pt.get("startTime")
            or pt.get("endTime")
            or data_obj.get("startTime")
            or pt.get("recordedAt")
        )

    if isinstance(phys, str):
        try:
            clean_str = phys.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # Fallback para tempo civil se presente
    civil = (
        (sample_time.get("civilTime") if isinstance(sample_time, dict) else None)
        or (data_obj.get("civilTime") if isinstance(data_obj, dict) else None)
        or (interval.get("civilStartTime") if isinstance(interval, dict) else None)
        or (interval.get("civilEndTime") if isinstance(interval, dict) else None)
        or {}
    )
    if isinstance(civil, dict):
        date_dict = civil.get("date") or {}
        time_dict = civil.get("time") or {}
        y, m, d = date_dict.get("year"), date_dict.get("month"), date_dict.get("day")
        if y and m and d:
            hh = time_dict.get("hours", 0)
            mm = time_dict.get("minutes", 0)
            ss = time_dict.get("seconds", 0)
            nanos = time_dict.get("nanos", 0)
            micros = max(0, min(999999, nanos // 1000))
            return datetime(y, m, d, hh, mm, ss, micros, tzinfo=timezone.utc)

    return None


def is_point_in_interval(
    pt: Dict[str, Any],
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    field_key: Optional[str] = None,
) -> bool:
    """
    Validação defensiva client-side usando precisão total (UTC).
    start_time <= timestamp < end_time (ou < end_time conforme especificação).
    """
    if start_time is None and end_time is None:
        return True

    pt_dt = parse_point_timestamp_utc(pt, field_key=field_key)
    if pt_dt is None:
        return True  # Não rejeita se timestamp não puder ser determinado

    if start_time is not None:
        st_utc = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
        if pt_dt < st_utc:
            return False

    if end_time is not None:
        et_utc = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
        if pt_dt >= et_utc:
            return False

    return True


def _extract_date_ref_from_point(pt: Dict[str, Any], field_key: str) -> Optional[str]:
    """Extrai string YYYY-MM-DD a partir de civilTime, physicalTime ou startTime do dataPoint."""
    data_obj = pt.get(field_key) or {}

    # 1. Procura civilTime
    sample_time = data_obj.get("sampleTime") or pt.get("sampleTime") or {}
    civil = sample_time.get("civilTime") or data_obj.get("civilTime") or {}
    dt_info = civil.get("date") if isinstance(civil, dict) else None
    if isinstance(dt_info, dict):
        y = dt_info.get("year")
        m = dt_info.get("month")
        d = dt_info.get("day")
        if y and m and d:
            return f"{y:04d}-{m:02d}-{d:02d}"

    interval = data_obj.get("interval") or pt.get("interval") or {}
    civil_start = interval.get("civilStartTime") or {}
    dt_info = civil_start.get("date") if isinstance(civil_start, dict) else None
    if isinstance(dt_info, dict):
        y = dt_info.get("year")
        m = dt_info.get("month")
        d = dt_info.get("day")
        if y and m and d:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # 2. Procura physicalTime / startTime / timestamp em string ISO
    st_val = interval.get("startTime")
    st_phys = st_val.get("physicalTime") if isinstance(st_val, dict) else (st_val if isinstance(st_val, str) else None)

    phys = (
        sample_time.get("physicalTime")
        or st_phys
        or pt.get("startTime")
        or pt.get("endTime")
        or data_obj.get("startTime")
    )
    if phys and isinstance(phys, str) and len(phys) >= 10:
        return phys[:10]

    return None


def _build_raw_point(data_type: str, pt: Dict[str, Any], provider: str = "google_health") -> Dict[str, Any]:
    """
    Extrai e normaliza campos mínimos para persistência na camada raw health_data_points.
    Utiliza hash SHA-256 determinístico quando id/dataPointId não forem fornecidos (P1.5 Idempotência).
    """
    source_val = pt.get("dataSource", {}).get("platform") or pt.get("source") or "GoogleHealthAPI"

    # Extração de tempos
    st_val = pt.get("startTime") or (
        pt.get("interval", {}).get("startTime", {}).get("physicalTime")
        if isinstance(pt.get("interval"), dict)
        else None
    )
    et_val = pt.get("endTime") or (
        pt.get("interval", {}).get("endTime", {}).get("physicalTime")
        if isinstance(pt.get("interval"), dict)
        else None
    )
    rec_at = pt.get("recordedAt") or st_val or datetime.now(timezone.utc).isoformat()

    val = None
    unit = None
    if data_type == "steps":
        val = pt.get("steps", {}).get("count") or pt.get("steps", {}).get("stepsCount") or pt.get("value")
        unit = "count"
    elif data_type == "heart-rate":
        val = pt.get("heartRate", {}).get("bpm") or pt.get("heart_rate", {}).get("bpm") or pt.get("value")
        unit = "bpm"
    elif data_type in ("daily-resting-heart-rate", "resting-heart-rate"):
        rhr_obj = pt.get("dailyRestingHeartRate") or pt.get("daily_resting_heart_rate") or pt.get("restingHeartRate") or {}
        val = rhr_obj.get("bpm") or rhr_obj.get("value") or pt.get("value")
        unit = "bpm"
    elif data_type == "sleep":
        val = pt.get("sleep", {}).get("durationMinutes") or pt.get("value")
        unit = "minutes"
    elif data_type in ("daily-oxygen-saturation", "oxygen-saturation"):
        val = pt.get("oxygenSaturation", {}).get("percentage") or pt.get("oxygen_saturation", {}).get("percentage") or pt.get("value")
        unit = "percentage"
    elif data_type == "weight":
        w_obj = pt.get("weight", {})
        if "weightGrams" in w_obj:
            val = float(w_obj["weightGrams"]) / 1000.0
        elif "kilograms" in w_obj:
            val = float(w_obj["kilograms"])
        else:
            val = pt.get("value")
        unit = "kg"
    elif data_type in ("daily-heart-rate-variability", "heart-rate-variability"):
        val = pt.get("heartRateVariability", {}).get("rmssdMs") or pt.get("heart_rate_variability", {}).get("rmssdMs") or pt.get("value")
        unit = "rmssd_ms"
    elif data_type == "respiratory-rate":
        val = pt.get("respiratoryRate", {}).get("breathsPerMinute") or pt.get("value")
        unit = "rpm"
    elif data_type == "active-zone-minutes":
        val = pt.get("activeZoneMinutes", {}).get("minutes") or pt.get("value")
        unit = "minutes"
    else:
        val = pt.get("value")

    val_float = None
    if val is not None:
        try:
            val_float = float(val)
        except Exception:
            pass

    # Geração determinística de ID estável caso a API não forneça identificador explícito
    pt_id = pt.get("id") or pt.get("dataPointId")
    if not pt_id:
        pt_content = json.dumps(pt, sort_keys=True, default=str)
        seed = f"{provider}:{data_type}:{source_val}:{st_val}:{et_val}:{pt_content}"
        hash_digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:24]
        pt_id = f"{provider}_{data_type}_{hash_digest}"

    return {
        "id": str(pt_id),
        "provider": provider,
        "data_type": data_type,
        "source": str(source_val) if source_val else None,
        "start_time": str(st_val) if st_val else None,
        "end_time": str(et_val) if et_val else None,
        "recorded_at": str(rec_at) if rec_at else None,
        "value": val_float,
        "unit": unit,
        "raw_json": json.dumps(pt, default=str),
    }


def _get_urlopen():
    import sys
    ingest = sys.modules.get("longevidade.ingestion.google_health_client")
    if ingest and hasattr(ingest, "urlopen"):
        return getattr(ingest, "urlopen")
    return urlopen


class GoogleHealthClient:
    """Cliente para a Google Health API v4 com suporte completo a payloads REST v4."""

    def __init__(
        self,
        credentials: Optional[GoogleHealthCredentials] = None,
        token_path: Optional[str | Path] = None,
    ):
        self.token_path = Path(token_path) if token_path else get_default_token_path()
        self.credentials = credentials or GoogleHealthCredentials.from_file(self.token_path)
        self.last_collected_raw_points: List[Dict[str, Any]] = []

    def is_authenticated(self) -> bool:
        """Verifica se há credenciais válidas configuradas e sem exigência de reautenticação."""
        if not self.credentials:
            return False
        if self.credentials.reauthentication_required:
            return False
        return bool(self.credentials.access_token or self.credentials.refresh_token)

    def is_reauthentication_required(self) -> bool:
        """Verifica se a reautenticação é necessária."""
        if not self.credentials:
            return False
        return bool(self.credentials.reauthentication_required)

    def refresh_access_token(self) -> Tuple[bool, Optional[str]]:
        """Renova o token de acesso utilizando o refresh_token."""
        if not self.credentials or not self.credentials.refresh_token:
            return False, "Credenciais ausentes ou refresh_token não configurado."

        cid = self.credentials.client_id or os.environ.get("GOOGLE_HEALTH_CLIENT_ID")
        csecret = self.credentials.client_secret or os.environ.get("GOOGLE_HEALTH_CLIENT_SECRET")

        if not cid or not csecret:
            return False, "Client ID ou Client Secret ausentes para renovação."

        token_data = {
            "client_id": cid,
            "client_secret": csecret,
            "refresh_token": self.credentials.refresh_token,
            "grant_type": "refresh_token",
        }

        req = Request(
            GOOGLE_OAUTH_TOKEN_URL,
            data=urlencode(token_data).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        try:
            with _get_urlopen()(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                new_access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)

                if not new_access_token:
                    return False, "access_token ausente na resposta de renovação."

                self.credentials.access_token = new_access_token
                self.credentials.expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                self.credentials.reauthentication_required = False
                self.credentials.last_error = None
                self.credentials.save_to_file(self.token_path)
                return True, None
        except HTTPError as err:
            err_body = err.read().decode("utf-8", errors="ignore")
            if err.code in (400, 401) and "invalid_grant" in err_body:
                self.credentials.reauthentication_required = True
                self.credentials.last_error = "Sessão expirada ou consentimento revogado. Reautenticação necessária."
                self.credentials.save_to_file(self.token_path)
                return False, self.credentials.last_error
            return False, f"Falha HTTP {err.code} ao renovar token: {err_body}"
        except Exception as exc:
            return False, f"Erro inesperado ao renovar token: {exc}"

    def ensure_active_token(self) -> Tuple[bool, Optional[str]]:
        """Garante que há um token de acesso válido, renovando se expirado e migrando health_user_id se ausente."""
        if not self.is_authenticated():
            return False, "Credenciais ausentes ou reautenticação necessária."

        now = datetime.now(timezone.utc)
        # Renova se não houver access_token ou se expirar em menos de 60 segundos
        if (
            not self.credentials.access_token
            or (self.credentials.expiry and (self.credentials.expiry - now).total_seconds() < 60)
        ):
            if self.credentials.refresh_token:
                ok, err = self.refresh_access_token()
                if not ok:
                    return False, err
            elif not self.credentials.access_token:
                return False, "Token de acesso expirado e refresh_token ausente."

        # Migração transparente de usuários existentes (P0.2):
        # Se autenticado mas sem health_user_id, busca e persiste sem exigir novo consentimento
        if not self.credentials.health_user_id:
            try:
                self.get_identity()
            except Exception as exc:
                logger.debug("Tentativa de migração de healthUserId em ensure_active_token falhou: %s", exc)

        return True, None

    def get_identity(self, access_token: Optional[str] = None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Executa GET https://health.googleapis.com/v4/users/me/identity (P0.1).
        Retorna dicionário contendo healthUserId e metadados, ou (None, erro).
        Atualiza e persiste health_user_id nas credenciais se disponíveis.
        """
        token = access_token
        if not token:
            if not self.credentials:
                return None, "Não autenticado no Google Health."
            if not self.credentials.access_token or (
                self.credentials.expiry
                and (self.credentials.expiry - datetime.now(timezone.utc)).total_seconds() < 30
            ):
                if self.credentials.refresh_token:
                    self.refresh_access_token()
            token = self.credentials.access_token

        if not token:
            return None, "Token de acesso ausente para obter identidade."

        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/identity"
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries + 1):
            req = Request(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                method="GET",
            )
            try:
                with _get_urlopen()(req, timeout=20) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    h_uid = data.get("healthUserId")
                    if self.credentials and h_uid:
                        self.credentials.health_user_id = h_uid
                        if self.token_path:
                            try:
                                self.credentials.save_to_file(self.token_path)
                            except Exception as save_err:
                                logger.warning("Falha ao persistir health_user_id: %s", save_err)
                    return data, None
            except HTTPError as err:
                err_body = err.read().decode("utf-8", errors="ignore")
                if err.code == 401 and not access_token and self.credentials and self.credentials.refresh_token:
                    ref_ok, _ = self.refresh_access_token()
                    if ref_ok and self.credentials:
                        token = self.credentials.access_token
                        continue
                if err.code == 403:
                    if "MISSING_OAUTH_SCOPE" in err_body or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_body:
                        return None, f"HTTP 403 MISSING_OAUTH_SCOPE: {err_body}"
                    return None, f"HTTP 403 (Permissão negada / Escopo não autorizado): {err_body}"
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    jitter = random.uniform(0.1, 0.4)
                    sleep_time = (base_delay * (2 ** attempt)) + jitter
                    pytime.sleep(sleep_time)
                    continue
                return None, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return None, str(exc)

        return None, "Limite de tentativas excedido na Google Health API ao obter identidade."

    def _get_json(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Executa requisição GET autenticada com retry exponencial, jitter e renovação de token."""
        if not self.credentials or not self.credentials.access_token:
            return None, "Não autenticado no Google Health."

        full_url = url
        if params:
            full_url = f"{url}?{urlencode(params, quote_via=quote)}"

        for attempt in range(max_retries + 1):
            req = Request(
                full_url,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Accept": "application/json",
                },
                method="GET",
            )

            try:
                with _get_urlopen()(req, timeout=20) as resp:
                    return json.loads(resp.read().decode("utf-8")), None
            except HTTPError as err:
                if err.code == 401 and self.credentials and self.credentials.refresh_token:
                    ref_ok, _ = self.refresh_access_token()
                    if ref_ok:
                        continue
                if err.code == 403:
                    err_body = err.read().decode("utf-8", errors="ignore")
                    if "MISSING_OAUTH_SCOPE" in err_body or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_body:
                        return None, f"HTTP 403 MISSING_OAUTH_SCOPE: {err_body}"
                    return None, f"HTTP 403 (Permissão negada / Escopo não autorizado): {err_body}"
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    jitter = random.uniform(0.1, 0.4)
                    sleep_time = (base_delay * (2 ** attempt)) + jitter
                    pytime.sleep(sleep_time)
                    continue

                err_body = err.read().decode("utf-8", errors="ignore")
                if "ACCOUNT_NOT_LINKED" in err_body:
                    return None, "Conta Google não vinculada ao ecossistema Google Health. Ative seu perfil em: https://fitbit.google.com/auth/signup"
                return None, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return None, str(exc)

        return None, "Limite de tentativas excedido na Google Health API."

    def _post_json(
        self,
        url: str,
        payload: Dict[str, Any],
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Executa requisição POST JSON autenticada com retry exponencial, jitter e renovação de token."""
        if not self.credentials or not self.credentials.access_token:
            return None, "Não autenticado no Google Health."

        post_data = json.dumps(payload).encode("utf-8")

        for attempt in range(max_retries + 1):
            req = Request(
                url,
                data=post_data,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                method="POST",
            )

            try:
                with _get_urlopen()(req, timeout=25) as resp:
                    raw = resp.read().decode("utf-8")
                    return json.loads(raw) if raw else {}, None
            except HTTPError as err:
                if err.code == 401 and self.credentials and self.credentials.refresh_token:
                    ref_ok, _ = self.refresh_access_token()
                    if ref_ok:
                        continue
                if err.code == 403:
                    err_body = err.read().decode("utf-8", errors="ignore")
                    if "MISSING_OAUTH_SCOPE" in err_body or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_body:
                        return None, f"HTTP 403 MISSING_OAUTH_SCOPE: {err_body}"
                    return None, f"HTTP 403 (Permissão negada / Escopo não autorizado): {err_body}"
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    jitter = random.uniform(0.1, 0.4)
                    sleep_time = (base_delay * (2 ** attempt)) + jitter
                    pytime.sleep(sleep_time)
                    continue

                err_body = err.read().decode("utf-8", errors="ignore")
                if "ACCOUNT_NOT_LINKED" in err_body:
                    return None, "Conta Google não vinculada ao ecossistema Google Health. Ative seu perfil em: https://fitbit.google.com/auth/signup"
                return None, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return None, str(exc)

        return None, "Limite de tentativas excedido na Google Health API."

    def _patch_json(
        self,
        url: str,
        payload: Dict[str, Any],
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Executa requisição PATCH JSON autenticada."""
        if not self.credentials or not self.credentials.access_token:
            return None, "Não autenticado no Google Health."

        full_url = url
        if params:
            full_url = f"{url}?{urlencode(params, quote_via=quote)}"

        post_data = json.dumps(payload).encode("utf-8")

        for attempt in range(max_retries + 1):
            req = Request(
                full_url,
                data=post_data,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                method="PATCH",
            )
            try:
                with _get_urlopen()(req, timeout=25) as resp:
                    raw = resp.read().decode("utf-8")
                    return json.loads(raw) if raw else {}, None
            except HTTPError as err:
                if err.code == 401 and self.credentials and self.credentials.refresh_token:
                    ref_ok, _ = self.refresh_access_token()
                    if ref_ok:
                        continue
                if err.code == 403:
                    err_body = err.read().decode("utf-8", errors="ignore")
                    if "MISSING_OAUTH_SCOPE" in err_body or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_body:
                        return None, f"HTTP 403 MISSING_OAUTH_SCOPE: {err_body}"
                    return None, f"HTTP 403 (Permissão negada / Escopo não autorizado): {err_body}"
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    jitter = random.uniform(0.1, 0.4)
                    sleep_time = (base_delay * (2 ** attempt)) + jitter
                    pytime.sleep(sleep_time)
                    continue
                err_body = err.read().decode("utf-8", errors="ignore")
                return None, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return None, str(exc)

        return None, "Limite de tentativas excedido na Google Health API."

    def _delete(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> Tuple[bool, Optional[str]]:
        """Executa requisição DELETE autenticada."""
        if not self.credentials or not self.credentials.access_token:
            return False, "Não autenticado no Google Health."

        full_url = url
        if params:
            full_url = f"{url}?{urlencode(params, quote_via=quote)}"

        for attempt in range(max_retries + 1):
            req = Request(
                full_url,
                headers={
                    "Authorization": f"Bearer {self.credentials.access_token}",
                    "Accept": "application/json",
                },
                method="DELETE",
            )
            try:
                with _get_urlopen()(req, timeout=20) as resp:
                    return True, None
            except HTTPError as err:
                if err.code == 401 and self.credentials and self.credentials.refresh_token:
                    ref_ok, _ = self.refresh_access_token()
                    if ref_ok:
                        continue
                if err.code == 403:
                    err_body = err.read().decode("utf-8", errors="ignore")
                    if "MISSING_OAUTH_SCOPE" in err_body or "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_body:
                        return False, f"HTTP 403 MISSING_OAUTH_SCOPE: {err_body}"
                    return False, f"HTTP 403 (Permissão negada / Escopo não autorizado): {err_body}"
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    jitter = random.uniform(0.1, 0.4)
                    sleep_time = (base_delay * (2 ** attempt)) + jitter
                    pytime.sleep(sleep_time)
                    continue
                err_body = err.read().decode("utf-8", errors="ignore")
                return False, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return False, str(exc)

        return False, "Limite de tentativas excedido na Google Health API."

    def _resolve_project_number(
        self,
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolve o Google Cloud Project Number obrigatório para operações de subscriber na Google Health API v4.
        A documentação oficial exige o Project Number numérico da GCP (diferente de project ID e client_id).
        Retorna (project_number, None) ou (None, mensagem_de_erro).
        """
        candidate = project_number or project_id
        if candidate and str(candidate).strip():
            return str(candidate).strip(), None

        env_num = os.environ.get("GOOGLE_HEALTH_PROJECT_NUMBER")
        if env_num and env_num.strip():
            return env_num.strip(), None

        if self.credentials and getattr(self.credentials, "project_number", None) and str(self.credentials.project_number).strip():
            return str(self.credentials.project_number).strip(), None

        # Fallback legado para GOOGLE_HEALTH_PROJECT_ID se configurado explicitamente no ambiente
        env_proj = os.environ.get("GOOGLE_HEALTH_PROJECT_ID")
        if env_proj and env_proj.strip():
            return env_proj.strip(), None

        return None, (
            "GOOGLE_HEALTH_PROJECT_NUMBER é obrigatório para operações de subscriber na Google Health API v4. "
            "Defina a variável de ambiente GOOGLE_HEALTH_PROJECT_NUMBER ou informe project_number explicitamente."
        )

    def _resolve_project_id(self, project_id: Optional[str] = None) -> str:
        """Alias de compatibilidade retroativa para resolução de projeto."""
        proj, _ = self._resolve_project_number(project_id=project_id)
        return proj or "default-project"

    # ── Subscriber Lifecycle (P1.5) ─────────────────────────────────────
    def create_subscriber(
        self,
        endpoint_uri: str,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
        endpoint_auth: Optional[str | Dict[str, Any]] = None,
        subscription_create_policy: str = "AUTOMATIC",
        data_types: Optional[List[str]] = None,
        subscriber_configs: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Cria um recurso subscriber (projects/{project_number}/subscribers/{subscriber}) na Google Health API v4.
        
        Segue o contrato canônico oficial:
        {
          "endpointUri": "https://...",
          "subscriberConfigs": [
            {
              "dataTypes": ["steps", "distance", ...],
              "subscriptionCreatePolicy": "AUTOMATIC"
            }
          ],
          "endpointAuthorization": {
            "secret": "Bearer ..."
          }
        }
        """
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err

        if subscriber_configs is not None:
            configs = subscriber_configs
        else:
            types = data_types or GoogleHealthDataTypeRegistry.get_webhook_supported_types()
            configs = [
                {
                    "dataTypes": list(types),
                    "subscriptionCreatePolicy": subscription_create_policy,
                }
            ]

        payload: Dict[str, Any] = {
            "endpointUri": endpoint_uri,
            "subscriberConfigs": configs,
        }

        if endpoint_auth:
            if isinstance(endpoint_auth, dict):
                payload["endpointAuthorization"] = endpoint_auth
            else:
                payload["endpointAuthorization"] = {"secret": str(endpoint_auth)}

        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers"
        params = {"subscriberId": subscriber_id}
        full_url = f"{url}?{urlencode(params, quote_via=quote)}"
        return self._post_json(full_url, payload)

    def get_subscriber(
        self,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Recupera metadados de um subscriber existente."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err
        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}"
        return self._get_json(url)

    def list_subscribers(
        self,
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
        """Lista os subscribers do projeto Google Cloud."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err
        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers"
        data, err = self._get_json(url)
        if err:
            return None, err
        return data.get("subscribers", []) if isinstance(data, dict) else [], None

    def update_subscriber(
        self,
        endpoint_uri: Optional[str] = None,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
        endpoint_auth: Optional[str | Dict[str, Any]] = None,
        subscription_create_policy: Optional[str] = None,
        data_types: Optional[List[str]] = None,
        subscriber_configs: Optional[List[Dict[str, Any]]] = None,
        update_mask: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Atualiza a configuração de um subscriber existente (PATCH)."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err

        payload: Dict[str, Any] = {}
        if endpoint_uri:
            payload["endpointUri"] = endpoint_uri

        if subscriber_configs is not None:
            payload["subscriberConfigs"] = subscriber_configs
        elif data_types is not None or subscription_create_policy is not None:
            types = data_types or GoogleHealthDataTypeRegistry.get_webhook_supported_types()
            policy = subscription_create_policy or "AUTOMATIC"
            payload["subscriberConfigs"] = [
                {
                    "dataTypes": list(types),
                    "subscriptionCreatePolicy": policy,
                }
            ]

        if endpoint_auth:
            if isinstance(endpoint_auth, dict):
                payload["endpointAuthorization"] = endpoint_auth
            else:
                payload["endpointAuthorization"] = {"secret": str(endpoint_auth)}

        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}"
        params = {"updateMask": update_mask} if update_mask else None
        return self._patch_json(url, payload, params=params)

    def delete_subscriber(
        self,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Remove um subscriber cadastrado."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return False, err
        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}"
        return self._delete(url)

    # ── Subscription Lifecycle (P1.5) ───────────────────────────────────
    def create_subscription(
        self,
        data_type: str | List[str],
        subscription_id: str,
        health_user_id: Optional[str] = None,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Cria manualmente uma subscription para um usuário específico (MANUAL subscriptions).
        
        Segue o contrato canônico oficial da Google Health API v4:
        {
          "user": "users/{healthUserId}",
          "dataTypes": [
            "users/{healthUserId}/dataTypes/{dataType}"
          ]
        }
        """
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err

        h_uid = health_user_id or (self.credentials.health_user_id if self.credentials else None)
        if not h_uid:
            return None, (
                "health_user_id é obrigatório para CreateSubscription na Google Health API v4. "
                "Informe health_user_id ou certifique-se de que as credenciais do usuário contenham health_user_id."
            )

        clean_uid = h_uid.replace("users/", "").strip()
        user_resource = f"users/{clean_uid}"

        if isinstance(data_type, list):
            dt_list = data_type
        else:
            dt_list = [data_type]

        formatted_types = []
        for dt in dt_list:
            clean_dt = dt.split("/")[-1].strip()
            formatted_types.append(f"{user_resource}/dataTypes/{clean_dt}")

        payload = {
            "user": user_resource,
            "dataTypes": formatted_types,
        }

        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}/subscriptions"
        params = {"subscriptionId": subscription_id}
        full_url = f"{url}?{urlencode(params, quote_via=quote)}"
        return self._post_json(full_url, payload)

    def list_subscriptions(
        self,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
        """Lista as subscriptions vinculadas a um subscriber."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return None, err
        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}/subscriptions"
        data, err = self._get_json(url)
        if err:
            return None, err
        return data.get("subscriptions", []) if isinstance(data, dict) else [], None

    def delete_subscription(
        self,
        subscription_id: str,
        subscriber_id: str = "longevidade-subscriber",
        project_number: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Remove uma subscription específica."""
        proj, err = self._resolve_project_number(project_number, project_id)
        if err:
            return False, err
        url = f"{GOOGLE_HEALTH_BASE_URL}/projects/{proj}/subscribers/{subscriber_id}/subscriptions/{subscription_id}"
        return self._delete(url)

    build_server_filter = staticmethod(build_server_filter)

    def fetch_data_points(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_size: int = 1000,
        chunk_days: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Busca dataPoints com paginação transparente, filtro server-side e validação defensiva."""
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints"
        params: Dict[str, Any] = {"pageSize": page_size}

        try:
            server_filter = build_server_filter(start_time, end_time, data_type=data_type)
        except ValueError as exc:
            return [], str(exc)

        if server_filter:
            params["filter"] = server_filter

        all_points: List[Dict[str, Any]] = []
        next_page_token = None

        while True:
            call_params = dict(params)
            if next_page_token:
                call_params["pageToken"] = next_page_token

            data, err = self._get_json(url, call_params)
            if err and ("INVALID_DATA_POINT_FILTER" in err or "INVALID_ARGUMENT" in err) and "filter" in call_params:
                logger.warning(
                    "Filtro server-side rejeitado pela Google Health API para %s (%s). Retentando sem filtro com validação client-side.",
                    data_type,
                    err,
                )
                fallback_params = dict(call_params)
                fallback_params.pop("filter", None)
                data, err = self._get_json(url, fallback_params)
                if not err:
                    params.pop("filter", None)

            if err:
                return all_points, err
            if not data:
                break

            points = data.get("dataPoints", [])
            for pt in points:
                if is_point_in_interval(pt, start_time, end_time, field_key=data_type):
                    all_points.append(pt)

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

        return all_points, None

    def list(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_size: int = 1000,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Listagem canônica de dataPoints (alias para fetch_data_points com filtro server-side)."""
        return self.fetch_data_points(data_type, start_time=start_time, end_time=end_time, page_size=page_size)

    def reconcile(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        data_source_family: Optional[str] = None,
        page_size: int = 1000,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Busca dataPoints reconciliados pela Google Health API (P1.1).
        Suporta filtro temporal server-side e dataSourceFamily opcional.
        """
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints:reconcile"
        params: Dict[str, Any] = {"pageSize": page_size}

        try:
            server_filter = build_server_filter(start_time, end_time, data_type=data_type)
        except ValueError as exc:
            return [], str(exc)

        if server_filter:
            params["filter"] = server_filter

        if data_source_family:
            params["dataSourceFamily"] = data_source_family

        all_points: List[Dict[str, Any]] = []
        next_page_token = None

        while True:
            call_params = dict(params)
            if next_page_token:
                call_params["pageToken"] = next_page_token

            data, err = self._get_json(url, call_params)
            if err and ("INVALID_DATA_POINT_FILTER" in err or "INVALID_ARGUMENT" in err) and "filter" in call_params:
                logger.warning(
                    "Filtro server-side em reconcile rejeitado pela Google Health API para %s (%s). Retentando sem filtro com validação client-side.",
                    data_type,
                    err,
                )
                fallback_params = dict(call_params)
                fallback_params.pop("filter", None)
                data, err = self._get_json(url, fallback_params)
                if not err:
                    params.pop("filter", None)

            if err:
                return all_points, err
            if not data:
                break

            points = data.get("dataPoints", []) or data.get("reconciledDataPoints", [])
            for pt in points:
                if is_point_in_interval(pt, start_time, end_time, field_key=data_type):
                    all_points.append(pt)

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

        return all_points, None

    def roll_up(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        window_size: str = "3600s",
        data_source_family: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Busca agregados/roll-up de dados da Google Health API via POST JSON (P1.2).
        
        Corpo JSON oficial:
        {
          "range": {"startTime": "...", "endTime": "..."},
          "windowSize": "3600s",
          "dataSourceFamily": "..." (opcional)
        }
        """
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints:rollUp"

        if not window_size or not window_size.endswith("s") or not window_size[:-1].isdigit():
            return [], f"windowSize inválido: {window_size}. Deve ser formato em segundos (ex: '3600s')"
        if int(window_size[:-1]) < 1:
            return [], "windowSize deve ser de pelo menos 1s"

        body: Dict[str, Any] = {
            "windowSize": window_size,
        }

        if start_time is not None or end_time is not None:
            if start_time is not None and end_time is not None:
                st_utc = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
                et_utc = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
                if st_utc >= et_utc:
                    return [], "start_time deve ser estritamente anterior a end_time"
            range_dict: Dict[str, Any] = {}
            if start_time is not None:
                range_dict["startTime"] = format_rfc3339_utc(start_time)
            if end_time is not None:
                range_dict["endTime"] = format_rfc3339_utc(end_time)
            body["range"] = range_dict

        if data_source_family:
            body["dataSourceFamily"] = data_source_family

        data, err = self._post_json(url, body)
        if err:
            return [], err
        if not data:
            return [], None

        aggs = data.get("rollupDataPoints", []) or data.get("aggregates", []) or data.get("dataPoints", [])
        return aggs, None

    def daily_roll_up(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        window_size_days: int = 1,
        data_source_family: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Busca roll-up diário para métricas agregadas da Google Health API via POST JSON (P1.3).
        Preserva a semântica de tempo civil (civilTime).
        
        Corpo JSON oficial:
        {
          "range": {
            "start": {"date": {"year": Y, "month": M, "day": D}, "time": {...}},
            "end": {"date": {"year": Y, "month": M, "day": D}, "time": {...}}
          },
          "windowSizeDays": 1,
          "dataSourceFamily": "..." (opcional)
        }
        """
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp"

        body: Dict[str, Any] = {
            "windowSizeDays": window_size_days,
        }

        if start_time is not None or end_time is not None:
            if start_time is not None and end_time is not None:
                st_utc = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
                et_utc = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
                if st_utc >= et_utc:
                    return [], "start_time deve ser estritamente anterior a end_time"

            range_dict: Dict[str, Any] = {}
            if start_time is not None:
                range_dict["start"] = {
                    "date": {"year": start_time.year, "month": start_time.month, "day": start_time.day},
                    "time": {
                        "hours": start_time.hour,
                        "minutes": start_time.minute,
                        "seconds": start_time.second,
                        "nanos": start_time.microsecond * 1000,
                    },
                }
            if end_time is not None:
                range_dict["end"] = {
                    "date": {"year": end_time.year, "month": end_time.month, "day": end_time.day},
                    "time": {
                        "hours": end_time.hour,
                        "minutes": end_time.minute,
                        "seconds": end_time.second,
                        "nanos": end_time.microsecond * 1000,
                    },
                }
            body["range"] = range_dict

        if data_source_family:
            body["dataSourceFamily"] = data_source_family

        data, err = self._post_json(url, body)
        if err:
            return [], err
        if not data:
            return [], None

        aggs = data.get("rollupDataPoints", []) or data.get("aggregates", []) or data.get("dataPoints", [])
        return aggs, None

    def fetch_daily_metrics_summary(
        self,
        days: int = 30,
        selected_types: Optional[List[str]] = None,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Coleta e agrega métricas diárias com suporte a consentimento parcial e persistência na camada raw."""
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(days=days)
        errors: List[str] = []

        daily_map: Dict[str, Dict[str, Any]] = {}

        for i in range(days + 1):
            d_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            daily_map[d_str] = {
                "date_ref": d_str,
                "source": "GoogleHealthAPI",
                "source_platform": "GoogleHealth_v4",
                "provider": "google_health",
            }

        candidate_types = set(selected_types) if selected_types else {
            "steps", "heart-rate", "daily-resting-heart-rate", "sleep", "weight", "body-fat", "oxygen-saturation", "heart-rate-variability"
        }

        # Filtrar tipos autorizados pelo usuário (Consentimento Parcial)
        authorized_scopes = set(self.credentials.scopes or []) if self.credentials else set()
        if authorized_scopes:
            types_to_fetch = set(GoogleHealthDataTypeRegistry.filter_types_by_scopes(candidate_types, authorized_scopes))
        else:
            types_to_fetch = candidate_types

        raw_points_collected: List[Dict[str, Any]] = []

        # 1. Passos (steps)
        if "steps" in types_to_fetch:
            steps_points, err = self.fetch_data_points("steps", start_time=start_time, end_time=now)
            if err:
                errors.append(f"steps: {err}")
            else:
                for pt in steps_points:
                    raw_points_collected.append(_build_raw_point("steps", pt))
                    st = _extract_date_ref_from_point(pt, "steps")
                    val = pt.get("steps", {}).get("count") or pt.get("steps", {}).get("stepsCount") or pt.get("value")
                    if st and st in daily_map and val is not None:
                        daily_map[st]["steps"] = daily_map[st].get("steps", 0) + int(val)
                        if "dataSource" in pt and "source_device" not in daily_map[st]:
                            daily_map[st]["source_device"] = pt.get("dataSource", {}).get("platform")

        # 2. Frequência Cardíaca (heart-rate)
        if "heart-rate" in types_to_fetch:
            hr_points, err = self.fetch_data_points("heart-rate", start_time=start_time, end_time=now)
            if err:
                errors.append(f"heart-rate: {err}")
            else:
                for pt in hr_points:
                    raw_points_collected.append(_build_raw_point("heart-rate", pt))
                hr_by_date: Dict[str, List[float]] = {}
                for pt in hr_points:
                    st = _extract_date_ref_from_point(pt, "heart_rate") or _extract_date_ref_from_point(pt, "heart-rate")
                    bpm = pt.get("heartRate", {}).get("bpm") or pt.get("heart_rate", {}).get("bpm") or pt.get("value")
                    if st and st in daily_map and bpm is not None:
                        hr_by_date.setdefault(st, []).append(float(bpm))

                for d_str, bpms in hr_by_date.items():
                    if bpms:
                        daily_map[d_str]["avg_hr_bpm"] = round(sum(bpms) / len(bpms), 1)
                        daily_map[d_str]["max_hr_bpm"] = round(max(bpms), 1)

        # 2b. Frequência Cardíaca de Repouso Oficial (daily-resting-heart-rate)
        if "daily-resting-heart-rate" in types_to_fetch:
            rhr_points, err = self.fetch_data_points("daily-resting-heart-rate", start_time=start_time, end_time=now)
            if err:
                errors.append(f"daily-resting-heart-rate: {err}")
            else:
                for pt in rhr_points:
                    raw_points_collected.append(_build_raw_point("daily-resting-heart-rate", pt))
                    st = _extract_date_ref_from_point(pt, "daily_resting_heart_rate") or _extract_date_ref_from_point(pt, "daily-resting-heart-rate")
                    rhr_obj = pt.get("dailyRestingHeartRate") or pt.get("daily_resting_heart_rate") or pt.get("restingHeartRate") or {}
                    val = rhr_obj.get("bpm") or rhr_obj.get("value") or pt.get("value")
                    if st and st in daily_map and val is not None:
                        daily_map[st]["rhr_bpm"] = round(float(val), 1)

        # 3. Sono (sleep) com estágios
        if "sleep" in types_to_fetch:
            sleep_points, err = self.fetch_data_points("sleep", start_time=start_time, end_time=now)
            if err:
                errors.append(f"sleep: {err}")
            else:
                for pt in sleep_points:
                    raw_points_collected.append(_build_raw_point("sleep", pt))
                    st = _extract_date_ref_from_point(pt, "sleep")
                    if not st or st not in daily_map:
                        continue

                    sleep_data = pt.get("sleep", {})
                    duration_min = sleep_data.get("durationMinutes")
                    if duration_min is not None:
                        daily_map[st]["sleep_minutes"] = int(duration_min)

                    stages = sleep_data.get("stages", {})
                    if "deepMinutes" in stages:
                        daily_map[st]["sleep_deep_min"] = int(stages["deepMinutes"])
                    if "remMinutes" in stages:
                        daily_map[st]["sleep_rem_min"] = int(stages["remMinutes"])
                    if "lightMinutes" in stages:
                        daily_map[st]["sleep_light_min"] = int(stages["lightMinutes"])
                    if "awakeMinutes" in stages:
                        daily_map[st]["sleep_awake_min"] = int(stages["awakeMinutes"])

        # 4. SpO2 (oxygen-saturation ou daily-oxygen-saturation)
        if "oxygen-saturation" in types_to_fetch or "daily-oxygen-saturation" in types_to_fetch:
            target_sp = "daily-oxygen-saturation" if "daily-oxygen-saturation" in types_to_fetch else "oxygen-saturation"
            spo2_points, err = self.fetch_data_points(target_sp, start_time=start_time, end_time=now)
            if err:
                errors.append(f"oxygen-saturation: {err}")
            else:
                for pt in spo2_points:
                    raw_points_collected.append(_build_raw_point("oxygen-saturation", pt))
                spo2_by_date: Dict[str, List[float]] = {}
                for pt in spo2_points:
                    st = _extract_date_ref_from_point(pt, "oxygen_saturation") or _extract_date_ref_from_point(pt, "oxygen-saturation")
                    pct = pt.get("oxygenSaturation", {}).get("percentage") or pt.get("oxygen_saturation", {}).get("percentage") or pt.get("value")
                    if st and st in daily_map and pct is not None:
                        spo2_by_date.setdefault(st, []).append(float(pct))

                for d_str, vals in spo2_by_date.items():
                    if vals:
                        daily_map[d_str]["spo2_avg_pct"] = round(sum(vals) / len(vals), 1)
                        daily_map[d_str]["spo2_min_pct"] = round(min(vals), 1)

        # 5. Peso Corporal (weight em gramas ou kg)
        if "weight" in types_to_fetch:
            weight_points, err = self.fetch_data_points("weight", start_time=start_time, end_time=now)
            if err:
                errors.append(f"weight: {err}")
            else:
                for pt in weight_points:
                    raw_points_collected.append(_build_raw_point("weight", pt))
                    st = _extract_date_ref_from_point(pt, "weight")
                    w_obj = pt.get("weight", {})
                    kg = None
                    if "weightGrams" in w_obj:
                        kg = float(w_obj["weightGrams"]) / 1000.0
                    elif "kilograms" in w_obj:
                        kg = float(w_obj["kilograms"])
                    elif "value" in pt:
                        kg = float(pt["value"])

                    if st and kg is not None:
                        if st not in daily_map:
                            daily_map[st] = {
                                "date_ref": st,
                                "source": "GoogleHealthAPI",
                                "source_platform": "GoogleHealth_v4",
                                "provider": "google_health",
                            }
                        daily_map[st]["weight_kg"] = round(kg, 2)
                        if "dataSource" in pt and "source_device" not in daily_map[st]:
                            daily_map[st]["source_device"] = pt.get("dataSource", {}).get("platform")

        # 5b. Percentual de Gordura Corporal (body-fat)
        if "body-fat" in types_to_fetch or "body_fat" in types_to_fetch:
            target_bf = "body-fat" if "body-fat" in types_to_fetch else "body_fat"
            fat_points, err = self.fetch_data_points(target_bf, start_time=start_time, end_time=now)
            if err:
                errors.append(f"body-fat: {err}")
            else:
                for pt in fat_points:
                    raw_points_collected.append(_build_raw_point("body-fat", pt))
                    st = _extract_date_ref_from_point(pt, "bodyFat") or _extract_date_ref_from_point(pt, "body-fat") or _extract_date_ref_from_point(pt, "body_fat")
                    bf_obj = pt.get("bodyFat") or pt.get("body_fat") or pt.get("body-fat") or {}
                    pct = bf_obj.get("percentage") or bf_obj.get("value") or pt.get("value")
                    if st and pct is not None:
                        if st not in daily_map:
                            daily_map[st] = {
                                "date_ref": st,
                                "source": "GoogleHealthAPI",
                                "source_platform": "GoogleHealth_v4",
                                "provider": "google_health",
                            }
                        daily_map[st]["body_fat_pct"] = round(float(pct), 2)
                        if "dataSource" in pt and "source_device" not in daily_map[st]:
                            daily_map[st]["source_device"] = pt.get("dataSource", {}).get("platform")

        # 6. Variabilidade de Frequência Cardíaca (heart-rate-variability)
        if "heart-rate-variability" in types_to_fetch or "daily-heart-rate-variability" in types_to_fetch:
            target_hrv = "daily-heart-rate-variability" if "daily-heart-rate-variability" in types_to_fetch else "heart-rate-variability"
            hrv_points, err = self.fetch_data_points(target_hrv, start_time=start_time, end_time=now)
            if not err:
                for pt in hrv_points:
                    raw_points_collected.append(_build_raw_point("heart-rate-variability", pt))
                hrv_by_date: Dict[str, List[float]] = {}
                for pt in hrv_points:
                    st = _extract_date_ref_from_point(pt, "heart_rate_variability") or _extract_date_ref_from_point(pt, "heart-rate-variability")
                    ms = pt.get("heartRateVariability", {}).get("rmssdMs") or pt.get("heart_rate_variability", {}).get("rmssdMs") or pt.get("value")
                    if st and st in daily_map and ms is not None:
                        hrv_by_date.setdefault(st, []).append(float(ms))

                for d_str, vals in hrv_by_date.items():
                    if vals:
                        daily_map[d_str]["hrv_ms"] = round(sum(vals) / len(vals), 1)

        self.last_collected_raw_points = raw_points_collected

        valid_records = [
            rec for rec in daily_map.values()
            if any(k not in ("date_ref", "source", "source_platform", "source_device", "provider") and v is not None for k, v in rec.items())
        ]
        valid_records.sort(key=lambda x: x["date_ref"], reverse=True)

        return valid_records, errors
