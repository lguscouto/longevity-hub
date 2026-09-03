from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import pytest

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.zepp_importer import import_zepp_data, parse_zepp_workouts


def test_zepp_e2e_workouts_pipeline(client, tmp_path, monkeypatch):
    """Pipeline ponta a ponta: JSON bruto -> import_zepp_data -> DB -> GET /api/workouts."""
    data_dir = tmp_path / "zepp_data"
    data_dir.mkdir(parents=True, exist_ok=True)
    scripts_dir = tmp_path / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    # Escreve health_metrics dummy para o import_zepp_data
    (scripts_dir / "health_metrics.py").write_text(
        """
from datetime import date
def build_zepp_daily_record(data_dir, ref_date):
    return {
        "data_referencia": ref_date.isoformat(),
        "passos_zepp": 8000,
        "sono_zepp_min": 420,
        "fc_repouso_bpm": 58,
    }
""",
        encoding="utf-8",
    )

    # Cria workout_history.json sintético com várias modalidades
    # Timestamp base para 2026-08-10 10:00 UTC (07:00 São Paulo)
    ts1 = 1786356000
    ts2 = 1786442400
    workouts_payload = {
        "code": 1,
        "message": "success",
        "data": {
            "summary": [
                {
                    "trackid": str(ts1),
                    "type": 8,  # Esteira -> Categoria Corrida
                    "run_time": "2400",  # 40 min
                    "calorie": "350",
                    "dis": "6000",
                    "avg_heart_rate": "148",
                    "max_heart_rate": "165",
                    "te": 34,
                    "total_step": 5200,
                    "city": "Campinas",
                    "source": "run.1009.huami.com",
                },
                {
                    "trackid": str(ts2),
                    "type": 52,  # Treino Força
                    "run_time": "3600",  # 60 min
                    "calorie": "280",
                    "dis": "0",
                    "avg_heart_rate": "122",
                    "max_heart_rate": "150",
                    "te": 22,
                    "total_step": 1100,
                    "city": "São Paulo",
                    "source": "run.1009.huami.com",
                },
            ]
        },
    }
    (data_dir / "workout_history.json").write_text(json.dumps(workouts_payload), encoding="utf-8")

    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Executa ingestão Zepp
    result = import_zepp_data(data_dir, repo, days=2)
    assert result["status"] == "SUCESSO"
    assert result["workouts_inserted"] == 2
    assert "Treinos persistidos: 2" in result["summary"]

    # Consulta no SQLite via repository
    db_workouts = repo.get_workouts()
    assert len(db_workouts) == 2

    esteira = next(w for w in db_workouts if w["id"] == str(ts1))
    assert esteira["category"] == "Corrida"
    assert esteira["activity_type"] == "Esteira"
    assert esteira["duration_min"] == 40.0
    assert esteira["distance_km"] == 6.0
    assert esteira["calories"] == 350
    assert esteira["city"] == "Campinas"
    assert esteira["avg_hr"] == 148

    forca = next(w for w in db_workouts if w["id"] == str(ts2))
    assert forca["category"] == "Treino Força"
    assert forca["activity_type"] == "Treino Força"
    assert forca["duration_min"] == 60.0
    assert forca["city"] == "São Paulo"

    # Consulta via API REST
    res = client.get("/api/workouts")
    assert res.status_code == 200
    api_items = res.json()
    assert len(api_items) == 2


def test_zepp_auth_error_friendly_diagnosis(tmp_path):
    """Diagnóstico de AUTH_ERROR em metadata.json com mensagem amigável de token expirado (401/403)."""
    data_dir = tmp_path / "zepp_data"
    data_dir.mkdir(parents=True, exist_ok=True)

    metadata_auth_error = {
        "status": "AUTH_ERROR",
        "error": "token_expired",
        "error_code": 401,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    (data_dir / "metadata.json").write_text(json.dumps(metadata_auth_error), encoding="utf-8")

    db_path = tmp_path / "test-auth.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    result = import_zepp_data(data_dir, repo, days=1)
    assert result["status"] == "ERRO"
    assert "401/403" in result["summary"]
    assert "expirado" in result["summary"].lower() or "não autorizado" in result["summary"].lower()
    assert result["records_inserted"] == 0


def test_zepp_token_expired_without_status_auth_error(tmp_path):
    """Diagnóstico quando status='ERROR' mas error='token_expired'."""
    data_dir = tmp_path / "zepp_data"
    data_dir.mkdir(parents=True, exist_ok=True)

    metadata_auth_error = {
        "status": "ERROR",
        "error": "token_expired",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    (data_dir / "metadata.json").write_text(json.dumps(metadata_auth_error), encoding="utf-8")

    db_path = tmp_path / "test-auth2.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    result = import_zepp_data(data_dir, repo, days=1)
    assert result["status"] == "ERRO"
    assert "401/403" in result["summary"]
    assert "expirado" in result["summary"].lower()

