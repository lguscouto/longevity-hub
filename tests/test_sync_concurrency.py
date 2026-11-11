from __future__ import annotations

from pathlib import Path
import subprocess
import sys
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


def test_file_sync_lock_coordinates_separate_processes(tmp_path: Path):
    lock_file = tmp_path / 'sync.lock'
    code = (
        'import sys; from longevidade.sync_lock import file_sync_lock, SyncLockTimeoutError\n'
        'try:\n'
        '  with file_sync_lock(sys.argv[1], timeout_seconds=0.2, poll_interval=0.05): pass\n'
        'except SyncLockTimeoutError: sys.exit(7)\n'
    )
    with file_sync_lock(lock_path=lock_file, timeout_seconds=1):
        result = subprocess.run([sys.executable, '-c', code, str(lock_file)], capture_output=True, text=True, timeout=10)
        assert result.returncode == 7, result.stderr
    result = subprocess.run([sys.executable, '-c', code, str(lock_file)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stderr


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


def test_webhook_sync_respects_shared_lock(client: TestClient, monkeypatch, caplog):
    from backend.app.config import get_db_path
    from backend.app.routers import google_health

    fake_client = type('Client', (), {'is_authenticated': lambda self: True})()
    monkeypatch.setattr(google_health, 'GoogleHealthClient', lambda **kwargs: fake_client)
    with patch.object(google_health, 'sync_google_health_api') as sync:
        with file_sync_lock(get_db_path().parent / 'sync.lock', timeout_seconds=1):
            google_health._process_webhook_sync(data_type='steps')
        sync.assert_not_called()
    assert 'outra sincronização está em andamento' in caplog.text
    pending = get_db_path().with_suffix('.google-retry')
    assert pending.read_bytes() == b''

    from scripts import run_scheduled_sync
    fake_client.is_reauthentication_required = lambda: False
    monkeypatch.setattr(run_scheduled_sync, 'GoogleHealthClient', lambda: fake_client)
    monkeypatch.setattr(run_scheduled_sync, 'import_google_health_data', lambda *args: {'status': 'SUCESSO'})
    opts = dict(db_path=get_db_path(), skip_zepp=True, skip_hevy=True, skip_kdm=True)
    monkeypatch.setattr(run_scheduled_sync, 'sync_google_health_api', lambda **kwargs: {'status': 'ERRO'})
    run_scheduled_sync.run_sync(**opts)
    claimed = get_db_path().with_suffix('.google-retry-running')
    assert claimed.exists()
    assert not pending.exists()

    def success_with_new_event(**kwargs):
        from longevidade.ingestion.google_retry import mark_google_retry
        mark_google_retry(get_db_path())
        return {'status': 'SUCESSO'}

    monkeypatch.setattr(run_scheduled_sync, 'sync_google_health_api', success_with_new_event)
    run_scheduled_sync.run_sync(**opts)
    assert not claimed.exists()
    assert pending.exists()


def test_daily_upsert_invalidates_only_quality_for_written_fields(tmp_path: Path):
    from longevidade.db.repository import LongevityRepository
    from longevidade.db.schema import initialize_db

    db = tmp_path / 'synthetic.sqlite3'
    initialize_db(db)
    repo = LongevityRepository(db)
    day = '2026-10-01'
    repo.upsert_daily_metric({'date_ref': day, 'steps': 100, 'rhr_bpm': 60, 'source': 'Zepp'})
    repo.save_daily_metric_quality([
        {'date_ref': day, 'metric_key': key, 'source': 'Zepp'} for key in ('steps', 'rhr_bpm')
    ])

    repo.upsert_daily_metric({'date_ref': day, 'steps': 200, 'rhr_bpm': None, 'source': 'GoogleHealthAPI'})

    assert repo.get_daily_metric_by_date(day)['steps'] == 200
    assert repo.get_daily_metric_by_date(day)['rhr_bpm'] == 60
    assert [item['metric_key'] for item in repo.get_daily_metric_quality(day)] == ['rhr_bpm']


def test_historical_sync_requires_lock_and_verified_backup(tmp_path: Path, monkeypatch):
    from scripts import sync_zepp_historical
    from longevidade.db.schema import initialize_db
    from longevidade.backup import verify_backup

    db = tmp_path / 'synthetic.sqlite3'
    initialize_db(db)
    monkeypatch.setattr(sync_zepp_historical, 'DB_PATH', db)
    with patch.object(sync_zepp_historical, '_run_sync') as run:
        with file_sync_lock(tmp_path / 'sync.lock', timeout_seconds=1):
            with pytest.raises(SyncLockTimeoutError):
                sync_zepp_historical.main()
        run.assert_not_called()
        sync_zepp_historical.main()
        run.assert_called_once()
    archives = list((tmp_path / 'backups').glob('*.zip'))
    assert len(archives) == 1
    assert verify_backup(archives[0])['status'] == 'valid'

