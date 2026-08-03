"""
Testes determinísticos para o importador Zepp (zepp_importer).

Usa fixtures sintéticas — nunca dados reais, diretórios reais ou APIs externas.
O módulo health_metrics.build_zepp_daily_record é simulado via módulo sintético
escrito em um diretório temporário, replicando o contrato que o importador espera.
"""

from __future__ import annotations

import json
import sys
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict
from unittest import mock

import pytest

from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
import longevidade.ingestion.zepp_importer as zepp_importer
from longevidade.ingestion.zepp_importer import import_zepp_data


# ---------------------------------------------------------------------------
# Helpers para construir registros sintéticos
# ---------------------------------------------------------------------------

def _make_zepp_record(
    data_referencia: str,
    passos: int | None = 8500,
    sono_min: int | None = 420,
    sono_profundo: int | None = 90,
    sono_leve: int | None = 200,
    sono_rem: int | None = 100,
    tempo_acordado: int | None = 30,
    fc_repouso: float | None = 55.0,
    fc_media: float | None = 68.0,
    hrv: float | None = 62.0,
    readiness: float | None = 85.0,
    peso: float | None = None,
    imc: float | None = None,
    vo2: float | None = None,
    temperatura: float | None = None,
    estresse: int | None = None,
) -> Dict[str, Any]:
    record: Dict[str, Any] = {"data_referencia": data_referencia}
    if passos is not None:
        record["passos_zepp"] = passos
    if sono_min is not None:
        record["sono_zepp_min"] = sono_min
    if sono_profundo is not None:
        record["sono_profundo_min"] = sono_profundo
    if sono_leve is not None:
        record["sono_leve_min"] = sono_leve
    if sono_rem is not None:
        record["sono_rem_min"] = sono_rem
    if tempo_acordado is not None:
        record["tempo_acordado_min"] = tempo_acordado
    if fc_repouso is not None:
        record["fc_repouso_bpm"] = fc_repouso
    if fc_media is not None:
        record["fc_media_bpm"] = fc_media
    if hrv is not None:
        record["hrv_sono_ms"] = hrv
    if readiness is not None:
        record["readiness"] = readiness
    if peso is not None:
        record["peso_kg"] = peso
    if imc is not None:
        record["imc"] = imc
    if vo2 is not None:
        record["vo2_max"] = vo2
    if temperatura is not None:
        record["temperatura_c"] = temperatura
    if estresse is not None:
        record["amostras_estresse"] = estresse
    return record


def _escrever_mock_health_metrics(scripts_dir: Path) -> None:
    """
    Cria um módulo health_metrics.py sintético no diretório de scripts
    que simula a função build_zepp_daily_record. A função retorna registros
    pré-definidos através de um dicionário compartilhado (mock_records_by_date),
    permitindo que cada teste controle exatamente o que será retornado.
    """
    codigo = '''
from datetime import date
from pathlib import Path
from typing import Any, Dict, Optional

# Dicionário compartilhado: data ISO -> registro Zepp (ou None para simular falta de arquivo)
mock_records_by_date: Dict[str, Optional[Dict[str, Any]]] = {}
mock_calls: list[str] = []

def build_zepp_daily_record(data_dir: Path, ref_date: date) -> Optional[Dict[str, Any]]:
    date_str = ref_date.isoformat()
    mock_calls.append(date_str)
    return mock_records_by_date.get(date_str)

def reset_mock() -> None:
    mock_records_by_date.clear()
    mock_calls.clear()
'''
    scripts_dir.mkdir(parents=True, exist_ok=True)
    (scripts_dir / "health_metrics.py").write_text(codigo, encoding="utf-8")


@pytest.fixture
def repo(tmp_path) -> LongevityRepository:
    """Fixture que cria um banco SQLite temporário."""
    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    return LongevityRepository(db_path)


@pytest.fixture
def zepp_env(tmp_path) -> Path:
    """
    Cria ambiente sintético para teste do Zepp:
      tmp_path/zepp_data/   -> data_dir (existe, mas vazio)
      tmp_path/scripts/     -> health_metrics.py mockado

    Retorna tmp_path (data_dir = tmp_path / "zepp_data").
    """
    scripts_dir = tmp_path / "scripts"
    _escrever_mock_health_metrics(scripts_dir)
    data_dir = tmp_path / "zepp_data"
    data_dir.mkdir(exist_ok=True)

    # Importa o módulo mock para termos acesso ao dicionário compartilhado
    sys.modules.pop("health_metrics", None)
    sys.path.insert(0, str(scripts_dir))
    # (A importação real será feita dinamicamente pelo import_zepp_data)

    return tmp_path  # caller constrói data_dir relativo


