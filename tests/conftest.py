import importlib
from pathlib import Path
import shutil
import sys

import keyring
import pytest
from fastapi.testclient import TestClient


_APP_MODULE_PREFIXES = (
    "backend.app.main",
    "backend.app.routers",
    "backend.app.config",
)


def _drop_backend_app_modules() -> None:
    for module_name in list(sys.modules):
        if any(
            module_name == prefix or module_name.startswith(f"{prefix}.")
            for prefix in _APP_MODULE_PREFIXES
        ):
            sys.modules.pop(module_name, None)


@pytest.fixture(autouse=True)
def _isolate_runtime_secrets_and_dirs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Isola Keyring do Windows e diretórios de configuração em todos os testes."""
    memory_keyring: dict[tuple[str, str], str] = {}

    def _get_password(service: str, username: str) -> str | None:
        return memory_keyring.get((service, username))

    def _set_password(service: str, username: str, password: str) -> None:
        memory_keyring[(service, username)] = password

    def _delete_password(service: str, username: str) -> None:
        memory_keyring.pop((service, username), None)

    monkeypatch.setattr(keyring, "get_password", _get_password)
    monkeypatch.setattr(keyring, "set_password", _set_password)
    monkeypatch.setattr(keyring, "delete_password", _delete_password)
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.delenv("HEVY_API_KEY", raising=False)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from longevidade.db.schema import initialize_db

    db_path = tmp_path / "longevity-test.sqlite3"
    initialize_db(db_path)
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(db_path))
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    _drop_backend_app_modules()

    main = importlib.import_module("backend.app.main")
    try:
        with TestClient(main.app) as test_client:
            yield test_client
    finally:
        _drop_backend_app_modules()
