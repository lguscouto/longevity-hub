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
from zoneinfo import ZoneInfo

from longevidade.metrics.catalog import METRICS_CATALOG

from longevidade.db.repository import LongevityRepository

APP_TIMEZONE_NAME = os.environ.get("APP_TIMEZONE", os.environ.get("ZEPP_TIMEZONE", "America/Sao_Paulo"))
try:
    APP_TIMEZONE = ZoneInfo(APP_TIMEZONE_NAME)
except Exception:
    APP_TIMEZONE = timezone.utc


class ZeppCloudFetchError(RuntimeError):
    """A coleta remota terminou sem produzir um snapshot confiável para importar."""


def _validate_fresh_metadata(data_dir: Path, max_age_minutes: int = 15) -> None:
    """Garante que o cron atualizou um metadata recente, não só retornou exit 0."""
    metadata_path = data_dir / "metadata.json"
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ZeppCloudFetchError("a coleta não gerou um metadata Zepp válido") from exc

    status_val = str(metadata.get("status", "")).upper()
    error_val = str(metadata.get("error", "")).upper()
    if (
        "AUTH_ERROR" in status_val
        or "AUTH_ERROR" in error_val
        or metadata.get("error_code") in (401, 403)
        or metadata.get("status_code") in (401, 403)
        or metadata.get("auth_error")
    ):
        raise ZeppCloudFetchError(
            "Token Zepp expirado ou não autorizado (401/403). Por favor, renove o token nas configurações do Zepp."
        )

    try:
        raw_fetched_at = str(metadata["fetched_at"])
        fetched_at = datetime.fromisoformat(raw_fetched_at.replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError) as exc:
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


