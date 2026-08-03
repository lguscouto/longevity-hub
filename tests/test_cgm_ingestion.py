"""Testes para a Task 4.2: persistência de leituras CGM brutas e derivação de sumários.

Cobre:
- batch_insert_cgm_readings com dedup
- get_cgm_readings_by_date_range
- recalculate_cgm_summary_from_readings
- POST /api/cgm/batch (modificado)
- POST /api/cgm/readings (novo)
- POST /api/cgm/upload-csv (modificado)
"""

import io
import csv
import json
import os
import importlib
import sys
from pathlib import Path
from datetime import datetime

import pytest
from fastapi.testclient import TestClient


# ─── Fixtures sintéticas ────────────────────────────────────────────────────


@pytest.fixture
def repo(tmp_path):
    """Retorna um LongevityRepository com banco temporário."""
    db_path = tmp_path / "cgm-test.sqlite3"
    from longevidade.db.schema import initialize_db
    initialize_db(db_path)
    from longevidade.db.repository import LongevityRepository
    return LongevityRepository(db_path)


def _make_reading(timestamp: str, glucose_mgdl: float, device_id: str = "test_sensor"):
    return {"timestamp": timestamp, "glucose_mgdl": glucose_mgdl, "device_id": device_id}


# ─── Testes do Repositório ─────────────────────────────────────────────────


class TestRepositoryCGMReadings:
    """Testa os novos métodos do repositório para cgm_readings."""

    def test_batch_insert_readings(self, repo):
        """Insere leituras e verifica contagem."""
        readings = [
            _make_reading("2026-07-01T08:00:00", 95.0),
            _make_reading("2026-07-01T08:15:00", 102.0),
            _make_reading("2026-07-01T08:30:00", 88.0),
        ]
        inserted = repo.batch_insert_cgm_readings(readings)
        assert inserted == 3

        # Verifica na tabela
        with repo._get_connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM cgm_readings").fetchone()[0]
        assert count == 3

    def test_batch_insert_dedup(self, repo):
        """Insert do mesmo timestamp não duplica."""
        r = _make_reading("2026-07-01T08:00:00", 95.0)
        repo.batch_insert_cgm_readings([r])
        repo.batch_insert_cgm_readings([r])  # mesmo timestamp

        with repo._get_connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM cgm_readings").fetchone()[0]
        assert count == 1

    def test_batch_insert_dedup_returns_correct_count(self, repo):
        """batch_insert_cgm_readings retorna apenas as linhas realmente inseridas."""
        readings = [
            _make_reading("2026-07-01T08:00:00", 95.0),
            _make_reading("2026-07-01T08:15:00", 102.0),
        ]
        first = repo.batch_insert_cgm_readings(readings)
        assert first == 2

        # Reinsere a primeira + uma nova
        dup = [
            _make_reading("2026-07-01T08:00:00", 95.0),  # duplicado
            _make_reading("2026-07-01T08:30:00", 110.0),  # novo
        ]
        second = repo.batch_insert_cgm_readings(dup)
        assert second == 1  # apenas 1 novo

    def test_get_readings_by_date_range(self, repo):
        """Filtra leituras por período."""
        readings = [
            _make_reading("2026-07-01T08:00:00", 95.0),
            _make_reading("2026-07-01T12:00:00", 120.0),
            _make_reading("2026-07-02T08:00:00", 100.0),
            _make_reading("2026-07-03T08:00:00", 90.0),
        ]
        repo.batch_insert_cgm_readings(readings)

        # Apenas dia 01
        day1 = repo.get_cgm_readings_by_date_range("2026-07-01", "2026-07-01")
        assert len(day1) == 2
        assert all(r["glucose_mgdl"] in (95.0, 120.0) for r in day1)

        # Range de 3 dias
        all_days = repo.get_cgm_readings_by_date_range("2026-07-01", "2026-07-03")
        assert len(all_days) == 4

        # Range sem dados
        empty = repo.get_cgm_readings_by_date_range("2025-01-01", "2025-01-01")
        assert empty == []

    def test_recalculate_summary_from_readings(self, repo):
        """Deriva sumário correto das leituras brutas de um dia."""
        readings = [
            _make_reading("2026-07-01T08:00:00", 95.0),
            _make_reading("2026-07-01T08:15:00", 105.0),
            _make_reading("2026-07-01T08:30:00", 130.0),
            _make_reading("2026-07-01T08:45:00", 145.0),  # TAR
            _make_reading("2026-07-01T09:00:00", 65.0),   # TBR
        ]
        repo.batch_insert_cgm_readings(readings)
        stats = repo.recalculate_cgm_summary_from_readings("2026-07-01")

        assert stats["date_ref"] == "2026-07-01"
        assert stats["total_readings"] == 5
        assert 100.0 <= stats["mean_glucose"] <= 110.0
        assert stats["time_in_range_pct"] == 60.0  # 3/5 = 60%
        assert stats["time_above_range_pct"] == 20.0  # 1/5 = 20%
        assert stats["time_below_range_pct"] == 20.0  # 1/5 = 20%
        assert stats["glucose_sd"] > 0
        assert stats["cv_pct"] > 0

    def test_recalculate_summary_empty_day(self, repo):
        """Dia sem leituras resulta em sumário zerado."""
        stats = repo.recalculate_cgm_summary_from_readings("2026-07-01")
        assert stats["total_readings"] == 0
        assert stats["mean_glucose"] == 0.0

    def test_recalculate_updates_existing_summary(self, repo):
        """Recalcular duas vezes sobrescreve o sumário anterior."""
        repo.batch_insert_cgm_readings([_make_reading("2026-07-01T08:00:00", 95.0)])
        stats1 = repo.recalculate_cgm_summary_from_readings("2026-07-01")
        assert stats1["total_readings"] == 1

        # Adiciona mais leituras e recalcula
        repo.batch_insert_cgm_readings([
            _make_reading("2026-07-01T08:15:00", 110.0),
            _make_reading("2026-07-01T08:30:00", 120.0),
        ])
        stats2 = repo.recalculate_cgm_summary_from_readings("2026-07-01")
        assert stats2["total_readings"] == 3

    def test_readings_have_expected_columns(self, repo):
        """Leituras retornadas têm os campos esperados."""
        repo.batch_insert_cgm_readings([_make_reading("2026-07-01T08:00:00", 100.0)])
        rows = repo.get_cgm_readings_by_date_range("2026-07-01", "2026-07-01")
        assert len(rows) == 1
        r = rows[0]
        assert "id" in r
        assert "timestamp" in r
        assert "glucose_mgdl" in r
        assert "device_id" in r
        assert "created_at" in r
        assert r["glucose_mgdl"] == 100.0
        assert r["device_id"] == "test_sensor"


