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
from urllib.parse import urlencode
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


def build_server_filter(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> Optional[str]:
    """
    Constrói a expressão de filtro temporal server-side para a Google Health API v4.
    
    Regras da especificação:
    - Campos em snake_case: start_time e end_time
    - Datas formatadas em RFC 3339 UTC
    - Validação de que start_time < end_time quando ambos fornecidos
    """
    if start_time is not None and end_time is not None:
        st_utc = start_time if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
        et_utc = end_time if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)
        if st_utc >= et_utc:
            raise ValueError("start_time deve ser estritamente anterior a end_time")
        return f'start_time >= "{format_rfc3339_utc(start_time)}" AND end_time < "{format_rfc3339_utc(end_time)}"'
    if start_time is not None:
        return f'start_time >= "{format_rfc3339_utc(start_time)}"'
    if end_time is not None:
        return f'end_time < "{format_rfc3339_utc(end_time)}"'
    return None


def parse_point_timestamp_utc(pt: Dict[str, Any], field_key: Optional[str] = None) -> Optional[datetime]:
    """
    Extrai datetime UTC de alta precisão de um dataPoint da Google Health API.
    Preserva nanos/microssegundos e suporta physicalTime, startTime, recordedAt e civilTime.
    """
    data_obj = (pt.get(field_key) if field_key and isinstance(pt.get(field_key), dict) else None) or {}

    sample_time = data_obj.get("sampleTime") or pt.get("sampleTime") or {}
    interval = data_obj.get("interval") or pt.get("interval") or {}

    st_val = interval.get("startTime") if isinstance(interval, dict) else None
    st_phys = st_val.get("physicalTime") if isinstance(st_val, dict) else (st_val if isinstance(st_val, str) else None)

    phys = (
        (sample_time.get("physicalTime") if isinstance(sample_time, dict) else None)
        or st_phys
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
            full_url = f"{url}?{urlencode(params)}"

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
            server_filter = build_server_filter(start_time, end_time)
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
            if err:
                return all_points, err
            if not data:
                break

            points = data.get("dataPoints", [])
            for pt in points:
                if is_point_in_interval(pt, start_time, end_time):
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
            server_filter = build_server_filter(start_time, end_time)
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
            if err:
                return all_points, err
            if not data:
                break

            points = data.get("dataPoints", []) or data.get("reconciledDataPoints", [])
            for pt in points:
                if is_point_in_interval(pt, start_time, end_time):
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
            "steps", "heart-rate", "daily-resting-heart-rate", "sleep", "weight", "oxygen-saturation", "heart-rate-variability"
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

                    if st and st in daily_map and kg is not None:
                        daily_map[st]["weight_kg"] = round(kg, 2)
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
