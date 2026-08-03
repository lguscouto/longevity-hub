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
