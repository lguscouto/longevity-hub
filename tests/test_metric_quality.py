from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository


def test_save_and_get_daily_metric_quality(tmp_path):
    db_file = tmp_path / "test_quality.sqlite3"
    initialize_db(db_file)
    repo = LongevityRepository(db_file)

    quality_data = [
        {
            "date_ref": "2026-08-05",
            "metric_key": "hrv_ms",
            "source": "Zepp",
            "sample_count": 14,
            "coverage_pct": 85.0,
            "quality_status": "high",
            "warnings": [],
        },
        {
            "date_ref": "2026-08-05",
            "metric_key": "rhr_bpm",
            "source": "Zepp",
            "sample_count": 1,
            "coverage_pct": 50.0,
            "quality_status": "medium",
            "warnings": ["Baixa densidade de amostras"],
        },
    ]

    repo.save_daily_metric_quality(quality_data)

    retrieved = repo.get_daily_metric_quality("2026-08-05")
    assert len(retrieved) == 2
    
    hrv = next(item for item in retrieved if item["metric_key"] == "hrv_ms")
    assert hrv["quality_status"] == "high"
    assert hrv["coverage_pct"] == 85.0

    rhr = next(item for item in retrieved if item["metric_key"] == "rhr_bpm")
    assert rhr["quality_status"] == "medium"
    assert "Baixa densidade de amostras" in rhr["warnings"]