def _get_mock_module() -> Any:
    """Retorna o módulo health_metrics mockado, se já importado."""
    return sys.modules.get("health_metrics")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestZeppImporterSemDados:
    """Cenários onde não há dados sintéticos configurados."""

    def test_diretorio_inexistente(self, repo: LongevityRepository):
        """Quando o diretório não existe, retorna ERRO com summary descritivo."""
        inexistente = Path("/caminho/inexistente/zepp_data")
        resultado = import_zepp_data(inexistente, repo, days=5)

        assert resultado["status"] == "ERRO"
        assert resultado["records_inserted"] == 0
        assert resultado["records_read"] == 0
        assert "não existe" in resultado["summary"]

    def test_sem_health_metrics(self, repo: LongevityRepository, tmp_path):
        """Se scripts_dir não existir, import falha e retorna ERRO."""
        data_dir = tmp_path / "zepp_data"
        data_dir.mkdir(parents=True, exist_ok=True)
        # Não cria scripts_dir -> o import de health_metrics vai falhar

        from longevidade.ingestion.zepp_importer import import_zepp_data
        resultado = import_zepp_data(data_dir, repo, days=5)

        assert resultado["status"] == "ERRO"
        assert resultado["records_inserted"] == 0
        assert resultado["exception_type"] == "ImportError"

    def test_nenhum_registro_valido(self, repo: LongevityRepository, zepp_env: Path):
        """Se build_zepp_daily_record retorna None (arquivo ausente), todos os dias são rejeitados."""
        data_dir = zepp_env / "zepp_data"

        resultado = import_zepp_data(data_dir, repo, days=3)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 3  # 3 dias tentados
        assert resultado["records_inserted"] == 0
        assert resultado["records_rejected"] == 3  # todos rejeitados
        assert "rejeitados" in resultado["summary"]


class TestZeppImporterComDados:
    """Cenários com registros sintéticos configurados."""

    def test_importa_registros_validos(self, repo: LongevityRepository, zepp_env: Path):
        """Importa N dias com dados completos e verifica contagem + persistência."""
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")

        hoje = date.today()
        for i in range(5):
            ref = hoje - timedelta(days=i)
            hm.mock_records_by_date[ref.isoformat()] = _make_zepp_record(
                data_referencia=ref.isoformat(),
                passos=10000 - i * 500,
                sono_min=420 + i * 10,
                fc_repouso=55.0 + i,
            )

        resultado = import_zepp_data(data_dir, repo, days=5)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 5
        assert resultado["records_inserted"] == 5
        assert resultado["records_rejected"] == 0

        # Verifica persistência
        metrics = repo.get_daily_metrics(days=10)
        assert len(metrics) == 5
        steps_hoje = [m["steps"] for m in metrics if m["date_ref"] == hoje.isoformat()]
        assert len(steps_hoje) == 1
        assert steps_hoje[0] == 10000

    def test_aguarda_coleta_da_nuvem_antes_de_ler_snapshots(
        self, repo: LongevityRepository, zepp_env: Path, monkeypatch: pytest.MonkeyPatch
    ):
        """O Sync Zepp precisa importar o snapshot atualizado pela coleta atual, não o anterior."""
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")
        hoje = date.today()
        fetch_calls: list[Path] = []

        def cloud_fetch_sincrono(received_scripts_dir: Path) -> None:
            fetch_calls.append(received_scripts_dir)
            hm.mock_records_by_date[hoje.isoformat()] = _make_zepp_record(
                data_referencia=hoje.isoformat(), passos=12345
            )

        monkeypatch.setattr(
            zepp_importer,
            "run_zepp_cloud_fetch",
            cloud_fetch_sincrono,
            raising=False,
        )

        resultado = import_zepp_data(data_dir, repo, days=1)

        assert fetch_calls == [scripts_dir]
        assert resultado["status"] == "SUCESSO"
        assert resultado["records_inserted"] == 1
        metrics = repo.get_daily_metrics(days=1)
        assert metrics[0]["date_ref"] == hoje.isoformat()
        assert metrics[0]["steps"] == 12345


    def test_mistura_validos_e_rejeitados(self, repo: LongevityRepository, zepp_env: Path):
        """Dias com registro None (sem arquivo) viram rejeitados; dias com dados viram inseridos."""
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")

        hoje = date.today()
        hm.mock_records_by_date[hoje.isoformat()] = _make_zepp_record(
            data_referencia=hoje.isoformat(), passos=8000
        )
        # ontem fica sem registro (None)
        hm.mock_records_by_date[(hoje - timedelta(days=1)).isoformat()] = None
        # anteontem com dados
        hm.mock_records_by_date[(hoje - timedelta(days=2)).isoformat()] = _make_zepp_record(
            data_referencia=(hoje - timedelta(days=2)).isoformat(),
            sono_min=450,
            fc_repouso=58.0,
        )

        resultado = import_zepp_data(data_dir, repo, days=3)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 3
        assert resultado["records_inserted"] == 2
        assert resultado["records_rejected"] == 1

    def test_registro_sem_campos_essenciais_rejeitado(
        self, repo: LongevityRepository, zepp_env: Path
    ):
        """Registro que existe mas não tem passos_zepp/sono_zepp_min/fc_repouso_bpm é rejeitado."""
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")

        hoje = date.today()
        # Registro com apenas peso — não tem campos essenciais → rejeitado
        hm.mock_records_by_date[hoje.isoformat()] = _make_zepp_record(
            data_referencia=hoje.isoformat(),
            passos=None,
            sono_min=None,
            fc_repouso=None,
            peso=78.5,
            imc=24.5,
        )

        resultado = import_zepp_data(data_dir, repo, days=1)

        assert resultado["status"] == "SUCESSO"
        assert resultado["records_read"] == 1
        assert resultado["records_inserted"] == 0
        assert resultado["records_rejected"] == 1

    def test_log_pipeline_chamado(self, repo: LongevityRepository, zepp_env: Path):
        """Verifica que repo.log_pipeline_run() foi chamado com status correto."""
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")

        hoje = date.today()
        hm.mock_records_by_date[hoje.isoformat()] = _make_zepp_record(
            data_referencia=hoje.isoformat(), passos=9000
        )

        resultado = import_zepp_data(data_dir, repo, days=1)

        # Verifica no banco
        runs = repo.get_pipeline_runs(limit=5)
        runs_zepp = [r for r in runs if r["source"] == "Zepp"]
        assert len(runs_zepp) >= 1
        ultimo = runs_zepp[0]
        assert ultimo["status"] == "SUCESSO"


