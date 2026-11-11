import json

import keyring
import pytest

from longevidade.ingestion.hevy_client import HevyCredentials
from longevidade.integrations.google_health.client import GoogleHealthCredentials
from scripts.migrate_legacy_credentials import migrate


def test_google_vault_write_preserves_legacy_file(tmp_path):
    path = tmp_path / "google.json"
    old = json.dumps({"access_token": "old-test-token"})
    path.write_text(old, encoding="utf-8")
    GoogleHealthCredentials(access_token="new-test-token").save_to_file(path)
    assert path.read_text(encoding="utf-8") == old
    assert GoogleHealthCredentials.from_file(path).access_token == "new-test-token"


def test_hevy_does_not_write_plaintext_when_vault_fails(tmp_path, monkeypatch):
    path = tmp_path / "hevy.json"
    def fail(*args):
        raise RuntimeError("vault unavailable")
    monkeypatch.setattr(keyring, "set_password", fail)
    with pytest.raises(RuntimeError):
        HevyCredentials.save_api_key("test-only-key", path)
    assert not path.exists()


def test_legacy_migration_requires_apply_and_does_not_overwrite(tmp_path):
    path = tmp_path / "zepp.json"
    legacy = json.dumps({"app_token": "test-token", "user_id": "test-user"})
    path.write_text(legacy, encoding="utf-8")
    assert "--apply" in migrate("zepp", path)
    assert keyring.get_password("longevidade.integrations", "zepp_config") is None
    assert "copiada" in migrate("zepp", path, apply=True)
    assert path.read_text(encoding="utf-8") == legacy
    assert "Já existe" in migrate("zepp", path, apply=True)