# ─── Testes dos Endpoints ───────────────────────────────────────────────────


@pytest.fixture
def cgm_client(tmp_path):
    """Client HTTP com banco temporário."""
    db_path = tmp_path / "cgm-api-test.sqlite3"
    os.environ["LONGEVIDADE_DB_PATH"] = str(db_path)
    # Recarrega módulos backend
    for mod in list(sys.modules):
        if mod.startswith("backend.app"):
            sys.modules.pop(mod, None)
    main = importlib.import_module("backend.app.main")
    with TestClient(main.app) as client:
        yield client


class TestEndpointBatch:
    """Testa POST /api/cgm/batch modificado."""

    def test_batch_returns_summary_and_readings_count(self, cgm_client):
        """Endpoint /batch retorna sumário + contagem de leituras."""
        payload = {
            "date_ref": "2026-07-15",
            "glucose_readings": [90, 100, 110, 120, 130],
        }
        resp = cgm_client.post("/api/cgm/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["readings_received"] == 5
        assert data["readings_inserted"] == 5
        assert data["summary"]["total_readings"] == 5
        assert data["summary"]["date_ref"] == "2026-07-15"

    def test_batch_dedup_does_not_fail(self, cgm_client):
        """Enviar o mesmo batch duas vezes não quebra."""
        payload = {
            "date_ref": "2026-07-15",
            "glucose_readings": [90, 100, 110],
        }
        resp1 = cgm_client.post("/api/cgm/batch", json=payload)
        resp2 = cgm_client.post("/api/cgm/batch", json=payload)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        data2 = resp2.json()
        # Mesmas leituras (mesmo timestamp gerado), dedup -> readings_inserted = 0
        assert data2["readings_inserted"] == 0
        # Sumário continua existindo
        assert data2["summary"]["total_readings"] == 3


class TestEndpointReadings:
    """Testa POST /api/cgm/readings (novo)."""

    def test_add_single_reading(self, cgm_client):
        """Adiciona leitura individual e retorna sumário do dia."""
        payload = {
            "timestamp": "2026-07-20T14:30:00",
            "glucose_mgdl": 105.0,
            "device_id": "freestyle",
        }
        resp = cgm_client.post("/api/cgm/readings", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["summary"]["total_readings"] == 1
        assert data["summary"]["date_ref"] == "2026-07-20"
        assert data["summary"]["mean_glucose"] == 105.0

    def test_add_reading_default_device(self, cgm_client):
        """device_id opcional, default 'manual'."""
        payload = {
            "timestamp": "2026-07-20T15:00:00",
            "glucose_mgdl": 95.0,
        }
        resp = cgm_client.post("/api/cgm/readings", json=payload)
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_add_readings_then_summary_reflects_all(self, cgm_client):
        """Múltiplas leituras no mesmo dia são agregadas no sumário."""
        for val, ts in [(90, "08:00"), (110, "09:00"), (150, "10:00")]:
            cgm_client.post("/api/cgm/readings", json={
                "timestamp": f"2026-07-21T{ts}:00",
                "glucose_mgdl": float(val),
            })
        resp = cgm_client.get("/api/cgm/summary")
        data = resp.json()
        # Pega o sumário mais recente (2026-07-21)
        day = next(d for d in data if d["date_ref"] == "2026-07-21")
        assert day["total_readings"] == 3


class TestEndpointUploadCSV:
    """Testa POST /api/cgm/upload-csv modificado."""

    def _make_csv_bytes(self, rows: list) -> bytes:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow(["Data", "Hora", "Glicose mg/dL"])
        writer.writerows(rows)
        return output.getvalue().encode("utf-8-sig")

    def test_upload_csv_saves_raw_and_derives_summary(self, cgm_client):
        """CSV com leituras de 1 dia salva brutas + sumário."""
        csv_bytes = self._make_csv_bytes([
            ["01/07/2026", "08:00", "95"],
            ["01/07/2026", "08:15", "105"],
            ["01/07/2026", "08:30", "130"],
        ])
        resp = cgm_client.post(
            "/api/cgm/upload-csv",
            files={"file": ("test.csv", csv_bytes, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["days_imported"] == 1
        assert data["rows_processed"] == 3
        assert data["raw_readings_inserted"] == 3

    def test_upload_csv_multiple_days(self, cgm_client):
        """CSV com 2 dias gera sumários separados."""
        csv_bytes = self._make_csv_bytes([
            ["01/07/2026", "08:00", "95"],
            ["01/07/2026", "08:15", "100"],
            ["01/07/2026", "08:30", "105"],
            ["02/07/2026", "08:00", "120"],
            ["02/07/2026", "08:15", "125"],
            ["02/07/2026", "08:30", "130"],
        ])
        resp = cgm_client.post(
            "/api/cgm/upload-csv",
            files={"file": ("multi.csv", csv_bytes, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["days_imported"] == 2
        assert data["rows_processed"] == 6


class TestEndpointSummaryConsistency:
    """Testa consistência entre leituras brutas e sumário."""

    def test_batch_and_reading_match(self, cgm_client):
        """Usar /batch + /readings no mesmo dia produz sumário consolidado."""
        cgm_client.post("/api/cgm/readings", json={
            "timestamp": "2026-08-01T07:00:00",  # fora do range do batch (08:00+)
            "glucose_mgdl": 80.0,
        })
        cgm_client.post("/api/cgm/batch", json={
            "date_ref": "2026-08-01",
            "glucose_readings": [100, 120, 140],
        })

        resp = cgm_client.get("/api/cgm/summary")
        data = resp.json()
        day = next(d for d in data if d["date_ref"] == "2026-08-01")
        assert day["total_readings"] == 4  # 1 individual + 3 do batch
        assert 100.0 <= day["mean_glucose"] <= 120.0
