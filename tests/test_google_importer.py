"""
Testes determinísticos para o importador Google Fit (google_importer).

Usa fixtures sintéticas — arquivos JSON escritos em diretórios temporários.
Nunca chama APIs externas nem lê sistema de arquivos real do usuário.
"""

from __future__ import annotations

import json
import shutil
from datetime import date
from pathlib import Path
from typing import Any, Dict

import pytest

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.google_importer import import_google_health_data


# ---------------------------------------------------------------------------
# Helpers para criar arquivos JSON sintéticos do Google Fit
# ---------------------------------------------------------------------------

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def _escrever_json(data_dir: Path, filename: str, conteudo: Dict[str, Any]) -> Path:
    """Escreve um arquivo JSON sintético no diretório de dados."""
    filepath = data_dir / filename
    filepath.write_text(json.dumps(conteudo, indent=2), encoding="utf-8")
    return filepath


def _steps_bucket(dt_str: str, steps: int) -> Dict[str, Any]:
    """Gera um bucket de steps para uma data."""
    from datetime import datetime, timezone
    ts_ms = int(datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc).timestamp() * 1000)
    return {
        "startTimeMillis": str(ts_ms),
        "dataset": [{"point": [{"value": [{"intVal": steps}]}]}],
    }


def _bp_bucket(dt_str: str, systolic: int, diastolic: int) -> Dict[str, Any]:
    """Gera um bucket de pressão arterial para uma data."""
    from datetime import datetime, timezone
    ts_ms = int(datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc).timestamp() * 1000)
    return {
        "startTimeMillis": str(ts_ms),
        "dataset": [{"point": [{"value": [{"fpVal": float(systolic)}, {"fpVal": float(diastolic)}]}]}],
    }


def _heart_bucket(dt_str: str, rhr: float) -> Dict[str, Any]:
    """Gera um bucket de frequência cardíaca para uma data."""
    from datetime import datetime, timezone
    ts_ms = int(datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc).timestamp() * 1000)
    return {
        "startTimeMillis": str(ts_ms),
        "dataset": [{"point": [{"value": [{"fpVal": rhr}]}]}],
    }


@pytest.fixture
def repo(tmp_path) -> LongevityRepository:
    """Fixture que cria um banco SQLite temporário."""
    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    return LongevityRepository(db_path)


@pytest.fixture
def google_data_dir(tmp_path) -> Path:
    """Cria um diretório vazio para dados sintéticos do Google Fit."""
    data_dir = tmp_path / "google_data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGoogleImporterSemDados:
    """Cenários onde não há arquivos de dados."""

    def test_diretorio_inexistente(self, repo: LongevityRepository):
        """Quando o diretório não existe, retorna AVISO."""
        inexistente = Path("/caminho/inexistente/google_data")
        resultado = import_google_health_data(inexistente, repo)

        assert resultado["status"] == "AVISO"
        assert resultado["records_inserted"] == 0
        assert "não existe" in resultado["summary"]

    def test_diretorio_vazio(self, repo: LongevityRepository, google_data_dir: Path):
        """Diretório vazio → 0 registros, status SUCESSO."""
        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 0
        assert resultado["records_inserted"] == 0
        assert resultado["records_rejected"] == 0


