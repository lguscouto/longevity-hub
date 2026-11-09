"""Módulo de coordenação de concorrência e sincronização de dados via lock de arquivo.

Impede execuções concorrentes entre processos distintos (ex: tarefa agendada
Longevidade_DailySync no Agendador do Windows e sincronizações manuais acionadas
pelo FastAPI / Dashboard).
"""

from __future__ import annotations

import contextlib
import os
from pathlib import Path
import sys
import time
from typing import Generator


class SyncLockError(Exception):
    """Exceção base para operações com lock de sincronização."""


class SyncLockTimeoutError(SyncLockError):
    """Lançada quando o lock de sincronização não pode ser adquirido dentro do timeout."""


def _get_default_lock_path() -> Path:
    db_env = os.environ.get("LONGEVIDADE_DB_PATH")
    if db_env:
        p = Path(db_env).parent / "sync.lock"
    else:
        hermes_home = os.environ.get("HERMES_HOME")
        if hermes_home:
            p = Path(hermes_home) / "data" / "sync.lock"
        else:
            p = Path(__file__).resolve().parent.parent.parent / "data" / "sync.lock"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


@contextlib.contextmanager
def file_sync_lock(
    lock_path: Path | str | None = None,
    timeout_seconds: float = 30.0,
    poll_interval: float = 0.5,
) -> Generator[Path, None, None]:
    """Gerenciador de contexto que adquire uma trava exclusiva de arquivo no SO.

    Utiliza `msvcrt.locking` no Windows e `fcntl.flock` no Unix/POSIX.
    Se a trava não puder ser obtida antes de `timeout_seconds`, lança `SyncLockTimeoutError`.
    """
    path = Path(lock_path) if lock_path is not None else _get_default_lock_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    is_windows = os.name == "nt" or sys.platform == "win32"
    if is_windows:
        import msvcrt
    else:
        import fcntl

    fd = os.open(str(path), os.O_RDWR | os.O_CREAT)
    acquired = False
    start_time = time.monotonic()

    try:
        while True:
            try:
                if is_windows:
                    os.lseek(fd, 0, os.SEEK_SET)
                    msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
                break
            except (OSError, PermissionError, BlockingIOError):
                elapsed = time.monotonic() - start_time
                if elapsed >= timeout_seconds:
                    raise SyncLockTimeoutError(
                        f"Não foi possível obter o lock exclusivo de sincronização em '{path}' após {timeout_seconds:.1f}s. "
                        f"Outra operação de sincronização está em andamento neste momento."
                    )
                time.sleep(min(poll_interval, max(0.05, timeout_seconds - elapsed)))

        yield path

    finally:
        if acquired:
            try:
                if is_windows:
                    os.lseek(fd, 0, os.SEEK_SET)
                    msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(fd, fcntl.LOCK_UN)
            except OSError:
                pass
        try:
            os.close(fd)
        except OSError:
            pass
