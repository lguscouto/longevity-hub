from __future__ import annotations

import importlib
import threading
import time
import pytest


def test_sync_zepp_concurrency_lock_returns_409(client, monkeypatch):
    """Quando uma sincronização está em andamento, nova chamada retorna HTTP 409 Conflict."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    sync_started = threading.Event()
    sync_continue = threading.Event()

    def slow_import_zepp(*args, **kwargs):
        sync_started.set()
        sync_continue.wait(timeout=5.0)
        return {
            "status": "SUCESSO",
            "summary": "Importado com sucesso",
            "records_inserted": 1,
            "workouts_inserted": 1,
        }

    monkeypatch.setattr(metrics, "import_zepp_data", slow_import_zepp)
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *args, **kwargs: {"status": "SUCESSO", "records_inserted": 0},
    )

    t1_response = {}

    def run_first_sync():
        t1_response["res"] = client.post("/api/metrics/sync/zepp")

    t1 = threading.Thread(target=run_first_sync)
    t1.start()

    # Aguarda o primeiro sync iniciar e adquirir o lock
    assert sync_started.wait(timeout=3.0)

    try:
        # Verifica status enquanto sincroniza
        status_res = client.get("/api/metrics/sync/status")
        assert status_res.status_code == 200
        assert status_res.json()["is_syncing"] is True

        # Segunda chamada deve falhar com HTTP 409 Conflict
        res_conflict = client.post("/api/metrics/sync/zepp")
        assert res_conflict.status_code == 409
        assert "já está em andamento" in res_conflict.json()["detail"]

        # Verifica alias de rota
        res_alias_status = client.get("/api/sync/status")
        assert res_alias_status.status_code == 200
        assert res_alias_status.json()["is_syncing"] is True

    finally:
        # Libera o primeiro sync
        sync_continue.set()
        t1.join(timeout=3.0)

    # Valida resposta do primeiro sync
    assert t1_response["res"].status_code == 200
    assert t1_response["res"].json()["status"] == "ok"

    # Valida que o lock foi liberado e status atualizado
    final_status = client.get("/api/metrics/sync/status").json()
    assert final_status["is_syncing"] is False
    assert final_status["last_status"] == "success"


def test_sync_zepp_lock_released_on_error(client, monkeypatch):
    """Quando o sync falha com exceção, o lock deve ser liberado no finally."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    def failing_import(*args, **kwargs):
        raise RuntimeError("Falha inesperada no driver Zepp")

    monkeypatch.setattr(metrics, "import_zepp_data", failing_import)

    with pytest.raises(RuntimeError, match="Falha inesperada no driver Zepp"):
        client.post("/api/metrics/sync/zepp")

    # Verifica status de erro e liberação do lock
    status = client.get("/api/metrics/sync/status").json()
    assert status["is_syncing"] is False
    assert status["last_status"] == "error"
    assert "Falha inesperada" in str(status["last_error"])

    # Permite nova requisição sem ficar travado em 409
    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *args, **kwargs: {"status": "SUCESSO", "records_inserted": 2, "workouts_inserted": 1},
    )
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *args, **kwargs: {"status": "SUCESSO", "records_inserted": 0},
    )

    retry_res = client.post("/api/metrics/sync/zepp")
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] == "ok"


def test_sync_aliases(client, monkeypatch):
    """Valida os aliases /api/v1/sync/zepp e /api/sync/status."""
    metrics = importlib.import_module("backend.app.routers.metrics")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *args, **kwargs: {"status": "SUCESSO", "records_inserted": 1, "workouts_inserted": 0},
    )
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *args, **kwargs: {"status": "SUCESSO", "records_inserted": 0},
    )

    # Chamada pelo alias legado /api/v1/sync/zepp
    res = client.post("/api/v1/sync/zepp")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Verificação pelo alias /api/sync/status
    status_res = client.get("/api/sync/status")
    assert status_res.status_code == 200
    assert status_res.json()["last_status"] == "success"
