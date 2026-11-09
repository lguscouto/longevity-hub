from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient

from longevidade.sync_lock import (
    SyncLockError,
    SyncLockTimeoutError,
    file_sync_lock,
)
from scripts.run_scheduled_sync import run_sync


def test_file_sync_lock_acquisition_and_release(tmp_path: Path):
    lock_file = tmp_path / "sync.lock"

    # 1. Adquire e libera com sucesso
    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0) as path:
        assert path == lock_file
        assert lock_file.exists()

    # 2. Pode adquirir novamente após liberação
    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0) as path2:
        assert path2 == lock_file


def test_file_sync_lock_timeout_when_held(tmp_path: Path):
    lock_file = tmp_path / "sync.lock"

    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0):
        # Tentar adquirir o mesmo lock enquanto ocupado deve disparar SyncLockTimeoutError
        with pytest.raises(SyncLockTimeoutError, match="Não foi possível obter o lock exclusivo"):
            with file_sync_lock(lock_path=lock_file, timeout_seconds=0.2, poll_interval=0.05):
                pass


def test_scheduled_sync_aborts_gracefully_when_locked(tmp_path: Path):
    db_file = tmp_path / "test.sqlite3"
    lock_file = db_file.parent / "sync.lock"

    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0):
        # Dispara run_sync com o lock ocupado
        with patch("longevidade.sync_lock._get_default_lock_path", return_value=lock_file):
            result = run_sync(db_path=db_file, skip_zepp=True, skip_google=True, skip_hevy=True, skip_kdm=True)
            assert result["success"] is False
            assert result.get("skipped") is True
            assert any("Lock de sincronização ocupado" in err for err in result["errors"])


def test_api_sync_returns_409_when_file_locked(client: TestClient, tmp_path: Path):
    from longevidade.sync_lock import _get_default_lock_path
    lock_file = _get_default_lock_path()

    # Segura o lock de arquivo simulando o Agendador de Tarefas do Windows em execução
    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0):
        resp = client.post("/api/metrics/sync/zepp")
        assert resp.status_code == 409
        detail = resp.json().get("detail", "")
        assert "em andamento" in detail or "sistema operacional" in detail


def test_google_health_and_hevy_sync_return_409_when_file_locked(client: TestClient):
    from backend.app.config import get_db_path

    lock_file = get_db_path().parent / "sync.lock"
    with file_sync_lock(lock_path=lock_file, timeout_seconds=1.0):
        # 1. Google Health sync deve retornar 409
        resp_gh = client.post("/api/google-health/sync")
        assert resp_gh.status_code == 409
        assert "em andamento" in resp_gh.json().get("detail", "") or "lock de arquivo" in resp_gh.json().get("detail", "")

        # 2. Hevy sync deve retornar 409
        resp_hevy = client.post("/api/workouts/hevy/sync")
        assert resp_hevy.status_code == 409
        assert "em andamento" in resp_hevy.json().get("detail", "") or "lock de arquivo" in resp_hevy.json().get("detail", "")

