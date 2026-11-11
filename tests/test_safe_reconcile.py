from pathlib import Path
from unittest.mock import Mock

import pytest

from longevidade.context.safe_reconcile import reconcile_with_backup
from longevidade.db.schema import initialize_db


def test_reconciliation_is_preceded_by_verified_backup(tmp_path: Path):
    db = tmp_path / 'synthetic.sqlite3'
    initialize_db(db)
    service = Mock()
    service.reconcile.return_value = {'status': 'completed'}
    assert reconcile_with_backup(service, db) == {'status': 'completed'}
    assert len(list((tmp_path / 'backups').glob('*.zip'))) == 1
    service.reconcile.assert_called_once()


def test_reconciliation_does_not_run_if_backup_fails(tmp_path: Path, monkeypatch):
    db = tmp_path / 'synthetic.sqlite3'
    initialize_db(db)
    service = Mock()
    def fail(*args, **kwargs):
        raise OSError('falha simulada')
    monkeypatch.setattr('longevidade.context.safe_reconcile.verify_backup', fail)
    with pytest.raises(OSError):
        reconcile_with_backup(service, db)
    service.reconcile.assert_not_called()
