"""
Suíte de testes para idempotência da camada raw health_data_points (P1.5 Codex).

Testes requeridos:
- test_raw_point_is_idempotent
- test_same_google_point_does_not_duplicate
- test_different_interval_creates_new_point
- test_different_value_creates_new_revision_when_applicable
"""

from pathlib import Path
import pytest

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.integrations.google_health.client import _build_raw_point


@pytest.fixture
def repo(tmp_path: Path):
    db_path = tmp_path / "raw_idempotency.sqlite3"
    initialize_db(db_path)
    return LongevityRepository(db_path)


def test_raw_point_is_idempotent():
    """Valida que o mesmo dataPoint sem ID gera hash determinístico idêntico em execuções repetidas."""
    pt = {
        "startTime": "2026-09-01T10:00:00Z",
        "endTime": "2026-09-01T10:15:00Z",
        "steps": {"count": 450},
        "dataSource": {"platform": "PixelWatch"},
    }

    raw1 = _build_raw_point("steps", pt, provider="google_health")
    raw2 = _build_raw_point("steps", pt, provider="google_health")

    assert raw1["id"] == raw2["id"]
    assert raw1["id"].startswith("google_health_steps_")
    assert raw1["value"] == 450.0


def test_same_google_point_does_not_duplicate(repo: LongevityRepository):
    """Duas sincronizações iguais do mesmo registro produzem 1 linha no banco (sem duplicar)."""
    pt = {
        "startTime": "2026-09-01T10:00:00Z",
        "endTime": "2026-09-01T10:15:00Z",
        "steps": {"count": 750},
    }

    # Sincronização 1
    raw1 = _build_raw_point("steps", pt)
    repo.insert_health_data_points([raw1])

    with repo._get_connection() as conn:
        count1 = conn.execute("SELECT COUNT(*) FROM health_data_points;").fetchone()[0]
    assert count1 == 1

    # Sincronização 2 (idêntica)
    raw2 = _build_raw_point("steps", pt)
    repo.insert_health_data_points([raw2])

    with repo._get_connection() as conn:
        count2 = conn.execute("SELECT COUNT(*) FROM health_data_points;").fetchone()[0]
    assert count2 == 1, "Mesmo ponto sincronizado duas vezes não deve criar linha duplicada"


def test_different_interval_creates_new_point(repo: LongevityRepository):
    """Intervalos de tempo diferentes produzem IDs distintos e pontos separados."""
    pt1 = {
        "startTime": "2026-09-01T10:00:00Z",
        "endTime": "2026-09-01T10:15:00Z",
        "steps": {"count": 500},
    }
    pt2 = {
        "startTime": "2026-09-01T10:15:00Z",
        "endTime": "2026-09-01T10:30:00Z",
        "steps": {"count": 500},
    }

    raw1 = _build_raw_point("steps", pt1)
    raw2 = _build_raw_point("steps", pt2)

    assert raw1["id"] != raw2["id"]
    repo.insert_health_data_points([raw1, raw2])

    with repo._get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM health_data_points;").fetchone()[0]
    assert count == 2


def test_different_value_creates_new_revision_when_applicable(repo: LongevityRepository):
    """
    Quando o valor do registro é modificado para o mesmo identificador estável,
    a camada raw atualiza a linha (INSERT OR REPLACE) preservando a integridade.
    """
    pt_initial = {
        "id": "google_point_fixed_123",
        "startTime": "2026-09-01T08:00:00Z",
        "heartRate": {"bpm": 62.0},
    }
    raw_initial = _build_raw_point("heart-rate", pt_initial)
    repo.insert_health_data_points([raw_initial])

    with repo._get_connection() as conn:
        val1 = conn.execute("SELECT value FROM health_data_points WHERE id = 'google_point_fixed_123';").fetchone()[0]
    assert val1 == 62.0

    # Revisão do ponto pelo Google (novo valor)
    pt_revised = {
        "id": "google_point_fixed_123",
        "startTime": "2026-09-01T08:00:00Z",
        "heartRate": {"bpm": 65.0},
    }
    raw_revised = _build_raw_point("heart-rate", pt_revised)
    repo.insert_health_data_points([raw_revised])

    with repo._get_connection() as conn:
        rows = conn.execute("SELECT value FROM health_data_points WHERE id = 'google_point_fixed_123';").fetchall()
    assert len(rows) == 1
    assert rows[0][0] == 65.0
