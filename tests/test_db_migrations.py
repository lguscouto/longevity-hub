import sqlite3
import pytest
from longevidade.db.migrations import apply_migrations, MIGRATIONS


def test_apply_migrations_creates_schema_and_version(tmp_path):
    db_file = tmp_path / "test_migration.sqlite3"
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row

    # Apply migrations
    current_version = apply_migrations(conn)

    assert current_version > 0
    assert current_version == len(MIGRATIONS)

    # Verify PRAGMA user_version
    cursor = conn.execute("PRAGMA user_version;")
    version_in_db = cursor.fetchone()[0]
    assert version_in_db == current_version

    # Idempotency check: running again should be a no-op and return same version
    second_run_version = apply_migrations(conn)
    assert second_run_version == current_version

    conn.close()


def test_migrations_upgrades_from_previous_version(tmp_path):
    db_file = tmp_path / "test_upgrade.sqlite3"
    conn = sqlite3.connect(str(db_file))

    # Set user_version to 0 manually
    conn.execute("PRAGMA user_version = 0;")
    conn.commit()

    applied_version = apply_migrations(conn)
    assert applied_version == len(MIGRATIONS)

    conn.close()
