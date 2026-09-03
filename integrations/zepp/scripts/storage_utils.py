"""
Utilitários de persistência atômica e integridade de dados para o Amazfit / Zepp Sync.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional


def is_valid_payload(payload: Any) -> bool:
    """Valida se o payload recebido é um dicionário e não contém erro."""
    if not isinstance(payload, dict):
        return False
    if "error" in payload or payload.get("returncode", 0) != 0:
        return False
    return True


def atomic_write_json(path: Path | str, data: Any, indent: int = 2) -> Path:
    """
    Grava dados em formato JSON de forma atômica no disco.
    Usa um arquivo .tmp temporário no mesmo diretório, faz flush + fsync
    e substitui o destino via os.replace().
    """
    target_path = Path(path).resolve()
    target_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = target_path.with_name(f".{target_path.name}.tmp")

    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=indent, default=str)
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_path, target_path)
    except Exception:
        if temp_path.is_file():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise

    return target_path


def safe_load_json(path: Path | str) -> Optional[Any]:
    """Lê um arquivo JSON com segurança, retornando None se o arquivo não existir ou estiver corrompido."""
    p = Path(path)
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def merge_health_payload(existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Realiza o merge idempotente entre payload existente e novos dados recebidos,
    preservando entradas históricas por chaves identificadoras.
    """
    if not isinstance(existing, dict) or not isinstance(new_data, dict):
        return new_data if isinstance(new_data, dict) else (existing if isinstance(existing, dict) else {})

    merged = dict(existing)
    merged.update(new_data)

    # Merge para band_data (campo "data")
    if "data" in new_data and isinstance(new_data["data"], list) and "data" in existing and isinstance(existing["data"], list):
        seen = {}
        for item in existing["data"]:
            if isinstance(item, dict):
                key = str(item.get("date_time") or item.get("date") or item.get("dayId") or str(item))
                seen[key] = item
        for item in new_data["data"]:
            if isinstance(item, dict):
                key = str(item.get("date_time") or item.get("date") or item.get("dayId") or str(item))
                seen[key] = item
        merged["data"] = list(seen.values())

    # Merge para endpoints baseados em "items"
    elif "items" in new_data and isinstance(new_data["items"], list) and "items" in existing and isinstance(existing["items"], list):
        seen = {}
        for item in existing["items"]:
            if isinstance(item, dict):
                key = str(item.get("timestamp") or item.get("generatedTime") or item.get("createTime") or item.get("date_time") or item.get("id") or str(item))
                seen[key] = item
        for item in new_data["items"]:
            if isinstance(item, dict):
                key = str(item.get("timestamp") or item.get("generatedTime") or item.get("createTime") or item.get("date_time") or item.get("id") or str(item))
                seen[key] = item
        merged["items"] = list(seen.values())

    # Merge para workout_history (resumo em data.summary)
    elif "data" in new_data and isinstance(new_data.get("data"), dict) and "data" in existing and isinstance(existing.get("data"), dict):
        new_summary = new_data["data"].get("summary")
        ex_summary = existing["data"].get("summary")
        if isinstance(new_summary, list) and isinstance(ex_summary, list):
            seen_tracks = {}
            for item in ex_summary:
                if isinstance(item, dict):
                    track_id = str(item.get("trackid") or item.get("trackId") or str(item))
                    seen_tracks[track_id] = item
            for item in new_summary:
                if isinstance(item, dict):
                    track_id = str(item.get("trackid") or item.get("trackId") or str(item))
                    seen_tracks[track_id] = item
            merged["data"] = dict(new_data["data"])
            merged["data"]["summary"] = list(seen_tracks.values())

    return merged
