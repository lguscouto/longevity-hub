"""
Cliente para a Hevy Public API v1 (https://api.hevyapp.com/docs/).

Funcionalidades:
- Autenticação via header 'api-key'.
- Armazenamento seguro de credenciais via Keyring (Credential Manager) e fallback em arquivo local.
- Consulta de perfil e validação de token (/v1/user/info).
- Paginação completa de treinos (/v1/workouts) com cálculo de volume (kg), séries e reps.
- Eventos incrementais (/v1/workouts/events).
- Normalização determinística para o repositório SQLite.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HEVY_BASE_URL = "https://api.hevyapp.com/v1"
DEFAULT_HEVY_KEY = "c10ddad3-e147-496b-ba35-8a4db071708a"


def get_default_hevy_token_path() -> Path:
    """Local do arquivo de fallback para a chave de API do Hevy."""
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home) / "hevy_token.json"
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "hermes" / "hevy_token.json"
    return Path.home() / "AppData" / "Local" / "hermes" / "hevy_token.json"


class HevyCredentials:
    """Gerenciador seguro de credenciais da API do Hevy."""

    KEYRING_SERVICE = "longevidade.integrations"
    KEYRING_USERNAME = "hevy_api_key"

    @classmethod
    def get_api_key(cls, token_path: Optional[Path] = None) -> Optional[str]:
        # 1. Variável de ambiente (útil para testes e CI)
        env_key = os.environ.get("HEVY_API_KEY")
        if env_key and env_key.strip():
            return env_key.strip()

        # 2. Keyring do sistema operacional
        try:
            import keyring
            key = keyring.get_password(cls.KEYRING_SERVICE, cls.KEYRING_USERNAME)
            if key and key.strip():
                return key.strip()
        except Exception:
            pass

        # 3. Fallback em arquivo JSON local
        path = token_path or get_default_hevy_token_path()
        if path.is_file():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                key = data.get("api_key")
                if key and str(key).strip():
                    return str(key).strip()
            except Exception:
                pass

        # 4. Chave padrão do projeto fornecida pelo usuário
        return DEFAULT_HEVY_KEY

    @classmethod
    def save_api_key(cls, api_key: str, token_path: Optional[Path] = None) -> None:
        clean_key = api_key.strip()
        # Salva no Keyring
        try:
            import keyring
            keyring.set_password(cls.KEYRING_SERVICE, cls.KEYRING_USERNAME, clean_key)
        except Exception:
            pass

        # Salva também no arquivo de fallback local
        path = token_path or get_default_hevy_token_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"api_key": clean_key, "updated_at": datetime.now(timezone.utc).isoformat()}, indent=2), encoding="utf-8")

    @classmethod
    def delete_api_key(cls, token_path: Optional[Path] = None) -> None:
        try:
            import keyring
            keyring.delete_password(cls.KEYRING_SERVICE, cls.KEYRING_USERNAME)
        except Exception:
            pass
        path = token_path or get_default_hevy_token_path()
        if path.is_file():
            try:
                path.unlink(missing_ok=True)
            except Exception:
                pass


class HevyClient:
    """Cliente HTTP síncrono para a Hevy Public API."""

    def __init__(self, api_key: Optional[str] = None, token_path: Optional[Path] = None):
        self.token_path = token_path or get_default_hevy_token_path()
        self.api_key = api_key or HevyCredentials.get_api_key(self.token_path)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    def _request(self, endpoint: str, query_params: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        if not self.api_key:
            return None, "Chave da API do Hevy não configurada."

        url = f"{HEVY_BASE_URL}{endpoint}"
        if query_params:
            from urllib.parse import urlencode
            clean_params = {k: v for k, v in query_params.items() if v is not None}
            if clean_params:
                url = f"{url}?{urlencode(clean_params)}"

        req = Request(
            url,
            headers={
                "api-key": self.api_key,
                "accept": "application/json",
                "User-Agent": "LongevidadeHub/1.0",
            },
        )

        try:
            with urlopen(req, timeout=15) as res:
                content = res.read().decode("utf-8")
                return json.loads(content), None
        except HTTPError as err:
            body = err.read().decode("utf-8", errors="ignore")
            return None, f"Erro HTTP {err.code}: {body or err.reason}"
        except URLError as err:
            return None, f"Erro de rede: {err.reason}"
        except Exception as exc:
            return None, f"Erro inesperado: {exc}"

    def get_user_info(self) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Valida a conexão e retorna informações da conta Hevy."""
        return self._request("/user/info")

    def get_workout_count(self) -> Tuple[Optional[int], Optional[str]]:
        """Retorna o número total de treinos na conta."""
        data, err = self._request("/workouts/count")
        if err or not data:
            return None, err
        return data.get("workout_count", 0), None

    def fetch_workouts(self, page: int = 1, page_size: int = 10) -> Tuple[List[Dict[str, Any]], int, Optional[str]]:
        """Busca uma página de treinos do Hevy. Retorna (lista_treinos, total_paginas, erro)."""
        data, err = self._request("/workouts", {"page": page, "pageSize": min(page_size, 10)})
        if err or not data:
            return [], 0, err
        workouts = data.get("workouts", [])
        page_count = data.get("page_count", 1)
        return workouts, page_count, None

    def fetch_all_workouts(self, max_pages: int = 100) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """Varre todas as páginas de treinos do Hevy e agrega a lista completa."""
        all_workouts: List[Dict[str, Any]] = []
        page = 1
        total_pages = 1

        while page <= total_pages and page <= max_pages:
            workouts, page_count, err = self.fetch_workouts(page=page, page_size=10)
            if err:
                return all_workouts, err
            all_workouts.extend(workouts)
            total_pages = page_count
            page += 1

        return all_workouts, None


