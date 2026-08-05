"""
Importador de dados do projeto Zepp para o banco do Longevidade.
Aciona a coleta da nuvem Amazfit/Zepp e lê os snapshots diários.

Retorna um dicionário estruturado (ImportResult) com diagnóstico completo:
  - records_read: registros encontrados nos arquivos de origem
  - records_inserted: registros efetivamente upsertados no banco
  - records_rejected: registros ignorados (sem dados úteis)
  - source_path: caminho do diretório de dados utilizado
  - status: "SUCESSO" | "ERRO" | "AVISO"
  - summary: descrição textual resumida
  - exception_type: tipo da exceção (None em caso de sucesso)
  - exception_message: mensagem da exceção (None em caso de sucesso)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository


class ZeppCloudFetchError(RuntimeError):
    """A coleta remota terminou sem produzir um snapshot confiável para importar."""


def _validate_fresh_metadata(data_dir: Path, max_age_minutes: int = 15) -> None:
    """Garante que o cron atualizou um metadata recente, não só retornou exit 0."""
    metadata_path = data_dir / "metadata.json"
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        raw_fetched_at = str(metadata["fetched_at"])
        fetched_at = datetime.fromisoformat(raw_fetched_at.replace("Z", "+00:00"))
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ZeppCloudFetchError("a coleta não gerou um metadata Zepp válido") from exc

    if fetched_at.tzinfo is None:
        fetched_at = fetched_at.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - fetched_at.astimezone(timezone.utc)
    if age > timedelta(minutes=max_age_minutes):
        raise ZeppCloudFetchError("a coleta terminou sem atualizar o metadata Zepp")
    if age < timedelta(minutes=-5):
        raise ZeppCloudFetchError("o metadata Zepp possui horário futuro inválido")


def _validate_primary_snapshot_sources(data_dir: Path) -> None:
    """Recusa um cron que gravou apenas erros nas fontes de passos/sono e FC."""
    failed_sources: list[str] = []
    for filename in ("band_data.json", "heart_rate.json"):
        path = data_dir / filename
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, json.JSONDecodeError):
            failed_sources.append(filename)
            continue
        if isinstance(payload, dict) and payload.get("error"):
            failed_sources.append(filename)

    if len(failed_sources) == 2:
        raise ZeppCloudFetchError(
            "a coleta Zepp falhou nas fontes primárias de passos/sono e frequência cardíaca"
        )


def run_zepp_cloud_fetch(zepp_scripts_dir: Path, timeout_seconds: int = 600) -> None:
    """Atualiza os snapshots Zepp e só retorna quando o processo terminou.

    A importação que ocorria após disparar uma thread relia o snapshot anterior
    e declarava sucesso. O Sync agora espera a coleta terminar antes de abrir os
    JSONs locais.
    """
    cron_script = zepp_scripts_dir / "zepp_cron.py"
    if not cron_script.is_file():
        # Fixtures/offline podem fornecer apenas health_metrics.py. Em produção,
        # zepp_cron.py existe e a coleta ocorre obrigatoriamente antes do import.
        return

    try:
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"
        completed = subprocess.run(
            [sys.executable, str(cron_script)],
            cwd=str(zepp_scripts_dir.parent),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ZeppCloudFetchError(
            f"a coleta Zepp excedeu o limite de {timeout_seconds} segundos"
        ) from exc
    except OSError as exc:
        raise ZeppCloudFetchError("não foi possível iniciar a coleta Zepp") from exc

    if completed.returncode != 0:
        # Não retornar stderr/stdout: respostas de terceiros podem conter dados
        # sensíveis e não devem ser gravadas em logs de pipeline ou exibidas na UI.
        raise ZeppCloudFetchError(
            f"a coleta Zepp terminou com código {completed.returncode}"
        )

    data_dir = zepp_scripts_dir.parent / "data"
    _validate_fresh_metadata(data_dir)
    _validate_primary_snapshot_sources(data_dir)


def _make_result(
    records_read: int,
    records_inserted: int,
    records_rejected: int,
    source_path: Path,
    status: str,
    summary: str,
    exception_type: str | None = None,
    exception_message: str | None = None,
) -> Dict[str, Any]:
    return {
        "records_read": records_read,
        "records_inserted": records_inserted,
        "records_rejected": records_rejected,
        "source_path": str(source_path),
        "status": status,
        "summary": summary,
        "exception_type": exception_type,
        "exception_message": exception_message,
    }


def import_zepp_data(
    zepp_data_dir: str | Path,
    repo: LongevityRepository,
    days: int = 30,
) -> Dict[str, Any]:
    """Aciona a coleta da nuvem Zepp e importa as métricas para o repositório.

    Retorna um dicionário ImportResult com diagnóstico completo.
    """
    data_dir = Path(zepp_data_dir)
    if not data_dir.exists():
        result = _make_result(
            records_read=0,
            records_inserted=0,
            records_rejected=0,
            source_path=data_dir,
            status="ERRO",
            summary=f"Diretório {data_dir} não existe",
        )
        repo.log_pipeline_run("Zepp", 0, result["status"], result["summary"])
        return result

    zepp_scripts_dir = data_dir.parent / "scripts"
    if zepp_scripts_dir.exists():
        try:
            run_zepp_cloud_fetch(zepp_scripts_dir)
        except ZeppCloudFetchError as exc:
            result = _make_result(
                records_read=0,
                records_inserted=0,
                records_rejected=0,
                source_path=data_dir,
                status="ERRO",
                summary=(
                    "A coleta Zepp não foi concluída; os snapshots anteriores não foram importados. "
                    f"Motivo: {exc}"
                ),
                exception_type=type(exc).__name__,
                exception_message=str(exc),
            )
            repo.log_pipeline_run("Zepp", 0, result["status"], result["summary"])
            return result

    try:
        if zepp_scripts_dir.exists() and str(zepp_scripts_dir) not in sys.path:
            sys.path.insert(0, str(zepp_scripts_dir))
        hm_mod = sys.modules.get("health_metrics")
        if hm_mod is not None and zepp_scripts_dir.exists():
            hm_path = getattr(hm_mod, "__file__", None)
            if hm_path is None or Path(hm_path).parent.resolve() != zepp_scripts_dir.resolve():
                sys.modules.pop("health_metrics", None)
        from health_metrics import build_zepp_daily_record

        records_read = 0
        records_inserted = 0
        records_rejected = 0
        today = date.today()
        for i in range(days):
            ref = today - timedelta(days=i)
            records_read += 1
            rec = build_zepp_daily_record(data_dir, ref)
            if rec:
                rhr_val = rec.get("fc_repouso_bpm") if rec.get("fc_repouso_bpm") is not None else rec.get("rhr_sono_bpm")
                if (
                    rec.get("passos_zepp") is not None
                    or rec.get("sono_zepp_min") is not None
                    or rhr_val is not None
                ):
                    mapped = {
                        "date_ref": rec["data_referencia"],
                        "steps": rec.get("passos_zepp"),
                        "sleep_minutes": rec.get("sono_zepp_min"),
                        "sleep_deep_min": rec.get("sono_profundo_min"),
                        "sleep_light_min": rec.get("sono_leve_min"),
                        "sleep_rem_min": rec.get("sono_rem_min"),
                        "sleep_awake_min": rec.get("tempo_acordado_min"),
                        "rhr_bpm": rhr_val,
                        "avg_hr_bpm": rec.get("fc_media_bpm"),
                        "hrv_ms": rec.get("hrv_rmssd_media_ms") if rec.get("hrv_rmssd_media_ms") is not None else rec.get("hrv_sono_ms"),
                        "readiness_score": rec.get("readiness"),
                        "weight_kg": rec.get("peso_kg"),
                        "bmi": rec.get("imc"),
                        "vo2_max": rec.get("vo2_max"),
                        "skin_temp_c": rec.get("temperatura_c"),
                        "stress_samples": rec.get("amostras_estresse"),
                        "spo2_avg_pct": rec.get("spo2_media_pct"),
                        "spo2_min_pct": rec.get("spo2_min_pct"),
                        "respiratory_rate_rpm": rec.get("frequencia_respiratoria_rpm"),
                        "systolic_bp": rec.get("pressao_sistolica_mmhg"),
                        "diastolic_bp": rec.get("pressao_diastolica_mmhg"),
                        "pai_score": rec.get("pai"),
                        "training_load_daily": rec.get("carga_diaria"),
                        "training_load_rolling": rec.get("carga_acumulada"),
                        "training_load_optimal_min": rec.get("faixa_carga_min"),
                        "training_load_optimal_max": rec.get("faixa_carga_max"),
                        "workout_count": rec.get("treinos_zepp_qtd", 0),
                        "workout_duration_min": rec.get("duracao_treinos_min"),
                        "source": "Zepp",
                    }
                    repo.upsert_daily_metric(mapped)
                    records_inserted += 1
                else:
                    records_rejected += 1
            else:
                records_rejected += 1

        result = _make_result(
            records_read=records_read,
            records_inserted=records_inserted,
            records_rejected=records_rejected,
            source_path=data_dir,
            status="SUCESSO",
            summary=f"Importados/Atualizados {records_inserted} registros do Zepp ({records_rejected} rejeitados de {records_read})",
        )
        repo.log_pipeline_run(
            "Zepp", records_inserted, result["status"], result["summary"]
        )
        return result

    except ImportError as exc:
        result = _make_result(
            records_read=0,
            records_inserted=0,
            records_rejected=0,
            source_path=data_dir,
            status="ERRO",
            summary=f"Módulo health_metrics não encontrado em {zepp_scripts_dir}",
            exception_type="ImportError",
            exception_message=str(exc),
        )
        repo.log_pipeline_run("Zepp", 0, result["status"], result["summary"])
        return result

    except Exception as exc:
        result = _make_result(
            records_read=0,
            records_inserted=0,
            records_rejected=0,
            source_path=data_dir,
            status="ERRO",
            summary=f"Falha ao processar Zepp: {exc}",
            exception_type=type(exc).__name__,
            exception_message=str(exc),
        )
        repo.log_pipeline_run("Zepp", 0, result["status"], result["summary"])
        return result
