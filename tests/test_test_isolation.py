import importlib
import sys
from pathlib import Path


def _drop_backend_app_modules() -> None:
    for module_name in list(sys.modules):
        if module_name == "backend.app.main" or module_name.startswith("backend.app.routers"):
            sys.modules.pop(module_name, None)


def test_get_db_path_uses_runtime_environment(monkeypatch, tmp_path):
    runtime_db = tmp_path / "runtime.sqlite3"
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(runtime_db))

    from backend.app import config

    assert config.get_db_path() == runtime_db

    changed_db = tmp_path / "changed-at-runtime.sqlite3"
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(changed_db))

    assert config.get_db_path() == changed_db


def test_importing_main_does_not_initialize_database(monkeypatch):
    import longevidade.db.schema as schema

    calls = []
    monkeypatch.setattr(schema, "initialize_db", lambda db_path: calls.append(Path(db_path)))
    _drop_backend_app_modules()

    main = importlib.import_module("backend.app.main")

    assert main.app is not None
    assert calls == []


def test_supplements_router_resolves_database_path_at_request_time(monkeypatch, tmp_path):
    runtime_db = tmp_path / "router-runtime.sqlite3"
    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(runtime_db))
    _drop_backend_app_modules()

    supplements = importlib.import_module("backend.app.routers.supplements")
    calls = []

    class FakeRepository:
        def get_supplements(self, only_active=True):
            return []

    def fake_initialize_db(db_path):
        calls.append(("initialize", Path(db_path)))

    def fake_repository(db_path):
        calls.append(("repository", Path(db_path)))
        return FakeRepository()

    monkeypatch.setattr(supplements, "initialize_db", fake_initialize_db)
    monkeypatch.setattr(supplements, "LongevityRepository", fake_repository)

    assert supplements.get_supplements() == []
    assert calls == [("repository", runtime_db)]


def test_client_uses_temporary_database(client, tmp_path):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["database_connected"] is True

    config = importlib.import_module("backend.app.config")
    active_db = str(config.get_db_path())
    assert str(tmp_path) in active_db
    assert "data/longevity.sqlite3" not in active_db.replace("\\", "/")
