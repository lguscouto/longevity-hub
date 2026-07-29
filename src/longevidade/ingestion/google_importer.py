"""
Importador de dados do projeto Google Health Hub (Google Fit / Health Connect)
para o repositório Longevidade.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository


def _parse_timestamp_to_date_str(ts_ms: str | int | float) -> str | None:
    try:
        ts_sec = float(ts_ms) / 1000.0 if float(ts_ms) > 10_000_000_000 else float(ts_ms)
        return datetime.fromtimestamp(ts_sec, timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return None


def trigger_google_cloud_fetch(google_backend_dir: Path, days: int = 30) -> None:
    """Aciona o cliente do Google Fit para baixar retroativamente os dados da nuvem."""
    try:
        if str(google_backend_dir) not in sys.path:
            sys.path.insert(0, str(google_backend_dir))
        from google_fit_client import fetch_all_google_health
        fetch_all_google_health(days=days)
    except Exception:
        pass


def import_google_health_data(google_data_dir: str | Path, repo: LongevityRepository) -> int:
    """Aciona a busca na API do Google Fit e importa os JSONs acumulados."""
    data_dir = Path(google_data_dir)
    if not data_dir.exists():
        repo.log_pipeline_run("GoogleFit", 0, "AVISO", f"Diretório {data_dir} não existe")
        return 0

    google_backend_dir = data_dir.parent / "backend"
    if google_backend_dir.exists():
        trigger_google_cloud_fetch(google_backend_dir, days=30)

    daily_records: Dict[str, Dict[str, Any]] = {}

    def get_or_create(date_str: str) -> Dict[str, Any]:
        if date_str not in daily_records:
            daily_records[date_str] = {"date_ref": date_str, "source": "GoogleFit"}
        return daily_records[date_str]

    # 1. Passos (google_steps.json)
    steps_path = data_dir / "google_steps.json"
    if steps_path.is_file():
        try:
            payload = json.loads(steps_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    continue
                step_val = 0
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        for val in pt.get("value", []):
                            if "intVal" in val:
                                step_val += val["intVal"]
                            elif "fpVal" in val:
                                step_val += int(val["fpVal"])
                if step_val > 0:
                    get_or_create(dt_str)["steps"] = step_val
        except Exception:
            pass

    # 2. Pressão Arterial (google_blood_pressure.json)
    bp_path = data_dir / "google_blood_pressure.json"
    if bp_path.is_file():
        try:
            payload = json.loads(bp_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    continue
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        vals = pt.get("value", [])
                        if len(vals) >= 2:
                            sys_v = vals[0].get("fpVal") or vals[0].get("intVal")
                            dia_v = vals[1].get("fpVal") or vals[1].get("intVal")
                            if sys_v and dia_v:
                                rec = get_or_create(dt_str)
                                rec["systolic_bp"] = int(sys_v)
                                rec["diastolic_bp"] = int(dia_v)
        except Exception:
            pass

    # 3. Frequência Cardíaca (google_heart.json)
    heart_path = data_dir / "google_heart.json"
    if heart_path.is_file():
        try:
            payload = json.loads(heart_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    continue
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        for val in pt.get("value", []):
                            hr = val.get("fpVal") or val.get("intVal")
                            if hr:
                                get_or_create(dt_str)["rhr_bpm"] = float(hr)
        except Exception:
            pass

    count = 0
    for dt_str, rec in daily_records.items():
        if len(rec) > 2:
            repo.upsert_daily_metric(rec)
            count += 1

    repo.log_pipeline_run("GoogleFit", count, "SUCESSO", f"Importados/Reconciliados {count} registros do Google Fit")
    return count
