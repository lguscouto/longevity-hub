from __future__ import annotations

import importlib
from fastapi.testclient import TestClient


def test_sync_all_sucesso_com_zepp_google_e_hevy(client: TestClient, monkeypatch):
    """O endpoint unificado /api/sync/all deve sincronizar Zepp, Google Health e Hevy."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "summary": "Importação Zepp concluída.",
            "records_inserted": 12,
            "data_covered_until": "2026-10-06 08:00:00",
        },
    )
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "records_inserted": 5,
        },
    )

    hevy_client_mod = importlib.import_module("longevidade.ingestion.hevy_client")
    monkeypatch.setattr(
        hevy_client_mod.HevyCredentials,
        "get_api_key",
        lambda *args, **kwargs: "test-api-key-12345",
    )
    monkeypatch.setattr(
        hevy_client_mod,
        "sync_hevy_workouts",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "records_inserted": 3,
            "records_updated": 0,
            "summary": "3 treinos inseridos.",
        },
    )

    response = client.post("/api/sync/all")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["total_sources"] == 3
    assert data["zepp_records_imported"] == 12
    assert data["google_health_records_imported"] == 5
    assert data["hevy_records_imported"] == 3
    assert data["data_covered_until"] == "2026-10-06 08:00:00"


def test_sync_all_sem_chave_hevy_pula_com_elegancia(client: TestClient, monkeypatch):
    """Quando o Hevy não estiver configurado, deve ser ignorado sem falhar a sincronização."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "summary": "Importação Zepp concluída.",
            "records_inserted": 8,
        },
    )
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "records_inserted": 2,
        },
    )

    hevy_client_mod = importlib.import_module("longevidade.ingestion.hevy_client")
    monkeypatch.setattr(hevy_client_mod.HevyCredentials, "get_api_key", lambda: None)

    response = client.post("/api/sync/all")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["total_sources"] == 3
    assert data["zepp_records_imported"] == 8
    assert data["google_health_records_imported"] == 2
    assert data["hevy_records_imported"] == 0
    assert data["hevy"]["status"] == "skipped"


def test_sync_all_reports_partial_and_sanitizes_provider_failure(client: TestClient, monkeypatch):
    metrics = importlib.import_module('backend.app.routers.metrics')
    monkeypatch.setattr(metrics, 'import_zepp_data', lambda *a, **k: {'status': 'SUCESSO', 'records_inserted': 1})
    monkeypatch.setattr(metrics, 'import_google_health_data', lambda *a, **k: {'status': 'SUCESSO', 'records_inserted': 0})
    hevy = importlib.import_module('longevidade.ingestion.hevy_client')
    monkeypatch.setattr(hevy.HevyCredentials, 'get_api_key', lambda *a, **k: 'test-key')
    def fail(*args, **kwargs):
        raise RuntimeError('secret-do-not-display')
    monkeypatch.setattr(hevy, 'sync_hevy_workouts', fail)
    response = client.post('/api/sync/all')
    assert response.status_code == 200
    assert response.json()['status'] == 'partial'
    assert 'secret-do-not-display' not in response.text
    assert client.get('/api/metrics/sync/status').json()['last_status'] == 'partial'


def test_sync_all_falha_zepp_retorna_502(client: TestClient, monkeypatch):
    """Se a coleta Zepp falhar, o endpoint deve retornar 502 e não mascarar erro."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *_args, **_kwargs: {
            "status": "ERRO",
            "summary": "segredo-simulado-do-provedor",
            "records_inserted": 0,
        },
    )

    response = client.post("/api/sync/all")

    assert response.status_code == 502
    assert response.json() == {"detail": "Não foi possível atualizar os dados do Zepp."}


def test_metrics_sync_all_alias_endpoint(client: TestClient, monkeypatch):
    """O endpoint /api/metrics/sync/all deve funcionar como rota de primeiro nível do router."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "records_inserted": 1,
        },
    )
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *_args, **_kwargs: {
            "status": "SUCESSO",
            "records_inserted": 0,
        },
    )

    hevy_client_mod = importlib.import_module("longevidade.ingestion.hevy_client")
    monkeypatch.setattr(hevy_client_mod.HevyCredentials, "get_api_key", lambda: None)

    response = client.post("/api/metrics/sync/all")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
