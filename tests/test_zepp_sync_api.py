from __future__ import annotations

import importlib


def test_sync_zepp_retorna_erro_e_nao_reconcilia_google_quando_a_coleta_falha(
    client, monkeypatch
):
    """O endpoint não pode mascarar uma coleta Zepp falha como sincronização bem-sucedida."""
    metrics = importlib.import_module("backend.app.routers.metrics")
    google_called = False

    def google_import_should_not_run(*_args, **_kwargs):
        nonlocal google_called
        google_called = True
        raise AssertionError("Google não deve ser importado após falha de coleta Zepp")

    monkeypatch.setattr(
        metrics,
        "import_zepp_data",
        lambda *_args, **_kwargs: {
            "status": "ERRO",
            "summary": "A coleta Zepp não foi concluída; snapshots antigos não foram importados.",
            "records_inserted": 0,
        },
    )
    monkeypatch.setattr(metrics, "import_google_health_data", google_import_should_not_run)

    response = client.post("/api/metrics/sync/zepp")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "A coleta Zepp não foi concluída; snapshots antigos não foram importados."
    }
    assert google_called is False


def test_sync_zepp_repassa_parametros_days_e_full(client, monkeypatch):
    """O endpoint deve aceitar e repassar os parâmetros days e full para o importador Zepp."""
    metrics = importlib.import_module("backend.app.routers.metrics")
    captured_args = {}

    def mock_import_zepp(zepp_dir, repo, days=None, full=False):
        captured_args["days"] = days
        captured_args["full"] = full
        return {
            "status": "SUCESSO",
            "summary": "Importação concluída com sucesso.",
            "records_inserted": 10,
        }

    monkeypatch.setattr(metrics, "import_zepp_data", mock_import_zepp)
    monkeypatch.setattr(
        metrics,
        "import_google_health_data",
        lambda *_args, **_kwargs: {"status": "SUCESSO", "records_inserted": 0},
    )

    response = client.post("/api/metrics/sync/zepp?days=120&full=true")

    assert response.status_code == 200
    assert captured_args["days"] == 120
    assert captured_args["full"] is True
    assert response.json()["status"] == "ok"
    assert response.json()["zepp_records_imported"] == 10

