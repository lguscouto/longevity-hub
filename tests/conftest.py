import importlib
import sys

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


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "longevity-test.sqlite3"
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(db_path))
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    _drop_backend_app_modules()

    main = importlib.import_module("backend.app.main")
    try:
        with TestClient(main.app) as test_client:
            yield test_client
    finally:
        _drop_backend_app_modules()
