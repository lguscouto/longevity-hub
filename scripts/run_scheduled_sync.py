#!/usr/bin/env python3
"""
Longevidade Hub — Script Autônomo de Sincronização Agendada
Executa a sincronização completa de métricas (Zepp, Google Health, Hevy, KDM)
diretamente no banco SQLite do Longevidade Hub.

Pode ser disparado via Agendador de Tarefas do Windows, Hermes Cron ou linha de comando.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import traceback
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# Garante que a raiz do projeto e 'src' estejam no sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from backend.app.config import (
    GOOGLE_DATA_DIR,
    ZEPP_DATA_DIR,
    get_db_path,
)
from longevidade.calculators.kdm_age import (
    build_kdm_history_rows,
    calculate_kdm_biological_age,
    latest_kdm_biomarker_values,
)
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.google_health_client import GoogleHealthClient
from longevidade.ingestion.google_importer import (
    import_google_health_data,
    sync_google_health_api,
)
from longevidade.ingestion.hevy_client import (
    HevyClient,
    HevyCredentials,
    sync_hevy_workouts,
)
from longevidade.ingestion.zepp_importer import import_zepp_data
from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS


def setup_logger(log_file: Optional[Path] = None) -> logging.Logger:
    """Configura o logger com saída tanto para console quanto para arquivo."""
    logger = logging.getLogger("longevidade.sync_runner")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        try:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as exc:
            logger.warning(f"Não foi possível criar o arquivo de log em {log_file}: {exc}")

    return logger


def recalculate_kdm_silently(repo: LongevityRepository, logger: logging.Logger) -> Dict[str, Any]:
    """Recalcula o KDM Biological Age com base nas métricas frescas inseridas."""
    try:
        profile = repo.get_user_profile()
        chronological_age = float(profile.get("chronological_age") or 40.0)
        lab_results = repo.get_lab_results(
            limit=1000,
            record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
        )
        daily_metrics = repo.get_daily_metrics(days=365)

        latest_values = latest_kdm_biomarker_values(lab_results, daily_metrics)
        historical_rows = build_kdm_history_rows(lab_results, daily_metrics, chronological_age)
        result = calculate_kdm_biological_age(
            chronological_age,
            latest_values,
            historical_data=historical_rows,
        )

        if result.get("status") == "complete":
            repo.save_kdm_record({
                "calculated_at": date.today().isoformat(),
                "chronological_age": result["chronological_age"],
                "kdm_age": result["kdm_age"],
                "kdm_delta": result["kdm_delta"],
                "biomarkers_used": json.dumps(result.get("biomarkers_used", []), ensure_ascii=False),
                "notes": f"KDM recalculado automaticamente via sync; fit_observations={result.get('fit_observations')}",
            })
            logger.info(f"KDM recalculado com sucesso: KDM Age {result.get('kdm_age')} (delta: {result.get('kdm_delta')})")
            return {"status": "ok", "kdm_age": result.get("kdm_age")}
        else:
            missing = result.get("missing_biomarkers", [])
            logger.info(f"KDM incompleto (faltam biomarcadores: {', '.join(missing) if missing else 'dados insuficientes'})")
            return {"status": "incomplete", "missing": missing}
    except Exception as exc:
        logger.warning(f"Erro ao recalcular KDM: {exc}")
        return {"status": "error", "error": str(exc)}


def run_sync(
    repo: Optional[LongevityRepository] = None,
    db_path: Optional[Path] = None,
    skip_zepp: bool = False,
    skip_google: bool = False,
    skip_hevy: bool = False,
    skip_kdm: bool = False,
    logger: Optional[logging.Logger] = None,
) -> Dict[str, Any]:
    """Executa o pipeline consolidado de sincronização."""
    resolved_db = db_path or get_db_path()
    if logger is None:
        log_path = PROJECT_ROOT / "data" / "sync.log"
        logger = setup_logger(log_path)

    start_time = datetime.now(timezone.utc)
    logger.info("=" * 60)
    logger.info(f"Iniciando Sincronização Agendada Longevidade Hub ({resolved_db})")
    logger.info(f"Horário UTC: {start_time.isoformat()}")

    if repo is None:
        initialize_db(resolved_db)
        repo = LongevityRepository(resolved_db)

    results: Dict[str, Any] = {
        "timestamp": start_time.isoformat(),
        "zepp": None,
        "google_health": None,
        "hevy": None,
        "kdm": None,
        "success": True,
        "errors": [],
    }

    # 1. Zepp Ingestion
    if not skip_zepp:
        logger.info("[1/4] Sincronizando Zepp/Amazfit...")
        try:
            zepp_res = import_zepp_data(ZEPP_DATA_DIR, repo, days=30)
            results["zepp"] = zepp_res
            status = zepp_res.get("status", "DESCONHECIDO")
            inserted = zepp_res.get("records_inserted", 0)
            summary = zepp_res.get("summary", "")
            logger.info(f"Zepp finalizado: status={status}, inseridos={inserted}. {summary}")
            if status == "ERRO":
                results["success"] = False
                results["errors"].append(f"Zepp: {summary}")
        except Exception as exc:
            results["success"] = False
            err_msg = f"Zepp falhou com exceção: {exc}"
            results["errors"].append(err_msg)
            logger.error(err_msg)
            logger.debug(traceback.format_exc())
    else:
        logger.info("[1/4] Zepp ignorado por configuração (--skip-zepp).")

    # 2. Google Health Ingestion
    if not skip_google:
        logger.info("[2/4] Sincronizando Google Health API...")
        google_summary = []
        try:
            # 2a. Reconciliação de dados locais (arquivos gerados por scripts/exportações)
            local_res = import_google_health_data(GOOGLE_DATA_DIR, repo)
            google_summary.append(f"Local: {local_res.get('status')} ({local_res.get('records_inserted', 0)} ins)")

            # 2b. API v4 direta se autenticada
            gh_client = GoogleHealthClient()
            if gh_client.is_authenticated() and not gh_client.is_reauthentication_required():
                api_res = sync_google_health_api(repo=repo, days=30, client=gh_client)
                google_summary.append(f"API v4: {api_res.get('status')} ({api_res.get('records_inserted', 0)} ins)")
                results["google_health"] = {"local": local_res, "api": api_res}
            else:
                google_summary.append("API v4: não autenticada (ignorado)")
                results["google_health"] = {"local": local_res, "api": None}

            logger.info(f"Google Health finalizado: {'; '.join(google_summary)}")
        except Exception as exc:
            err_msg = f"Google Health falhou: {exc}"
            results["errors"].append(err_msg)
            logger.warning(err_msg)
    else:
        logger.info("[2/4] Google Health ignorado por configuração (--skip-google).")

    # 3. Hevy Workouts Ingestion
    if not skip_hevy:
        logger.info("[3/4] Sincronizando Hevy Workouts...")
        try:
            if HevyCredentials.get_api_key():
                hevy_client = HevyClient()
                hevy_res = sync_hevy_workouts(repo=repo, client=hevy_client, max_pages=100)
                results["hevy"] = hevy_res
                logger.info(f"Hevy finalizado: {hevy_res.get('status')} ({hevy_res.get('records_inserted', 0)} treinos novos/atualizados)")
            else:
                logger.info("Chave do Hevy não configurada. Pulei etapa.")
                results["hevy"] = {"status": "skipped", "reason": "No API key"}
        except Exception as exc:
            err_msg = f"Hevy falhou: {exc}"
            results["errors"].append(err_msg)
            logger.warning(err_msg)
    else:
        logger.info("[3/4] Hevy ignorado por configuração (--skip-hevy).")

    # 4. KDM Recalculation
    if not skip_kdm:
        logger.info("[4/4] Recalculando idade biológica KDM...")
        kdm_res = recalculate_kdm_silently(repo, logger)
        results["kdm"] = kdm_res
    else:
        logger.info("[4/4] Recálculo KDM ignorado por configuração (--skip-kdm).")

    # Registrar execução do pipeline geral
    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
    overall_status = "SUCESSO" if results["success"] and not results["errors"] else ("AVISO" if results["success"] else "ERRO")
    consolidated_summary = (
        f"Sincronização agendada concluída em {elapsed:.1f}s. Status: {overall_status}. "
        f"Erros/Avisos: {len(results['errors'])}."
    )
    repo.log_pipeline_run(
        source="ScheduledSync",
        records_inserted=0,
        status=overall_status,
        logs=consolidated_summary + (" | " + "; ".join(results["errors"]) if results["errors"] else ""),
    )

    logger.info(consolidated_summary)
    logger.info("=" * 60)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Runner de sincronização agendada do Longevidade Hub")
    parser.add_argument("--db-path", type=str, default=None, help="Caminho do banco SQLite longevity.sqlite3")
    parser.add_argument("--log-file", type=str, default=None, help="Caminho do arquivo de log")
    parser.add_argument("--skip-zepp", action="store_true", help="Pula a sincronização Zepp/Amazfit")
    parser.add_argument("--skip-google", action="store_true", help="Pula a sincronização Google Health")
    parser.add_argument("--skip-hevy", action="store_true", help="Pula a sincronização Hevy")
    parser.add_argument("--skip-kdm", action="store_true", help="Pula o recálculo do KDM")
    args = parser.parse_args()

    db_path = Path(args.db_path) if args.db_path else None
    log_file = Path(args.log_file) if args.log_file else (PROJECT_ROOT / "data" / "sync.log")
    logger = setup_logger(log_file)

    try:
        res = run_sync(
            db_path=db_path,
            skip_zepp=args.skip_zepp,
            skip_google=args.skip_google,
            skip_hevy=args.skip_hevy,
            skip_kdm=args.skip_kdm,
            logger=logger,
        )
        return 0 if res.get("success") else 1
    except Exception as exc:
        logger.critical(f"Falha crítica na execução do sync: {exc}\n{traceback.format_exc()}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