def normalize_hevy_workout(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforma o payload de um treino da API do Hevy em uma estrutura padronizada
    compatível com o LongevidadeRepository (tabela workouts + workout_exercises + workout_sets).
    """
    workout_id = str(raw.get("id"))
    title = raw.get("title") or "Treino Musculação"
    start_time_iso = raw.get("start_time") or ""
    end_time_iso = raw.get("end_time") or ""

    workout_date = "2026-01-01"
    workout_time = "00:00"
    duration_min = 0.0

    if start_time_iso:
        try:
            st = datetime.fromisoformat(start_time_iso.replace("Z", "+00:00"))
            workout_date = st.strftime("%Y-%m-%d")
            workout_time = st.strftime("%H:%M")
            if end_time_iso:
                et = datetime.fromisoformat(end_time_iso.replace("Z", "+00:00"))
                diff_sec = (et - st).total_seconds()
                if diff_sec > 0:
                    duration_min = round(diff_sec / 60.0, 1)
        except Exception:
            pass

    raw_exercises = raw.get("exercises") or []
    exercises_list: List[Dict[str, Any]] = []

    total_volume_kg = 0.0
    total_sets = 0
    total_reps = 0

    for ex_idx, raw_ex in enumerate(raw_exercises):
        ex_title = raw_ex.get("title") or f"Exercício #{ex_idx + 1}"
        ex_id = f"{workout_id}_{ex_idx}"
        raw_sets = raw_ex.get("sets") or []

        sets_list: List[Dict[str, Any]] = []
        for s_idx, raw_s in enumerate(raw_sets):
            w_kg = float(raw_s.get("weight_kg") or 0.0)
            reps = int(raw_s.get("reps") or 0)
            s_type = raw_s.get("set_type") or "normal"
            dist_m = float(raw_s["distance_meters"]) if raw_s.get("distance_meters") is not None else None
            dur_s = float(raw_s["duration_seconds"]) if raw_s.get("duration_seconds") is not None else None
            rpe = float(raw_s["rpe"]) if raw_s.get("rpe") is not None else None

            # Volume é calculado sobre séries de trabalho e normais
            total_volume_kg += (w_kg * reps)
            total_sets += 1
            total_reps += reps

            sets_list.append({
                "id": f"{ex_id}_{s_idx}",
                "exercise_id": ex_id,
                "workout_id": workout_id,
                "set_index": s_idx,
                "set_type": s_type,
                "weight_kg": w_kg,
                "reps": reps,
                "distance_meters": dist_m,
                "duration_seconds": dur_s,
                "rpe": rpe,
            })

        exercises_list.append({
            "id": ex_id,
            "workout_id": workout_id,
            "exercise_index": ex_idx,
            "title": ex_title,
            "exercise_template_id": raw_ex.get("exercise_template_id"),
            "notes": raw_ex.get("notes") or "",
            "sets": sets_list,
        })

    # Estimativa de calorias caso não venha na API do Hevy (base ~6 kcal/min para musculação)
    est_calories = int(duration_min * 6.0) if duration_min > 0 else 0

    return {
        "id": workout_id,
        "workout_date": workout_date,
        "workout_time": workout_time,
        "category": "Treino Força",
        "activity_type": "Musculação",
        "title": title,
        "duration_min": duration_min,
        "calories": est_calories,
        "distance_km": 0.0,
        "avg_hr": None,
        "max_hr": None,
        "training_effect": None,
        "steps": 0,
        "city": "",
        "device": "Hevy App",
        "raw_json": json.dumps(raw),
        "source": "Hevy",
        "volume_kg": round(total_volume_kg, 1),
        "sets_count": total_sets,
        "reps_count": total_reps,
        "exercises": exercises_list,
    }


def sync_hevy_workouts(
    repo: Any,
    client: Optional[HevyClient] = None,
    max_pages: int = 100,
) -> Dict[str, Any]:
    """
    Sincroniza treinos do Hevy para o repositório Longevidade.
    Retorna resultado auditável e registra a execução no pipeline.
    """
    hevy_client = client or HevyClient()

    if not hevy_client.is_configured():
        summary = "Chave da API do Hevy não configurada."
        repo.log_pipeline_run("Hevy", 0, "AVISO", summary)
        return {
            "status": "AVISO",
            "records_read": 0,
            "records_inserted": 0,
            "summary": summary,
            "exception_message": None,
        }

    raw_workouts, err = hevy_client.fetch_all_workouts(max_pages=max_pages)
    if err and not raw_workouts:
        summary = f"Falha na comunicação com a API do Hevy: {err}"
        repo.log_pipeline_run("Hevy", 0, "ERRO", summary)
        return {
            "status": "ERRO",
            "records_read": 0,
            "records_inserted": 0,
            "summary": summary,
            "exception_message": err,
        }

    normalized = [normalize_hevy_workout(w) for w in raw_workouts]
    inserted = repo.upsert_hevy_workouts(normalized)

    status = "SUCESSO" if not err else "AVISO"
    summary = f"Sincronizados {inserted} treinos do Hevy ({len(raw_workouts)} lidos)"
    if err:
        summary += f" | Advertência: {err}"

    repo.log_pipeline_run("Hevy", inserted, status, summary)

    return {
        "status": status,
        "records_read": len(raw_workouts),
        "records_inserted": inserted,
        "summary": summary,
        "exception_message": err,
    }
