import pytest
import os
import tempfile
import gc
from pathlib import Path

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository

def test_db_initialization_and_crud():
    db_file = tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False)
    db_path = Path(db_file.name)
    db_file.close()

    try:
        initialize_db(db_path)
        repo = LongevityRepository(db_path)

        # Insere métrica diária
        repo.upsert_daily_metric({
            "date_ref": "2026-07-28",
            "steps": 10500,
            "sleep_minutes": 480,
            "rhr_bpm": 52.0,
            "hrv_ms": 65.0,
            "readiness_score": 88.0,
            "systolic_bp": 118,
            "diastolic_bp": 76
        })

        metrics = repo.get_daily_metrics(days=7)
        assert len(metrics) == 1
        assert metrics[0]["steps"] == 10500
        assert metrics[0]["rhr_bpm"] == 52.0
        assert metrics[0]["systolic_bp"] == 118

        # Insere exames de laboratório
        lab_id = repo.add_lab_result({
            "collected_at": "2026-07-28",
            "metric_key": "apob",
            "metric_name": "Apolipoproteína B",
            "value": 58.0,
            "unit": "mg/dL",
            "optimal_target": 60.0
        })
        assert lab_id > 0

        latest = repo.get_latest_labs_by_key()
        assert "apob" in latest
        assert latest["apob"]["value"] == 58.0

        # Testa exclusão por data
        deleted_count = repo.delete_lab_results_by_date("2026-07-28")
        assert deleted_count == 1
        assert len(repo.get_lab_results()) == 0

    finally:
        gc.collect()
        if db_path.exists():
            try:
                os.unlink(db_path)
            except OSError:
                pass
