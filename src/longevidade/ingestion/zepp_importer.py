"""
Importador de dados do projeto Zepp para o banco do Longevidade.
Aciona a coleta da nuvem Amazfit/Zepp e lê os snapshots diários.
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository


def _run_zepp_cron_background(zepp_scripts_dir: Path) -> None:
    cron_script = zepp_scripts_dir / "zepp_cron.py"
    if cron_script.is_file():
        try:
            subprocess.run(
                [sys.executable, str(cron_script)],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(zepp_scripts_dir.parent)
            )
        except Exception:
            pass


def trigger_zepp_cloud_fetch(zepp_scripts_dir: Path) -> None:
    """Aciona o script zepp_cron.py em segundo plano sem travar a requisição HTTP."""
    thread = threading.Thread(target=_run_zepp_cron_background, args=(zepp_scripts_dir,), daemon=True)
    thread.start()


def import_zepp_data(zepp_data_dir: str | Path, repo: LongevityRepository, days: int = 30) -> int:
    """Aciona a coleta da nuvem Zepp e importa as métricas para o repositório."""
    data_dir = Path(zepp_data_dir)
    if not data_dir.exists():
        repo.log_pipeline_run("Zepp", 0, "ERRO", f"Diretório {data_dir} não existe")
        return 0

    zepp_scripts_dir = data_dir.parent / "scripts"
    if zepp_scripts_dir.exists():
        # Aciona o download dos últimos dias da nuvem Amazfit/Zepp em segundo plano
        trigger_zepp_cloud_fetch(zepp_scripts_dir)

    try:
        if str(zepp_scripts_dir) not in sys.path:
            sys.path.insert(0, str(zepp_scripts_dir))
        from health_metrics import build_zepp_daily_record

        count = 0
        today = date.today()
        for i in range(days):
            ref = today - timedelta(days=i)
            rec = build_zepp_daily_record(data_dir, ref)
            if rec and (rec.get("passos_zepp") is not None or rec.get("sono_zepp_min") is not None or rec.get("fc_repouso_bpm") is not None):
                mapped = {
                    "date_ref": rec["data_referencia"],
                    "steps": rec.get("passos_zepp"),
                    "sleep_minutes": rec.get("sono_zepp_min"),
                    "sleep_deep_min": rec.get("sono_profundo_min"),
                    "sleep_light_min": rec.get("sono_leve_min"),
                    "sleep_rem_min": rec.get("sono_rem_min"),
                    "sleep_awake_min": rec.get("tempo_acordado_min"),
                    "rhr_bpm": rec.get("fc_repouso_bpm"),
                    "avg_hr_bpm": rec.get("fc_media_bpm"),
                    "hrv_ms": rec.get("hrv_sono_ms"),
                    "readiness_score": rec.get("readiness"),
                    "weight_kg": rec.get("peso_kg"),
                    "bmi": rec.get("imc"),
                    "vo2_max": rec.get("vo2_max"),
                    "skin_temp_c": rec.get("temperatura_c"),
                    "stress_samples": rec.get("amostras_estresse"),
                    "source": "Zepp"
                }
                repo.upsert_daily_metric(mapped)
                count += 1

        repo.log_pipeline_run("Zepp", count, "SUCESSO", f"Importados/Atualizados {count} registros do Zepp")
        return count

    except Exception as exc:
        repo.log_pipeline_run("Zepp", 0, "ERRO", f"Falha ao processar Zepp: {exc}")
        return 0
