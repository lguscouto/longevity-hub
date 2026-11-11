"""Reconciliação coordenada, precedida de backup verificável."""
from datetime import datetime
from pathlib import Path

from longevidade.backup import create_backup, verify_backup
from longevidade.sync_lock import file_sync_lock


def reconcile_with_backup(service, db_path: Path):
    db_path = Path(db_path)
    with file_sync_lock(lock_path=db_path.parent / 'sync.lock', timeout_seconds=0.1):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        archive = db_path.parent / 'backups' / f'longevity_backup_{timestamp}.zip'
        create_backup(db_path, archive, notes='Backup anterior à reconciliação da linha do tempo')
        verify_backup(archive)
        return service.reconcile()
