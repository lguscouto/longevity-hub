"""
Esquema do banco de dados SQLite para o sistema Longevidade.
A definição canônica e versionada do DDL reside em `longevidade.db.migrations`.
"""

from __future__ import annotations

import atexit
from pathlib import Path
import shutil
import sqlite3
import tempfile


_INITIALIZED_DB_SIGNATURES: dict[Path, tuple[int, int]] = {}
_TEMPLATE_DB_PATH: Path | None = None


def _cleanup_template_db() -> None:
    global _TEMPLATE_DB_PATH
    if _TEMPLATE_DB_PATH and _TEMPLATE_DB_PATH.exists():
        try:
            shutil.rmtree(_TEMPLATE_DB_PATH.parent, ignore_errors=True)
        except Exception:
            pass


atexit.register(_cleanup_template_db)


def _run_full_initialization(path: Path) -> None:
    from longevidade.db.migrations import apply_migrations, seed_exercise_catalog

    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30.0)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA busy_timeout = 30000;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")

        apply_migrations(conn)
        seed_exercise_catalog(conn)

        conn.execute(
            """
            UPDATE ai_settings
            SET
                has_openai_key = CASE
                    WHEN TRIM(COALESCE(openai_api_key, '')) != '' THEN 1 ELSE has_openai_key
                END,
                has_anthropic_key = CASE
                    WHEN TRIM(COALESCE(anthropic_api_key, '')) != '' THEN 1 ELSE has_anthropic_key
                END,
                has_openrouter_key = CASE
                    WHEN TRIM(COALESCE(openrouter_api_key, '')) != '' THEN 1 ELSE has_openrouter_key
                END
            WHERE id = 1;
            """
        )

        conn.execute("INSERT OR IGNORE INTO user_profile (id, name) VALUES (1, 'Paciente');")
        conn.execute(
            "INSERT OR IGNORE INTO ai_settings (id, active_provider, selected_model) "
            "VALUES (1, 'openrouter', 'deepseek/deepseek-v4-flash-0731');"
        )

        conn.commit()
    finally:
        conn.close()


def seed_demo_supplements(conn: sqlite3.Connection) -> int:
    """Helper para testes e fixtures sintéticas que necessitam de suplementos pré-cadastrados."""
    supps = [
        ("NMN (Nicotinamida Mononucleotídeo)", "500 mg", "Suplemento", "Diário", "Manhã (Jejum)", "2026-06-01", "Potencializador NAD+"),
        ("Ômega-3 (EPA/DHA)", "2000 mg", "Suplemento", "Diário", "Almoço", "2026-06-01", "Saúde cardiovascular & anti-inflamatório"),
        ("Berberina HCL", "500 mg", "Suplemento", "Diário", "Jantar", "2026-06-15", "Otimização glicêmica & sensibilidade à insulina"),
        ("Creatina Monohidratada", "5 g", "Suplemento", "Diário", "Manhã", "2026-06-01", "Neuroproteção & força muscular"),
        ("Glicinato de Magnésio", "400 mg", "Suplemento", "Diário", "Noite", "2026-06-01", "Relaxamento muscular & indução ao sono"),
    ]
    with conn:
        conn.executemany(
            "INSERT INTO supplement_stack (name, dosage, category, frequency, timing, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?);",
            supps,
        )
    return len(supps)


def _get_or_create_template_db() -> Path:
    global _TEMPLATE_DB_PATH
    if _TEMPLATE_DB_PATH is None or not _TEMPLATE_DB_PATH.exists():
        tmp_dir = Path(tempfile.mkdtemp(prefix="longevidade_tpl_"))
        _TEMPLATE_DB_PATH = tmp_dir / "template.sqlite3"
        _run_full_initialization(_TEMPLATE_DB_PATH)
    return _TEMPLATE_DB_PATH


def initialize_db(db_path: str | Path) -> None:
    """Inicializa o esquema do banco de dados SQLite usando migrações versionadas."""
    path = Path(db_path)
    resolved = path.resolve()

    if path.exists():
        stat = path.stat()
        if stat.st_size > 0:
            cached_sig = _INITIALIZED_DB_SIGNATURES.get(resolved)
            if cached_sig is not None and cached_sig[0] == stat.st_ctime_ns and stat.st_size >= cached_sig[1]:
                return
            _run_full_initialization(path)
            new_stat = path.stat()
            _INITIALIZED_DB_SIGNATURES[resolved] = (new_stat.st_ctime_ns, new_stat.st_size)
            return

    path.parent.mkdir(parents=True, exist_ok=True)
    tpl = _get_or_create_template_db()
    shutil.copyfile(tpl, path)
    new_stat = path.stat()
    _INITIALIZED_DB_SIGNATURES[resolved] = (new_stat.st_ctime_ns, new_stat.st_size)