class TestResultContract:
    """Verifica que o contrato ImportResult é respeitado em todos os cenários."""

    CONTRACT_KEYS = {
        "records_read", "records_inserted", "records_rejected",
        "source_path", "status", "summary",
        "exception_type", "exception_message",
    }

    def test_contrato_erro(self, repo: LongevityRepository):
        inexistente = Path("/tmp/nao_existe_zepp")
        resultado = import_zepp_data(inexistente, repo, days=1)

        assert set(resultado.keys()) == self.CONTRACT_KEYS
        assert resultado["status"] == "ERRO"
        assert resultado["exception_type"] is None  # erro estrutural, não exceção

    def test_contrato_sucesso(self, repo: LongevityRepository, zepp_env: Path):
        data_dir = zepp_env / "zepp_data"
        scripts_dir = zepp_env / "scripts"

        sys.path.insert(0, str(scripts_dir))
        import importlib
        hm = importlib.import_module("health_metrics")

        hoje = date.today()
        hm.mock_records_by_date[hoje.isoformat()] = _make_zepp_record(
            data_referencia=hoje.isoformat(), passos=7000
        )

        resultado = import_zepp_data(data_dir, repo, days=1)

        assert set(resultado.keys()) == self.CONTRACT_KEYS
        assert resultado["status"] == "SUCESSO"
        assert resultado["exception_type"] is None
        assert resultado["exception_message"] is None


class TestZeppCloudFetch:
    def test_rejeita_coleta_com_exit_zero_sem_metadata_atualizado(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        """Um exit code 0 não é suficiente: a coleta deve realmente renovar o snapshot."""
        scripts_dir = tmp_path / "scripts"
        scripts_dir.mkdir()
        (scripts_dir / "zepp_cron.py").write_text("# fixture", encoding="utf-8")
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "metadata.json").write_text(
            json.dumps({"fetched_at": "2026-07-30T13:22:02+00:00", "days": 7}),
            encoding="utf-8",
        )

        monkeypatch.setattr(
            zepp_importer.subprocess,
            "run",
            mock.Mock(return_value=mock.Mock(returncode=0)),
        )

        with pytest.raises(zepp_importer.ZeppCloudFetchError, match="metadata"):
            zepp_importer.run_zepp_cloud_fetch(scripts_dir)

    def test_rejeita_metadata_recente_quando_fontes_primarias_falharam(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        scripts_dir = tmp_path / "scripts"
        scripts_dir.mkdir()
        (scripts_dir / "zepp_cron.py").write_text("# fixture", encoding="utf-8")
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "metadata.json").write_text(
            json.dumps({"fetched_at": datetime.now(timezone.utc).isoformat(), "days": 7}),
            encoding="utf-8",
        )
        for filename in ("band_data.json", "heart_rate.json"):
            (data_dir / filename).write_text(
                json.dumps({"error": "synthetic collector failure", "returncode": 1}),
                encoding="utf-8",
            )

        monkeypatch.setattr(
            zepp_importer.subprocess,
            "run",
            mock.Mock(return_value=mock.Mock(returncode=0)),
        )

        with pytest.raises(zepp_importer.ZeppCloudFetchError, match="fontes primárias"):
            zepp_importer.run_zepp_cloud_fetch(scripts_dir)
