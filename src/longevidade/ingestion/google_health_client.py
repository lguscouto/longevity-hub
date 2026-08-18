"""
Cliente para a Google Health API v4 (https://health.googleapis.com/v4).

Conforme Relatório Técnico de Migração:
- Autenticação OAuth 2.0 com renovação automática e detecção de reauthentication_required.
- Scopes completos: activity_and_fitness, health_metrics_and_measurements, sleep.
- Paginação automática (pageToken) e Chunking temporal para dados densos.
- Remoção de blood-pressure da Fase 1 (não suportado na v4 atual).
- Priorização de POC (steps, heart-rate, sleep, weight) + Expansão (HRV, SpO2, RHR, etc.).
- Preservação de metadados de origem (source_platform, source_device).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


GOOGLE_HEALTH_BASE_URL = "https://health.googleapis.com/v4"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_HEALTH_SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
]


@dataclass
class GoogleHealthCredentials:
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_uri: str = GOOGLE_OAUTH_TOKEN_URL
    expiry: Optional[datetime] = None
    scopes: List[str] = field(default_factory=lambda: list(GOOGLE_HEALTH_SCOPES))
    reauthentication_required: bool = False
    last_error: Optional[str] = None

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


class GoogleHealthClient:
    """Cliente para a Google Health API v4 com chunking, paginação e tolerância a falhas."""

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
            # Se for 400 invalid_grant, o refresh token foi revogado ou expirou
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

    def _get_json(self, url: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Executa chamada GET autenticada."""
        valid, msg = self.ensure_valid_token()
        if not valid:
            return None, msg

        full_url = url
        if params:
            full_url = f"{url}?{urlencode(params)}"

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
                    req.headers["Authorization"] = f"Bearer {self.credentials.access_token}"
                    try:
                        with urlopen(req, timeout=20) as retry_resp:
                            return json.loads(retry_resp.read().decode("utf-8")), None
                    except Exception as retry_err:
                        return None, f"Erro após retry: {retry_err}"
            err_body = err.read().decode("utf-8", errors="ignore")
            if "ACCOUNT_NOT_LINKED" in err_body:
                return None, "Conta Google não vinculada ao ecossistema Google Health/Fitbit. Ative seu perfil em: https://fitbit.google.com/auth/signup"
            return None, f"HTTP {err.code}: {err_body}"
        except Exception as exc:
            return None, str(exc)

    def fetch_data_points(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_size: int = 1000,
        chunk_days: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Busca dataPoints com paginação e chunking temporal transparente."""
        if start_time and end_time and chunk_days and chunk_days > 0:
            # Chunking temporal: divide janelas grandes em blocos
            all_chunk_points: List[Dict[str, Any]] = []
            cur_start = start_time
            last_err = None

            while cur_start < end_time:
                cur_end = min(cur_start + timedelta(days=chunk_days), end_time)
                points, err = self._fetch_single_window_data_points(
                    data_type, cur_start, cur_end, page_size=page_size
                )
                if err:
                    last_err = err
                if points:
                    all_chunk_points.extend(points)
                cur_start = cur_end

            return all_chunk_points, last_err

        return self._fetch_single_window_data_points(data_type, start_time, end_time, page_size)

    def _fetch_single_window_data_points(
        self,
        data_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_size: int = 1000,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        url = f"{GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/{data_type}/dataPoints"
        params: Dict[str, Any] = {"pageSize": page_size}

        if start_time:
            params["filter"] = f'startTime >= "{start_time.isoformat()}"'
            if end_time:
                params["filter"] += f' AND endTime <= "{end_time.isoformat()}"'
        elif end_time:
            params["filter"] = f'endTime <= "{end_time.isoformat()}"'

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

        return all_points, None

    def fetch_daily_metrics_summary(
        self,
        days: int = 30,
        selected_types: Optional[List[str]] = None,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Coleta e agrega métricas diárias, cobrindo POC (steps, HR, sleep, weight) e Expansão."""
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
            }

        types_to_fetch = set(selected_types) if selected_types else {
            "steps", "heart-rate", "sleep", "weight", "oxygen-saturation", "heart-rate-variability"
        }

        # 1. Passos (steps)
        if "steps" in types_to_fetch:
            steps_points, err = self.fetch_data_points("steps", start_time=start_time, end_time=now, chunk_days=14)
            if err:
                errors.append(f"steps: {err}")
            else:
                for pt in steps_points:
                    st = pt.get("startTime", "")[:10]
                    val = pt.get("steps", {}).get("count") or pt.get("value")
                    if st in daily_map and val is not None:
                        daily_map[st]["steps"] = daily_map[st].get("steps", 0) + int(val)
                        if "dataSource" in pt and "source_device" not in daily_map[st]:
                            daily_map[st]["source_device"] = pt.get("dataSource")

        # 2. Frequência Cardíaca (heart-rate) & RHR
        if "heart-rate" in types_to_fetch:
            hr_points, err = self.fetch_data_points("heart-rate", start_time=start_time, end_time=now, chunk_days=7)
            if err:
                errors.append(f"heart-rate: {err}")
            else:
                hr_by_date: Dict[str, List[float]] = {}
                for pt in hr_points:
                    st = pt.get("startTime", "")[:10]
                    bpm = pt.get("heartRate", {}).get("bpm") or pt.get("value")
                    if st in daily_map and bpm is not None:
                        hr_by_date.setdefault(st, []).append(float(bpm))

                for d_str, bpms in hr_by_date.items():
                    if bpms:
                        daily_map[d_str]["avg_hr_bpm"] = round(sum(bpms) / len(bpms), 1)
                        daily_map[d_str]["rhr_bpm"] = round(min(bpms), 1)
                        daily_map[d_str]["max_hr_bpm"] = round(max(bpms), 1)

        # 3. Sono (sleep) com estágios
        if "sleep" in types_to_fetch:
            sleep_points, err = self.fetch_data_points("sleep", start_time=start_time, end_time=now, chunk_days=14)
            if err:
                errors.append(f"sleep: {err}")
            else:
                for pt in sleep_points:
                    st = pt.get("startTime", "")[:10]
                    if st not in daily_map:
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
            spo2_points, err = self.fetch_data_points("oxygen-saturation", start_time=start_time, end_time=now, chunk_days=14)
            if err:
                errors.append(f"oxygen-saturation: {err}")
            else:
                spo2_by_date: Dict[str, List[float]] = {}
                for pt in spo2_points:
                    st = pt.get("startTime", "")[:10]
                    pct = pt.get("oxygenSaturation", {}).get("percentage") or pt.get("value")
                    if st in daily_map and pct is not None:
                        spo2_by_date.setdefault(st, []).append(float(pct))

                for d_str, vals in spo2_by_date.items():
                    if vals:
                        daily_map[d_str]["spo2_avg_pct"] = round(sum(vals) / len(vals), 1)
                        daily_map[d_str]["spo2_min_pct"] = round(min(vals), 1)

        # 5. Peso Corporal (weight)
        if "weight" in types_to_fetch:
            weight_points, err = self.fetch_data_points("weight", start_time=start_time, end_time=now, chunk_days=30)
            if err:
                errors.append(f"weight: {err}")
            else:
                for pt in weight_points:
                    st = pt.get("startTime", "")[:10]
                    kg = pt.get("weight", {}).get("kilograms") or pt.get("value")
                    if st in daily_map and kg is not None:
                        daily_map[st]["weight_kg"] = round(float(kg), 2)

        # 6. Variabilidade de Frequência Cardíaca (heart-rate-variability)
        if "heart-rate-variability" in types_to_fetch:
            hrv_points, err = self.fetch_data_points("heart-rate-variability", start_time=start_time, end_time=now, chunk_days=14)
            if not err:
                hrv_by_date: Dict[str, List[float]] = {}
                for pt in hrv_points:
                    st = pt.get("startTime", "")[:10]
                    ms = pt.get("heartRateVariability", {}).get("rmssdMs") or pt.get("value")
                    if st in daily_map and ms is not None:
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