class TestGoogleImporterSteps:
    """Testes focados no arquivo google_steps.json."""

    def test_importa_steps(self, repo: LongevityRepository, google_data_dir: Path):
        """Importa steps de 3 datas e verifica contagem + persistência."""
        buckets = [
            _steps_bucket("2026-07-28", 8500),
            _steps_bucket("2026-07-29", 10200),
            _steps_bucket("2026-07-30", 7200),
        ]
        _escrever_json(google_data_dir, "google_steps.json", {"bucket": buckets})

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 3  # 3 buckets lidos
        assert resultado["records_inserted"] == 3  # 3 datas com dados
        assert resultado["records_rejected"] == 0

        metrics = repo.get_daily_metrics(days=10)
        assert len(metrics) == 3
        steps_dict = {m["date_ref"]: m["steps"] for m in metrics}
        assert steps_dict["2026-07-28"] == 8500
        assert steps_dict["2026-07-29"] == 10200
        assert steps_dict["2026-07-30"] == 7200

    def test_steps_com_fpVal(self, repo: LongevityRepository, google_data_dir: Path):
        """Testa que fpVal em steps também é lido corretamente."""
        buckets = [
            {
                "startTimeMillis": "1751328000000",  # ~2026-07-28
                "dataset": [{"point": [{"value": [{"fpVal": 9000.0}]}]}],
            }
        ]
        _escrever_json(google_data_dir, "google_steps.json", {"bucket": buckets})

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["records_inserted"] == 1
        metrics = repo.get_daily_metrics(days=5)
        assert metrics[0]["steps"] == 9000

    def test_steps_zerados_rejeitados(self, repo: LongevityRepository, google_data_dir: Path):
        """Steps com valor 0 são registrados como erro/advertência.
        O bucket é lido (records_read=1) mas como steps=0, nenhum daily_record
        é criado → 0 inseridos. O erro é reportado via exception_type."""
        buckets = [
            {
                "startTimeMillis": "1751328000000",  # ~2026-07-28
                "dataset": [{"point": [{"value": [{"intVal": 0}]}]}],
            }
        ]
        _escrever_json(google_data_dir, "google_steps.json", {"bucket": buckets})

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["records_read"] == 1
        assert resultado["records_inserted"] == 0
        # Nenhuma data foi criada porque steps=0 não chama get_or_create
        assert resultado["records_rejected"] == 0
        # exception_type indica advertência
        assert resultado["exception_type"] == "ADVERTENCIA"


class TestGoogleImporterBloodPressure:
    """Testes focados no arquivo google_blood_pressure.json."""

    def test_importa_pa(self, repo: LongevityRepository, google_data_dir: Path):
        """Importa PA de 2 datas."""
        buckets = [
            _bp_bucket("2026-07-28", 118, 76),
            _bp_bucket("2026-07-29", 120, 78),
        ]
        _escrever_json(google_data_dir, "google_blood_pressure.json", {"bucket": buckets})

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 2
        assert resultado["records_inserted"] == 2

        metrics = repo.get_daily_metrics(days=5)
        bp_dict = {m["date_ref"]: (m["systolic_bp"], m["diastolic_bp"]) for m in metrics}
        assert bp_dict["2026-07-28"] == (118, 76)
        assert bp_dict["2026-07-29"] == (120, 78)


class TestGoogleImporterHeartRate:
    """Testes focados no arquivo google_heart.json."""

    def test_importa_fc(self, repo: LongevityRepository, google_data_dir: Path):
        """Importa FC de 3 datas."""
        buckets = [
            _heart_bucket("2026-07-28", 55.0),
            _heart_bucket("2026-07-29", 58.0),
            _heart_bucket("2026-07-30", 52.0),
        ]
        _escrever_json(google_data_dir, "google_heart.json", {"bucket": buckets})

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 3
        assert resultado["records_inserted"] == 3

        metrics = repo.get_daily_metrics(days=5)
        hr_dict = {m["date_ref"]: m["rhr_bpm"] for m in metrics}
        assert hr_dict["2026-07-28"] == 55.0
        assert hr_dict["2026-07-29"] == 58.0
        assert hr_dict["2026-07-30"] == 52.0


