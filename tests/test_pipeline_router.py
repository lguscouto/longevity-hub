"""Testes para o endpoint de histórico do pipeline (Task 4.1)."""

import json
import pytest
from fastapi.testclient import TestClient


class TestPipelineRouter:
    """Testa GET /api/pipeline-runs com dados sintéticos."""

    def test_returns_empty_list_when_no_runs(self, client: TestClient):
        """Sem nenhum pipeline_run registrado, retorna lista vazia."""
        response = client.get("/api/pipeline-runs")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_single_run(self, client: TestClient, tmp_path):
        """Registra uma execução e verifica os campos retornados."""
        # Registra via repositório direto
        from longevidade.db.repository import LongevityRepository

        db_path = tmp_path / "longevity-test.sqlite3"
        from longevidade.db.schema import initialize_db
        initialize_db(db_path)
        repo = LongevityRepository(db_path)
        repo.log_pipeline_run("Zepp", 150, "sucesso", "Importados 150 registros")

        # Cria um client apontando para esse banco
        import os
        os.environ["LONGEVIDADE_DB_PATH"] = str(db_path)
        # Recarrega o módulo main
        import importlib
        import sys
        for mod in list(sys.modules):
            if mod.startswith("backend.app"):
                sys.modules.pop(mod, None)
        main = importlib.import_module("backend.app.main")

        with TestClient(main.app) as test_client:
            response = test_client.get("/api/pipeline-runs")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        entry = data[0]
        assert entry["source"] == "Zepp"
        assert entry["records_inserted"] == 150
        assert entry["status"] == "sucesso"
        assert "run_at" in entry
        assert "log_summary" in entry

    def test_returns_multi_source_runs_ordered_by_recency(self, client: TestClient, tmp_path):
        """Múltiplas execuções de fontes diferentes, ordem descendente."""
        from longevidade.db.repository import LongevityRepository
        from longevidade.db.schema import initialize_db

        db_path = tmp_path / "multi-test.sqlite3"
        initialize_db(db_path)
        repo = LongevityRepository(db_path)
        repo.log_pipeline_run("Zepp", 100, "sucesso", "Zepp ok")
        repo.log_pipeline_run("GoogleFit", 0, "erro", "Arquivo não encontrado")
        repo.log_pipeline_run("Zepp", 50, "sucesso", "50 registros")

        import os
        import importlib, sys
        os.environ["LONGEVIDADE_DB_PATH"] = str(db_path)
        for mod in list(sys.modules):
            if mod.startswith("backend.app"):
                sys.modules.pop(mod, None)
        main = importlib.import_module("backend.app.main")

        with TestClient(main.app) as test_client:
            response = test_client.get("/api/pipeline-runs?limit=5")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # A mais recente primeiro (terceira inserida)
        first = data[0]
        assert first["source"] == "Zepp"
        assert first["records_inserted"] == 50

        second = data[1]
        assert second["source"] == "GoogleFit"
        assert second["records_inserted"] == 0
        assert second["status"] == "erro"

    def test_log_summary_sanitizes_paths(self, client: TestClient, tmp_path):
        """Log com caminho de arquivo no conteúdo é sanitizado."""
        from longevidade.db.repository import LongevityRepository
        from longevidade.db.schema import initialize_db

        db_path = tmp_path / "sanitize-test.sqlite3"
        initialize_db(db_path)
        repo = LongevityRepository(db_path)
        repo.log_pipeline_run(
            "Zepp", 10, "sucesso",
            "Processado /c:/Users/gustavo/data/zepp_export.csv com 10 linhas"
        )

        sanitized = repo._sanitize_log_summary(
            "Processado /c:/Users/gustavo/data/zepp_export.csv com 10 linhas"
        )
        assert "[caminho]" in sanitized

    def test_contrato_0_registros(self, client: TestClient, tmp_path):
        """Execução com 0 registros válidos — deve ser visível na resposta."""
        from longevidade.db.repository import LongevityRepository
        from longevidade.db.schema import initialize_db

        db_path = tmp_path / "zero-test.sqlite3"
        initialize_db(db_path)
        repo = LongevityRepository(db_path)
        repo.log_pipeline_run("Zepp", 0, "sucesso", "0 registros novos")

        import os, importlib, sys
        os.environ["LONGEVIDADE_DB_PATH"] = str(db_path)
        for mod in list(sys.modules):
            if mod.startswith("backend.app"):
                sys.modules.pop(mod, None)
        main = importlib.import_module("backend.app.main")

        with TestClient(main.app) as test_client:
            response = test_client.get("/api/pipeline-runs")

        data = response.json()
        zero_run = data[0]
        assert zero_run["records_inserted"] == 0
        assert "0 registros" in zero_run["log_summary"]

    def test_contrato_falha_importacao(self, client: TestClient, tmp_path):
        """Execução com falha de importação — status deve ser 'erro'."""
        from longevidade.db.repository import LongevityRepository
        from longevidade.db.schema import initialize_db

        db_path = tmp_path / "fail-test.sqlite3"
        initialize_db(db_path)
        repo = LongevityRepository(db_path)
        repo.log_pipeline_run("GoogleFit", 0, "erro", "Falha de importação: arquivo não encontrado")

        import os, importlib, sys
        os.environ["LONGEVIDADE_DB_PATH"] = str(db_path)
        for mod in list(sys.modules):
            if mod.startswith("backend.app"):
                sys.modules.pop(mod, None)
        main = importlib.import_module("backend.app.main")

        with TestClient(main.app) as test_client:
            response = test_client.get("/api/pipeline-runs")

        data = response.json()
        fail_run = data[0]
        assert fail_run["status"] == "erro"
        assert fail_run["log_summary"] != ""
