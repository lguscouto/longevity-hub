"""Sinal persistente e coalescido para repetir a coleta do Google Health."""
from pathlib import Path


def mark_google_retry(db_path: Path) -> None:
    db_path.with_suffix('.google-retry').touch()


def claim_google_retry(db_path: Path) -> Path:
    """Sob o lock de sincronização, captura pendências anteriores à coleta."""
    pending = db_path.with_suffix('.google-retry')
    claimed = db_path.with_suffix('.google-retry-running')
    try:
        pending.replace(claimed)
    except FileNotFoundError:
        pass
    return claimed
