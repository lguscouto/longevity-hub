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


def test_provenance_migration_marks_legacy_lab_and_phenoage_records_unverified(tmp_path):
    db_file = tmp_path / "legacy_v3.sqlite3"
    conn = sqlite3.connect(str(db_file))
    conn.executescript(
        """
        CREATE TABLE lab_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collected_at TEXT NOT NULL,
            metric_key TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL
        );
        CREATE TABLE phenoage_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calculated_at TEXT NOT NULL,
            chronological_age REAL NOT NULL,
            pheno_age REAL NOT NULL,
            age_delta REAL NOT NULL
        );
        INSERT INTO lab_results (collected_at, metric_key, metric_name, value, unit)
        VALUES ('2026-08-01', 'fasting_glucose', 'Glicose', 88.0, 'mg/dL');
        INSERT INTO phenoage_records (calculated_at, chronological_age, pheno_age, age_delta)
        VALUES ('2026-08-01', 40.0, 39.0, -1.0);
        PRAGMA user_version = 3;
        """
    )

    applied_version = apply_migrations(conn)

    assert applied_version == len(MIGRATIONS)
    assert conn.execute("SELECT record_origin FROM lab_results").fetchone()[0] == "unverified"
    assert conn.execute("SELECT record_origin FROM phenoage_records").fetchone()[0] == "unverified"
    conn.close()
