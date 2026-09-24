"""
Cliente para a Google Health API v4 (https://health.googleapis.com/v4).

Conforme especificação técnica:
- Autenticação OAuth 2.0 com renovação automática e detecção de reauthentication_required.
- Scopes: activity_and_fitness, health_metrics_and_measurements, sleep.
- Paginação automática (pageToken) e extração de civilTime/physicalTime/interval.
- Normalização de tipos de dados (steps, heart-rate, sleep, weight em gramas/kg, SpO2, HRV).
- Preservação de metadados de origem (dataSource: platform, device, recordingMethod).
"""

from __future__ import annotations

import json
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


from longevidade.ingestion.google_health_registry import (
    GoogleHealthDataTypeRegistry,
    SCOPE_ACTIVITY,
    SCOPE_HEALTH_METRICS,
    SCOPE_SLEEP,
    SCOPE_NUTRITION,
    SCOPE_CATEGORY_MAP,
)

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


class GoogleHealthClient:
    """Cliente para a Google Health API v4 com suporte completo a payloads REST v4."""

    def __init__(
        self,
        credentials: Optional[GoogleHealthCredentials] = None,
        token_path: Optional[str | Path] = None,
    ):
        self.token_path = Path(token_path) if token_path else get_default_token_path()
        self.credentials = credentials or GoogleHealthCredentials.from_file(self.token_path)

    def is_authenticated(self) -> bool:
        """Verifica se há credenciais válidas configuradas."""
        if not self.credentials:
            return False
        if self.credentials.reauthentication_required:
            return False
        return bool(self.credentials.access_token or self.credentials.refresh_token)

    def is_reauthentication_required(self) -> bool:
        """Indica se a sessão expirou irreversivelmente e necessita novo consentimento."""
        return bool(self.credentials and self.credentials.reauthentication_required)

    def refresh_access_token(self) -> Tuple[bool, str]:
        """Renova o access_token usando o refresh_token."""
        if not self.credentials or not self.credentials.refresh_token:
            if self.credentials:
                self.credentials.reauthentication_required = True
                self.credentials.last_error = "Nenhum refresh_token disponível para renovação."
                if self.token_path:
                    self.credentials.save_to_file(self.token_path)
            return False, "Nenhum refresh_token disponível para renovação."

        if not self.credentials.client_id or not self.credentials.client_secret:
            return False, "client_id ou client_secret ausentes nas credenciais."

        data = {
            "client_id": self.credentials.client_id,
            "client_secret": self.credentials.client_secret,
            "refresh_token": self.credentials.refresh_token,
            "grant_type": "refresh_token",
        }

        req = Request(
            self.credentials.token_uri,
            data=urlencode(data).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        try:
            with urlopen(req, timeout=15) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                new_token = resp_data.get("access_token")
                expires_in = resp_data.get("expires_in", 3600)
                if not new_token:
                    return False, "Resposta de renovação não continha access_token."

                self.credentials.access_token = new_token
                self.credentials.expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                self.credentials.reauthentication_required = False
                self.credentials.last_error = None
                if self.token_path:
                    self.credentials.save_to_file(self.token_path)
                return True, "Token renovado com sucesso."
        except HTTPError as err:
            err_msg = err.read().decode("utf-8", errors="ignore")
            if err.code in (400, 401) and "invalid_grant" in err_msg.lower():
                self.credentials.reauthentication_required = True
                self.credentials.last_error = f"Refresh token inválido ou revogado: {err_msg}"
                if self.token_path:
                    self.credentials.save_to_file(self.token_path)
            return False, f"Erro HTTP {err.code} ao renovar token: {err_msg}"
        except Exception as exc:
            return False, f"Falha na requisição de renovação de token: {exc}"

    def ensure_valid_token(self) -> Tuple[bool, str]:
        """Garante que o access_token seja válido, renovando se necessário."""
        if not self.credentials:
            return False, "Credenciais não configuradas."

        if self.credentials.reauthentication_required:
            return False, f"Reautenticação necessária: {self.credentials.last_error or 'sessão expirada'}"

        if self.credentials.expiry and self.credentials.expiry <= datetime.now(timezone.utc) + timedelta(minutes=2):
            return self.refresh_access_token()

        if not self.credentials.access_token and self.credentials.refresh_token:
            return self.refresh_access_token()

        if self.credentials.access_token:
            return True, "Token válido."

        return False, "Nenhum token válido encontrado."

    def _get_json(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Executa chamada GET autenticada com retry, exponential backoff com jitter e tratamento de 401/403."""
        valid, msg = self.ensure_valid_token()
        if not valid:
            return None, msg

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
                with urlopen(req, timeout=20) as resp:
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
                    return None, "Conta Google não vinculada ao ecossistema Google Health/Fitbit. Ative seu perfil em: https://fitbit.google.com/auth/signup"
                return None, f"HTTP {err.code}: {err_body}"
            except Exception as exc:
                if attempt < max_retries:
                    pytime.sleep(base_delay * (attempt + 1))
                    continue
                return None, str(exc)

        return None, "Limite de tentativas excedido na Google Health API."

    def fetch_data_points(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_size: int = 1000,
        chunk_days: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Busca dataPoints com paginação transparente e filtro temporal."""
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints"
        params: Dict[str, Any] = {"pageSize": page_size}

        all_points: List[Dict[str, Any]] = []
        next_page_token = None

        while True:
            if next_page_token:
                params["pageToken"] = next_page_token

            data, err = self._get_json(url, params)
            if err:
                return all_points, err
            if not data:
                break

            points = data.get("dataPoints", [])
            all_points.extend(points)

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

        # Filtro temporal client-side (robusto e agnóstico ao schema do dataType)
        if start_time or end_time:
            min_date_str = start_time.strftime("%Y-%m-%d") if start_time else "1970-01-01"
            max_date_str = end_time.strftime("%Y-%m-%d") if end_time else "2099-12-31"

            field_name = data_type.replace("-", "_")
            filtered_points = []
            for pt in all_points:
                d_ref = _extract_date_ref_from_point(pt, field_name) or _extract_date_ref_from_point(pt, data_type)
                if d_ref:
                    if min_date_str <= d_ref <= max_date_str:
                        filtered_points.append(pt)
                else:
                    filtered_points.append(pt)
            return filtered_points, None

        return all_points, None

    def fetch_daily_metrics_summary(
        self,
        days: int = 30,
        selected_types: Optional[List[str]] = None,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Coleta e agrega métricas diárias, cobrindo POC e expansão com suporte a consentimento parcial."""
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
            "steps", "heart-rate", "sleep", "weight", "oxygen-saturation", "heart-rate-variability"
        }

        # Filtrar tipos autorizados pelo usuário (Consentimento Parcial)
        authorized_scopes = set(self.credentials.scopes or []) if self.credentials else set()
        if authorized_scopes:
            types_to_fetch = set(GoogleHealthDataTypeRegistry.filter_types_by_scopes(candidate_types, authorized_scopes))
        else:
            types_to_fetch = candidate_types

        # 1. Passos (steps)
        if "steps" in types_to_fetch:
            steps_points, err = self.fetch_data_points("steps", start_time=start_time, end_time=now)
            if err:
                errors.append(f"steps: {err}")
            else:
                for pt in steps_points:
                    st = _extract_date_ref_from_point(pt, "steps")
                    val = pt.get("steps", {}).get("count") or pt.get("steps", {}).get("stepsCount") or pt.get("value")
                    if st and st in daily_map and val is not None:
                        daily_map[st]["steps"] = daily_map[st].get("steps", 0) + int(val)
                        if "dataSource" in pt and "source_device" not in daily_map[st]:
                            daily_map[st]["source_device"] = pt.get("dataSource", {}).get("platform")

        # 2. Frequência Cardíaca (heart-rate) & RHR
        if "heart-rate" in types_to_fetch:
            hr_points, err = self.fetch_data_points("heart-rate", start_time=start_time, end_time=now)
            if err:
                errors.append(f"heart-rate: {err}")
            else:
                hr_by_date: Dict[str, List[float]] = {}
                for pt in hr_points:
                    st = _extract_date_ref_from_point(pt, "heart_rate") or _extract_date_ref_from_point(pt, "heart-rate")
                    bpm = pt.get("heartRate", {}).get("bpm") or pt.get("heart_rate", {}).get("bpm") or pt.get("value")
                    if st and st in daily_map and bpm is not None:
                        hr_by_date.setdefault(st, []).append(float(bpm))

                for d_str, bpms in hr_by_date.items():
                    if bpms:
                        daily_map[d_str]["avg_hr_bpm"] = round(sum(bpms) / len(bpms), 1)
                        daily_map[d_str]["rhr_bpm"] = round(min(bpms), 1)
                        daily_map[d_str]["max_hr_bpm"] = round(max(bpms), 1)

        # 3. Sono (sleep) com estágios
        if "sleep" in types_to_fetch:
            sleep_points, err = self.fetch_data_points("sleep", start_time=start_time, end_time=now)
            if err:
                errors.append(f"sleep: {err}")
            else:
                for pt in sleep_points:
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

        # 4. SpO2 (oxygen-saturation)
        if "oxygen-saturation" in types_to_fetch:
            spo2_points, err = self.fetch_data_points("oxygen-saturation", start_time=start_time, end_time=now)
            if err:
                errors.append(f"oxygen-saturation: {err}")
            else:
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
                    st = _extract_date_ref_from_point(pt, "weight")
                    w_obj = pt.get("weight", {})
                    # Google Health v4 retorna weightGrams (ex: 90000 = 90.0kg) ou kilograms
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
        if "heart-rate-variability" in types_to_fetch:
            hrv_points, err = self.fetch_data_points("heart-rate-variability", start_time=start_time, end_time=now)
            if not err:
                hrv_by_date: Dict[str, List[float]] = {}
                for pt in hrv_points:
                    st = _extract_date_ref_from_point(pt, "heart_rate_variability") or _extract_date_ref_from_point(pt, "heart-rate-variability")
                    ms = pt.get("heartRateVariability", {}).get("rmssdMs") or pt.get("heart_rate_variability", {}).get("rmssdMs") or pt.get("value")
                    if st and st in daily_map and ms is not None:
                        hrv_by_date.setdefault(st, []).append(float(ms))

                for d_str, vals in hrv_by_date.items():
                    if vals:
                        daily_map[d_str]["hrv_ms"] = round(sum(vals) / len(vals), 1)

        valid_records = [
            rec for rec in daily_map.values()
            if any(k not in ("date_ref", "source", "source_platform", "source_device") and v is not None for k, v in rec.items())
        ]
        valid_records.sort(key=lambda x: x["date_ref"], reverse=True)

        return valid_records, errors