def run_zepp_cloud_fetch(
    zepp_scripts_dir: Path,
    timeout_seconds: int = 600,
    days: int | None = None,
    full: bool = False,
) -> None:
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

    cmd = [sys.executable, str(cron_script)]
    if full:
        cmd.append("--full")
    if days is not None:
        cmd.extend(["--days", str(days)])

    try:
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"
        if days is not None:
            env["ZEPP_DAYS"] = str(days)
        completed = subprocess.run(
            cmd,
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


def get_workout_duration_seconds(workout: dict[str, Any]) -> int | float | None:
    """Extrai a duração do treino em segundos de forma normalizada."""
    for key in ("duration_min", "duration_minutes"):
        val = workout.get(key)
        try:
            if val is not None and float(val) > 0:
                return float(val) * 60.0
        except (TypeError, ValueError):
            pass
    for key in ("run_time", "runtime", "duration", "durationTime", "totalTime", "total_time"):
        val = workout.get(key)
        try:
            if val is not None and float(val) > 0:
                return float(val)
        except (TypeError, ValueError):
            pass
    return None


ZEPP_TYPE_NAMES: dict[int, str] = {
    1: "Corrida",
    6: "Caminhada",
    8: "Esteira",
    9: "Ciclismo",
    10: "Ciclismo Indoor",
    12: "Natação",
    16: "Elíptico",
    40: "Outro",
    52: "Treino Força",
    54: "Alongamento",
}


def _map_workout_category(activity_type: int) -> str:
    if activity_type in (1, 8):
        return "Corrida"
    if activity_type in (9, 10):
        return "Ciclismo"
    if activity_type == 52:
        return "Treino Força"
    if activity_type == 6:
        return "Caminhada"
    return "Outros"


def parse_zepp_workouts(data_dir: Path | str) -> list[dict[str, Any]]:
    """Extrai e normaliza treinos individuais de workout_history.json."""
    data_path = Path(data_dir)
    history_path = data_path / "workout_history.json"
    if not history_path.is_file():
        return []

    try:
        payload = json.loads(history_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return []

    if not isinstance(payload, dict):
        return []

    data = payload.get("data")
    summaries = data.get("summary") if isinstance(data, dict) else None
    if not isinstance(summaries, list):
        return []

    workouts: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for item in summaries:
        if not isinstance(item, dict):
            continue

        raw_id = item.get("trackid")
        if raw_id is None:
            continue
        track_id = str(raw_id).strip()
        if not track_id or track_id in seen_ids:
            continue

        timestamp = None
        try:
            ts_val = int(float(track_id))
            if ts_val > 0:
                timestamp = int(ts_val / 1000) if ts_val > 1e11 else ts_val
        except (TypeError, ValueError):
            pass

        if timestamp is None:
            for key in ("createTime", "create_time", "end_time", "endTime"):
                val = item.get(key)
                try:
                    if val is not None and float(val) > 0:
                        ts_val = int(float(val))
                        timestamp = int(ts_val / 1000) if ts_val > 1e11 else ts_val
                        break
                except (TypeError, ValueError):
                    pass

        if timestamp is None or timestamp <= 0:
            continue

        try:
            local_dt = datetime.fromtimestamp(timestamp, timezone.utc).astimezone(APP_TIMEZONE)
            workout_date = local_dt.date().isoformat()
            workout_time = local_dt.strftime("%H:%M")
        except (TypeError, ValueError, OSError):
            continue

        try:
            type_code = int(float(item.get("type", 0)))
        except (TypeError, ValueError):
            type_code = 0

        category = _map_workout_category(type_code)
        activity_type = ZEPP_TYPE_NAMES.get(type_code, f"Tipo {type_code}")

        dur_sec = get_workout_duration_seconds(item)
        duration_min = round(float(dur_sec) / 60.0, 1) if dur_sec is not None and float(dur_sec) > 0 else 0.0

        try:
            dis_val = float(item.get("dis") or 0.0)
            distance_km = round(dis_val / 1000.0, 2) if dis_val > 0 else 0.0
        except (TypeError, ValueError):
            distance_km = 0.0

        try:
            calories = int(round(float(item.get("calorie") or 0)))
        except (TypeError, ValueError):
            calories = 0

        try:
            avg_hr_raw = float(item.get("avg_heart_rate") or 0)
            avg_hr = int(round(avg_hr_raw)) if avg_hr_raw > 0 else None
        except (TypeError, ValueError):
            avg_hr = None

        try:
            max_hr_raw = float(item.get("max_heart_rate") or 0)
            max_hr = int(round(max_hr_raw)) if max_hr_raw > 0 else None
        except (TypeError, ValueError):
            max_hr = None

        try:
            te_raw = float(item.get("te") or -1)
            training_effect = int(te_raw) if te_raw >= 0 else None
        except (TypeError, ValueError):
            training_effect = None

        try:
            step_raw = float(item.get("total_step") or 0)
            steps = int(step_raw) if step_raw > 0 else None
        except (TypeError, ValueError):
            steps = None

        city = str(item.get("city") or "")
        device = str(item.get("bind_device") or item.get("source") or "").replace(".huami.com", "").replace("run.", "")

        seen_ids.add(track_id)
        workouts.append({
            "id": track_id,
            "workout_date": workout_date,
            "workout_time": workout_time,
            "category": category,
            "activity_type": activity_type,
            "duration_min": duration_min,
            "calories": calories,
            "distance_km": distance_km,
            "avg_hr": avg_hr,
            "max_hr": max_hr,
            "training_effect": training_effect,
            "steps": steps,
            "city": city,
            "device": device,
            "raw_json": json.dumps(item, ensure_ascii=False),
            "source": "Zepp",
        })

    return sorted(workouts, key=lambda w: (w["workout_date"], w["workout_time"], w["id"]), reverse=True)


def _make_result(
    records_read: int,
    records_inserted: int,
    records_rejected: int,
    source_path: Path,
    status: str,
    summary: str,
    exception_type: str | None = None,
    exception_message: str | None = None,
    workouts_inserted: int = 0,
) -> Dict[str, Any]:
    return {
        "records_read": records_read,
        "records_inserted": records_inserted,
        "records_rejected": records_rejected,
        "workouts_inserted": workouts_inserted,
        "source_path": str(source_path),
        "status": status,
        "summary": summary,
        "exception_type": exception_type,
        "exception_message": exception_message,
    }



def import_zepp_data(
    zepp_data_dir: str | Path,
    repo: LongevityRepository,
    days: int | None = None,
    full: bool = False,
) -> Dict[str, Any]:
    """Aciona a coleta da nuvem Zepp e importa as métricas para o repositório.

    Retorna um dicionário ImportResult com diagnóstico completo.
    """
    if days is None:
        days = max(365, (date.today() - date(2026, 1, 1)).days + 1)

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

    metadata_path = data_dir / "metadata.json"
    if metadata_path.is_file():
        try:
            meta = json.loads(metadata_path.read_text(encoding="utf-8"))
            s_val = str(meta.get("status", "")).upper()
            e_val = str(meta.get("error", "")).upper()
            auth_keywords = ("AUTH_ERROR", "TOKEN_EXPIRED", "UNAUTHORIZED", "TOKEN EXPIRED", "FORBIDDEN")
            if (
                any(kw in s_val for kw in auth_keywords)
                or any(kw in e_val for kw in auth_keywords)
                or meta.get("error_code") in (401, 403)
                or meta.get("status_code") in (401, 403)
                or bool(meta.get("auth_error"))
            ):
                auth_msg = (
                    "Token Zepp expirado ou não autorizado (401/403). "
                    "Por favor, renove o token nas instruções de configuração do Zepp."
                )
                result = _make_result(
                    records_read=0,
                    records_inserted=0,
                    records_rejected=0,
                    source_path=data_dir,
                    status="ERRO",
                    summary=auth_msg,
                    exception_type="ZeppAuthError",
                    exception_message=auth_msg,
                )
                repo.log_pipeline_run("Zepp", 0, result["status"], result["summary"])
                return result
        except (OSError, ValueError, json.JSONDecodeError):
            pass


    zepp_scripts_dir = data_dir.parent / "scripts"
    if zepp_scripts_dir.exists():
        try:
            try:
                run_zepp_cloud_fetch(zepp_scripts_dir, days=days, full=full)
            except TypeError:
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
        if not zepp_scripts_dir.exists():
            sys.modules.pop("health_metrics", None)
            raise ImportError(f"Módulo health_metrics não encontrado em {zepp_scripts_dir}")
        if str(zepp_scripts_dir) not in sys.path:
            sys.path.insert(0, str(zepp_scripts_dir))
        hm_mod = sys.modules.get("health_metrics")
        if hm_mod is not None:
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
                        "calories": rec.get("calorias_zepp"),
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

                    # Persiste a cobertura e qualidade dos dados para o dia via METRICS_CATALOG
                    quality_items = []
                    expected_keys = [
                        ("hrv_ms", rec.get("hrv_rmssd_media_ms") or rec.get("hrv_sono_ms")),
                        ("rhr_bpm", rhr_val),
                        ("steps", rec.get("passos_zepp")),
                        ("sleep_minutes", rec.get("sono_zepp_min")),
                        ("spo2_avg_pct", rec.get("spo2_media_pct")),
                        ("respiratory_rate_rpm", rec.get("frequencia_respiratoria_rpm")),
                        ("pai_score", rec.get("pai")),
                    ]
                    for mkey, mval in expected_keys:
                        has_val = mval is not None
                        mdef = METRICS_CATALOG.get(mkey)
                        warnings = []
                        status = "unavailable"
                        coverage = 0.0

                        if has_val:
                            coverage = None  # Cobertura intraday não é verificável a partir de snapshot agregado diário
                            val_float = float(mval)
                            if mdef and mdef.plausible_min is not None and val_float < mdef.plausible_min:
                                status = "low"
                                warnings.append(f"Métrica {mkey} abaixo do mínimo plausível ({val_float} < {mdef.plausible_min})")
                            elif mdef and mdef.plausible_max is not None and val_float > mdef.plausible_max:
                                status = "low"
                                warnings.append(f"Métrica {mkey} acima do máximo plausível ({val_float} > {mdef.plausible_max})")
                            else:
                                status = "not_verifiable"
                        else:
                            coverage = 0.0
                            warnings.append(f"Métrica {mkey} indisponível no snapshot Zepp")

                        quality_items.append({
                            "date_ref": rec["data_referencia"],
                            "metric_key": mkey,
                            "source": "Zepp",
                            "observed_at": datetime.now(timezone.utc).isoformat(),
                            "sample_count": 1 if has_val else 0,
                            "coverage_pct": coverage,
                            "quality_status": status,
                            "warnings": warnings,
                        })
                    repo.save_daily_metric_quality(quality_items)
                    records_inserted += 1
                else:
                    records_rejected += 1
            else:
                records_rejected += 1

        # Ingestão e persistência de treinos individuais
        parsed_workouts = parse_zepp_workouts(data_dir)
        workouts_inserted = repo.upsert_workouts(parsed_workouts)

        result = _make_result(
            records_read=records_read,
            records_inserted=records_inserted,
            records_rejected=records_rejected,
            source_path=data_dir,
            status="SUCESSO",
            summary=f"Importados/Atualizados {records_inserted} registros do Zepp ({records_rejected} rejeitados de {records_read}). Treinos persistidos: {workouts_inserted}.",
            workouts_inserted=workouts_inserted,
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
