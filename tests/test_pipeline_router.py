"""Testes para o endpoint de histórico do pipeline (Task 4.1)."""

from fastapi.testclient import TestClient

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository


class TestPipelineRouter:
    """Testa GET /api/pipeline-runs com dados sintéticos."""

    def test_returns_empty_list_when_no_runs(self, client: TestClient):
        """Sem nenhum pipeline_run registrado, retorna lista vazia."""
        response = client.get("/api/pipeline-runs")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_single_run(self, client: TestClient):
        """Registra uma execução e verifica os campos retornados."""
        repo = LongevityRepository(get_db_path())
        repo.log_pipeline_run("Zepp", 150, "sucesso", "Importados 150 registros")

        response = client.get("/api/pipeline-runs")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        entry = data[0]
        assert entry["source"] == "Zepp"
        assert entry["records_inserted"] == 150
        assert entry["status"] == "sucesso"
        assert "run_at" in entry
        assert "log_summary" in entry

    def test_returns_multi_source_runs_ordered_by_recency(self, client: TestClient):
        """Múltiplas execuções de fontes diferentes, ordem descendente."""
        repo = LongevityRepository(get_db_path())
        repo.log_pipeline_run("Zepp", 100, "sucesso", "Zepp ok")
        repo.log_pipeline_run("GoogleHealth", 0, "erro", "Arquivo não encontrado")
        repo.log_pipeline_run("Zepp", 50, "sucesso", "50 registros")

        response = client.get("/api/pipeline-runs?limit=5")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        first = data[0]
        assert first["source"] == "Zepp"
        assert first["records_inserted"] == 50

        second = data[1]
        assert second["source"] == "GoogleHealth"
        assert second["records_inserted"] == 0
        assert second["status"] == "erro"

    def test_log_summary_sanitizes_paths(self, client: TestClient):
        """Log com caminho de arquivo no conteúdo é sanitizado."""
        repo = LongevityRepository(get_db_path())
        repo.log_pipeline_run(
            "Zepp", 10, "sucesso",
            "Processado /c:/Users/gustavo/data/zepp_export.csv com 10 linhas"
        )

        sanitized = repo._sanitize_log_summary(
            "Processado /c:/Users/gustavo/data/zepp_export.csv com 10 linhas"
        )
        assert "[caminho]" in sanitized

    def test_contrato_0_registros(self, client: TestClient):
        """Execução com 0 registros válidos — deve ser visível na resposta."""
        repo = LongevityRepository(get_db_path())
        repo.log_pipeline_run("Zepp", 0, "sucesso", "0 registros novos")

        response = client.get("/api/pipeline-runs")

        data = response.json()
        zero_run = data[0]
        assert zero_run["records_inserted"] == 0
        assert "0 registros" in zero_run["log_summary"]

    def test_contrato_falha_importacao(self, client: TestClient):
        """Execução com falha de importação — status deve ser 'erro'."""
        repo = LongevityRepository(get_db_path())
        repo.log_pipeline_run("GoogleFit", 0, "erro", "Falha de importação: arquivo não encontrado")

        response = client.get("/api/pipeline-runs")

        data = response.json()
        fail_run = data[0]
        assert fail_run["status"] == "erro"
        assert fail_run["log_summary"] != ""
