import sqlite3
import pytest
from longevidade.db.migrations import MIGRATIONS, apply_migrations


def test_future_database_version_raises_runtime_error_and_does_not_downgrade(tmp_path):
    db_file = tmp_path / "future_db.sqlite3"
    conn = sqlite3.connect(db_file)
    try:
        conn.execute("PRAGMA user_version = 999;")
        conn.commit()

        max_supported = max(m.version for m in MIGRATIONS)

        with pytest.raises(RuntimeError) as exc_info:
            apply_migrations(conn)

        assert f"Versão do banco de dados (999) é superior à versão suportada pela aplicação ({max_supported})" in str(exc_info.value)

        # Verificar que PRAGMA user_version NÃO foi alterado
        cursor = conn.execute("PRAGMA user_version;")
        version_after = cursor.fetchone()[0]
        assert version_after == 999
    finally:
        conn.close()


def test_fresh_database_applies_all_migrations(tmp_path):
    db_file = tmp_path / "fresh_db.sqlite3"
    conn = sqlite3.connect(db_file)
    try:
        final_version = apply_migrations(conn)
        max_supported = max(m.version for m in MIGRATIONS)
        assert final_version == max_supported

        cursor = conn.execute("PRAGMA user_version;")
        assert cursor.fetchone()[0] == max_supported
    finally:
        conn.close()
