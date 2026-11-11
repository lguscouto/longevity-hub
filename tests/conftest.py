import importlib
from pathlib import Path
import shutil
import sys
import time

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
        with TestClient(main.app, base_url="http://127.0.0.1", client=("127.0.0.1", 50000)) as test_client:
            access = importlib.import_module("backend.app.access")
            access._login_attempts.clear()
            access._owner_sessions["test-owner-session"] = time.monotonic() + 3600
            test_client.cookies.set(access.OWNER_COOKIE, "test-owner-session")
            yield test_client
    finally:
        _drop_backend_app_modules()


@pytest.fixture
def webhook_auth(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GOOGLE_HEALTH_WEBHOOK_SECRET", "simulated-webhook-secret")
    client.headers["Authorization"] = "Bearer simulated-webhook-secret"
