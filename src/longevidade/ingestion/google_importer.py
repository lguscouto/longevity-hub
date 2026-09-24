"""
Importador de dados do projeto Google Health Hub (Google Fit / Google Health API v4 / Health Connect)
para o repositório Longevidade.

Retorna um dicionário estruturado (ImportResult) com diagnóstico completo:
  - records_read: registros encontrados nos arquivos JSON ou retornados pela API
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
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.google_health_client import GoogleHealthClient


def _parse_timestamp_to_date_str(ts_ms: str | int | float) -> str | None:
    try:
        ts_sec = float(ts_ms) / 1000.0 if float(ts_ms) > 10_000_000_000 else float(ts_ms)
        return datetime.fromtimestamp(ts_sec, timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return None


def trigger_google_cloud_fetch(google_backend_dir: Path, days: int = 30) -> None:
    """Aciona o cliente do Google Health/Fit para baixar retroativamente os dados da nuvem."""
    try:
        if str(google_backend_dir) not in sys.path:
            sys.path.insert(0, str(google_backend_dir))
        from google_fit_client import fetch_all_google_health

        fetch_all_google_health(days=days)
    except ImportError:
        pass
    except Exception:
        pass


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


def sync_google_health_api(
    repo: LongevityRepository,
    days: int = 30,
    client: Optional[GoogleHealthClient] = None,
    selected_types: Optional[list[str]] = None,
) -> Dict[str, Any]:
    """Sincroniza dados diretamente da Google Health API v4 para o repositório SQLite."""
    gh_client = client or GoogleHealthClient()
    if not gh_client.is_authenticated():
        reason = "Google Health API não autenticada."
        if gh_client.is_reauthentication_required():
            reason = f"Reautenticação necessária: {gh_client.credentials.last_error if gh_client.credentials else 'sessão expirada'}"

        result = _make_result(
            records_read=0,
            records_inserted=0,
            records_rejected=0,
            source_path=gh_client.token_path,
            status="AVISO",
            summary=reason,
        )
        repo.log_pipeline_run("GoogleHealthAPI", 0, result["status"], result["summary"])
        return result

    records, errors = gh_client.fetch_daily_metrics_summary(days=days, selected_types=selected_types)
    inserted = 0
    rejected = 0

    for rec in records:
        if len(rec) > 2:
            repo.upsert_daily_metric(rec)
            inserted += 1
        else:
            rejected += 1

    status = "SUCESSO" if not errors else ("AVISO" if inserted > 0 else "ERRO")
    summary = f"Sincronizados {inserted} registros da Google Health API v4 ({len(records)} lidos)"
    if errors:
        summary += f" | Erros: {'; '.join(errors[:3])}"

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        repo.upsert_google_health_sync_state(
            data_type="all",
            last_successful_sync=now_iso if inserted > 0 else None,
            last_attempt=now_iso,
            records_imported=inserted,
            last_error="; ".join(errors) if errors else None,
        )
    except Exception:
        pass

    result = _make_result(
        records_read=len(records),
        records_inserted=inserted,
        records_rejected=rejected,
        source_path=gh_client.token_path,
        status=status,
        summary=summary,
        exception_type="API_WARNING" if errors else None,
        exception_message="; ".join(errors) if errors else None,
    )
    repo.log_pipeline_run("GoogleHealthAPI", inserted, result["status"], result["summary"])
    return result


def import_google_health_data(
    google_data_dir: str | Path,
    repo: LongevityRepository,
) -> Dict[str, Any]:
    """Processa arquivos JSON de exportação ou sincronizados do Google Health/Fit."""
    data_dir = Path(google_data_dir)
    if not data_dir.exists():
        result = _make_result(
            records_read=0,
            records_inserted=0,
            records_rejected=0,
            source_path=data_dir,
            status="AVISO",
            summary=f"Diretório {data_dir} não existe",
        )
        repo.log_pipeline_run("GoogleFit", 0, result["status"], result["summary"])
        return result

    google_backend_dir = data_dir.parent / "backend"
    if google_backend_dir.exists():
        trigger_google_cloud_fetch(google_backend_dir, days=30)

    daily_records: Dict[str, Dict[str, Any]] = {}
    all_errors: list[str] = []
    total_bucket_errors = 0

    def get_or_create(date_str: str) -> Dict[str, Any]:
        if date_str not in daily_records:
            daily_records[date_str] = {"date_ref": date_str, "source": "GoogleFit"}
        return daily_records[date_str]

    # 0. Google Health v4 JSON Direto (google_health_daily.json)
    gh_v4_path = data_dir / "google_health_daily.json"
    gh_v4_read = 0
    if gh_v4_path.is_file():
        try:
            payload = json.loads(gh_v4_path.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                for item in payload:
                    dt_str = item.get("date_ref")
                    if dt_str:
                        rec = get_or_create(dt_str)
                        rec.update(item)
                        gh_v4_read += 1
        except Exception as exc:
            all_errors.append(f"erro google_health_daily.json: {exc}")

    # 1. Passos (google_steps.json)
    steps_path = data_dir / "google_steps.json"
    steps_read = 0
    steps_errors = 0
    if steps_path.is_file():
        try:
            payload = json.loads(steps_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    all_errors.append("timestamp inválido em google_steps.json")
                    steps_errors += 1
                    continue
                steps_read += 1
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
                else:
                    steps_errors += 1
                    all_errors.append(f"steps zerados para {dt_str}")
        except json.JSONDecodeError as exc:
            all_errors.append(f"JSON inválido google_steps.json: {exc}")
            total_bucket_errors += 1
        except Exception as exc:
            all_errors.append(f"erro google_steps.json: {exc}")
            total_bucket_errors += 1

    # 2. Pressão Arterial (google_blood_pressure.json)
    bp_path = data_dir / "google_blood_pressure.json"
    bp_read = 0
    bp_errors = 0
    if bp_path.is_file():
        try:
            payload = json.loads(bp_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    all_errors.append("timestamp inválido em google_blood_pressure.json")
                    bp_errors += 1
                    continue
                bp_read += 1
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
                            else:
                                bp_errors += 1
                                all_errors.append(f"PA incompleta para {dt_str}")
                        else:
                            bp_errors += 1
                            all_errors.append(f"poucos valores de PA para {dt_str}")
        except json.JSONDecodeError as exc:
            all_errors.append(f"JSON inválido google_blood_pressure.json: {exc}")
            total_bucket_errors += 1
        except Exception as exc:
            all_errors.append(f"erro google_blood_pressure.json: {exc}")
            total_bucket_errors += 1

    # 3. Frequência Cardíaca (google_heart.json)
    heart_path = data_dir / "google_heart.json"
    heart_read = 0
    heart_errors = 0
    if heart_path.is_file():
        try:
            payload = json.loads(heart_path.read_text(encoding="utf-8"))
            for b in payload.get("bucket", []):
                dt_str = _parse_timestamp_to_date_str(b.get("startTimeMillis", 0))
                if not dt_str:
                    all_errors.append("timestamp inválido em google_heart.json")
                    heart_errors += 1
                    continue
                heart_read += 1
                for ds in b.get("dataset", []):
                    for pt in ds.get("point", []):
                        for val in pt.get("value", []):
                            hr = val.get("fpVal") or val.get("intVal")
                            if hr:
                                get_or_create(dt_str)["rhr_bpm"] = float(hr)
                            else:
                                heart_errors += 1
                                all_errors.append(f"FC zerada para {dt_str}")
        except json.JSONDecodeError as exc:
            all_errors.append(f"JSON inválido google_heart.json: {exc}")
            total_bucket_errors += 1
        except Exception as exc:
            all_errors.append(f"erro google_heart.json: {exc}")
            total_bucket_errors += 1

    # Contagem final
    records_read = steps_read + bp_read + heart_read + gh_v4_read
    total_errors = steps_errors + bp_errors + heart_errors + total_bucket_errors

    records_inserted = 0
    records_rejected = 0
    for dt_str, rec in daily_records.items():
        if len(rec) > 2:
            repo.upsert_daily_metric(rec)
            records_inserted += 1
        else:
            records_rejected += 1

    log_summary = f"Importados/Reconciliados {records_inserted} registros do Google Health ({records_rejected} rejeitados de {len(daily_records)} datas)"
    if all_errors:
        log_summary += f" | {total_errors} advertência(s): {'; '.join(all_errors[:5])}"
        if len(all_errors) > 5:
            log_summary += f" (+{len(all_errors) - 5} mais)"

    result = _make_result(
        records_read=records_read,
        records_inserted=records_inserted,
        records_rejected=records_rejected,
        source_path=data_dir,
        status="SUCESSO",
        summary=log_summary,
    )
    if total_errors > 0:
        result["exception_type"] = "ADVERTENCIA"
        result["exception_message"] = "; ".join(all_errors[:10]) if all_errors else None

    repo.log_pipeline_run("GoogleHealth", records_inserted, result["status"], result["summary"])
    return result