class TestGoogleImporterCombinado:
    """Testes com múltiplos arquivos e datas sobrepostas."""

    def test_mesma_data_em_multiplos_arquivos(self, repo: LongevityRepository, google_data_dir: Path):
        """Steps + PA + FC para a mesma data são combinados em um único registro."""
        data = "2026-07-28"
        _escrever_json(google_data_dir, "google_steps.json", {
            "bucket": [_steps_bucket(data, 8500)]
        })
        _escrever_json(google_data_dir, "google_blood_pressure.json", {
            "bucket": [_bp_bucket(data, 118, 76)]
        })
        _escrever_json(google_data_dir, "google_heart.json", {
            "bucket": [_heart_bucket(data, 55.0)]
        })

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["records_read"] == 3  # 3 buckets ao todo
        assert resultado["records_inserted"] == 1  # 1 data combinada
        assert resultado["records_rejected"] == 0

        metrics = repo.get_daily_metrics(days=5)
        assert len(metrics) == 1
        m = metrics[0]
        assert m["steps"] == 8500
        assert m["systolic_bp"] == 118
        assert m["diastolic_bp"] == 76
        assert m["rhr_bpm"] == 55.0
        assert m["source"] == "GoogleFit"

    def test_json_invalido(self, repo: LongevityRepository, google_data_dir: Path):
        """Arquivo JSON mal-formado é reportado como erro."""
        filepath = google_data_dir / "google_steps.json"
        filepath.write_text("Isto não é JSON válido {", encoding="utf-8")

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["status"] == "SUCESSO"  # Não quebra, reporta advertência
        assert resultado["records_read"] == 0
        assert resultado["exception_type"] == "ADVERTENCIA"
        assert "JSON" in (resultado["exception_message"] or "")

    def test_sem_fonte_no_bucket(self, repo: LongevityRepository, google_data_dir: Path):
        """Bucket sem startTimeMillis — o padrão 0 vira 1970-01-01, mas ainda com steps."""
        _escrever_json(google_data_dir, "google_steps.json", {
            "bucket": [
                {"dataset": [{"point": [{"value": [{"intVal": 5000}]}]}]}
            ]
        })

        resultado = import_google_health_data(google_data_dir, repo)

        # startTimeMillis padrão 0 → timestamp 1970-01-01. Dados ainda são inseridos.
        assert resultado["records_read"] == 1
        assert resultado["records_inserted"] == 1  # data 1970-01-01 com 5000 steps

    def test_bucket_sem_valores(self, repo: LongevityRepository, google_data_dir: Path):
        """Bucket com dataset vazio — nenhum dado, mas sem crash."""
        _escrever_json(google_data_dir, "google_steps.json", {
            "bucket": [
                {
                    "startTimeMillis": "1751328000000",
                    "dataset": [{"point": [{"value": []}]}],
                }
            ]
        })

        resultado = import_google_health_data(google_data_dir, repo)

        assert resultado["records_read"] == 1
        assert resultado["records_inserted"] == 0
        # step_val = 0 (value vazio) → get_or_create não é chamado → sem datas → 0 rejeitados
        assert resultado["records_rejected"] == 0


class TestResultContract:
    """Verifica que o contrato ImportResult é respeitado."""

    CONTRACT_KEYS = {
        "records_read", "records_inserted", "records_rejected",
        "source_path", "status", "summary",
        "exception_type", "exception_message",
    }

    def test_contrato_aviso(self, repo: LongevityRepository):
        inexistente = Path("/tmp/google_nao_existe")
        resultado = import_google_health_data(inexistente, repo)

        assert set(resultado.keys()) == self.CONTRACT_KEYS
        assert resultado["status"] == "AVISO"
        assert resultado["exception_type"] is None

    def test_contrato_sucesso(self, repo: LongevityRepository, google_data_dir: Path):
        """Com dados sintéticos, contrato é respeitado e exception é None."""
        _escrever_json(google_data_dir, "google_steps.json", {
            "bucket": [_steps_bucket("2026-07-28", 8000)]
        })

        resultado = import_google_health_data(google_data_dir, repo)

        assert set(resultado.keys()) == self.CONTRACT_KEYS
        assert resultado["status"] == "SUCESSO"
        assert resultado["exception_type"] is None
        assert resultado["exception_message"] is None
