"""
Motor de Backfill e Reconciliação Idempotente para a tabela health_events.
Processa em lotes com checkpointing na tabela health_events_backfill_state.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from longevidade.context.events import (
    lab_result_to_health_event,
    manual_entry_to_health_event,
    supplement_to_health_event,
    workout_to_health_event,
)
from longevidade.context.models import BackfillStatus, HealthEvent


BATCH_SIZE = 100


def get_db_connection(db_path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(Path(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _upsert_health_event(cursor: sqlite3.Cursor, event: HealthEvent) -> bool:
    """Insere ou atualiza um evento idempotentemente por source_key."""
    meta_str = json.dumps(event.metadata, ensure_ascii=False)
    cursor.execute(
        """
        INSERT INTO health_events (
            id, timestamp, date_ref, time_ref, event_type, category,
            title, description, source, source_type, source_id, source_key,
            confidence, significance, metadata_json, is_pinned, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(source_key) DO UPDATE SET
            timestamp = excluded.timestamp,
            date_ref = excluded.date_ref,
            time_ref = excluded.time_ref,
            title = excluded.title,
            description = excluded.description,
            metadata_json = excluded.metadata_json,
            significance = excluded.significance,
            updated_at = CURRENT_TIMESTAMP;
        """,
        (
            event.id,
            event.timestamp,
            event.date_ref,
            event.time_ref,
            event.event_type,
            event.category,
            event.title,
            event.description,
            event.source,
            event.source_type,
            event.source_id,
            event.source_key,
            event.confidence,
            event.significance,
            meta_str,
            1 if event.is_pinned else 0,
            event.created_at,
        ),
    )
    return cursor.rowcount > 0


def get_user_timezone_from_db(conn: sqlite3.Connection) -> str:
    """Obtém a preferência de timezone da tabela user_profile."""
    try:
        cur = conn.execute("SELECT timezone FROM user_profile WHERE id = 1 LIMIT 1;")
        row = cur.fetchone()
        if row and row["timezone"]:
            return str(row["timezone"])
    except Exception:
        pass
    return "America/Sao_Paulo"


def backfill_workouts(conn: sqlite3.Connection, user_tz: str) -> int:
    """Processa workouts de forma retomável em lotes."""
    cur = conn.cursor()
    cur.execute("SELECT last_processed_id FROM health_events_backfill_state WHERE source_type = 'workouts';")
    state = cur.fetchone()
    last_id = state["last_processed_id"] if state else None

    count = 0
    query = "SELECT * FROM workouts ORDER BY workout_date ASC, workout_time ASC, id ASC;"
    cur.execute(query)
    rows = cur.fetchall()

    conn.execute(
        """
        INSERT INTO health_events_backfill_state (source_type, status, updated_at)
        VALUES ('workouts', 'in_progress', CURRENT_TIMESTAMP)
        ON CONFLICT(source_type) DO UPDATE SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP;
        """
    )
    conn.commit()

    try:
        batch_events: List[HealthEvent] = []
        last_item_id = None
        for r in rows:
            row_dict = dict(r)
            ev = workout_to_health_event(row_dict, user_tz)
            batch_events.append(ev)
            last_item_id = str(row_dict["id"])

            if len(batch_events) >= BATCH_SIZE:
                with conn:
                    for e in batch_events:
                        _upsert_health_event(cur, e)
                    cur.execute(
                        """
                        UPDATE health_events_backfill_state
                        SET last_processed_id = ?, total_records_processed = total_records_processed + ?,
                            status = 'in_progress', updated_at = CURRENT_TIMESTAMP
                        WHERE source_type = 'workouts';
                        """,
                        (last_item_id, len(batch_events)),
                    )
                count += len(batch_events)
                batch_events.clear()

        if batch_events:
            with conn:
                for e in batch_events:
                    _upsert_health_event(cur, e)
                cur.execute(
                    """
                    UPDATE health_events_backfill_state
                    SET last_processed_id = ?, total_records_processed = total_records_processed + ?,
                        status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE source_type = 'workouts';
                    """,
                    (last_item_id, len(batch_events)),
                )
            count += len(batch_events)
        else:
            with conn:
                conn.execute(
                    "UPDATE health_events_backfill_state SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE source_type = 'workouts';"
                )

        return count
    except Exception as exc:
        conn.execute(
            "UPDATE health_events_backfill_state SET status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE source_type = 'workouts';",
            (str(exc),),
        )
        conn.commit()
        raise


def backfill_lab_results(conn: sqlite3.Connection, user_tz: str) -> int:
    """Processa exames da tabela lab_results."""
    cur = conn.cursor()
    cur.execute("SELECT * FROM lab_results ORDER BY collected_at ASC, id ASC;")
    rows = cur.fetchall()

    conn.execute(
        """
        INSERT INTO health_events_backfill_state (source_type, status, updated_at)
        VALUES ('lab_results', 'in_progress', CURRENT_TIMESTAMP)
        ON CONFLICT(source_type) DO UPDATE SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP;
        """
    )
    conn.commit()

    count = 0
    try:
        with conn:
            for r in rows:
                ev = lab_result_to_health_event(dict(r), user_tz)
                _upsert_health_event(cur, ev)
                count += 1
            conn.execute(
                """
                UPDATE health_events_backfill_state
                SET total_records_processed = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE source_type = 'lab_results';
                """,
                (count,),
            )
        return count
    except Exception as exc:
        conn.execute(
            "UPDATE health_events_backfill_state SET status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE source_type = 'lab_results';",
            (str(exc),),
        )
        conn.commit()
        raise


def backfill_supplements(conn: sqlite3.Connection, user_tz: str) -> int:
    """Processa suplementos da tabela supplement_stack."""
    cur = conn.cursor()
    cur.execute("SELECT * FROM supplement_stack ORDER BY start_date ASC, id ASC;")
    rows = cur.fetchall()

    conn.execute(
        """
        INSERT INTO health_events_backfill_state (source_type, status, updated_at)
        VALUES ('supplement_stack', 'in_progress', CURRENT_TIMESTAMP)
        ON CONFLICT(source_type) DO UPDATE SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP;
        """
    )
    conn.commit()

    count = 0
    try:
        with conn:
            for r in rows:
                ev = supplement_to_health_event(dict(r), user_tz)
                _upsert_health_event(cur, ev)
                count += 1
            conn.execute(
                """
                UPDATE health_events_backfill_state
                SET total_records_processed = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE source_type = 'supplement_stack';
                """,
                (count,),
            )
        return count
    except Exception as exc:
        conn.execute(
            "UPDATE health_events_backfill_state SET status = 'error', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE source_type = 'supplement_stack';",
            (str(exc),),
        )
        conn.commit()
        raise


def backfill_manual_entries(conn: sqlite3.Connection, user_tz: str) -> int:
    """Processa entradas manuais legadas da tabela manual_entries."""
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM manual_entries ORDER BY entry_date ASC, id ASC;")
        rows = cur.fetchall()
    except sqlite3.OperationalError:
        return 0

    count = 0
    with conn:
        for r in rows:
            ev = manual_entry_to_health_event(dict(r), user_tz)
            _upsert_health_event(cur, ev)
            count += 1
    return count


def reconcile_all_sources(db_path: str | Path) -> Dict[str, Any]:
    """Executa a reconciliação completa e idempotente de todas as fontes canônicas."""
    from longevidade.db.schema import initialize_db
    initialize_db(db_path)
    conn = get_db_connection(db_path)
    try:
        user_tz = get_user_timezone_from_db(conn)
        workouts_count = backfill_workouts(conn, user_tz)
        labs_count = backfill_lab_results(conn, user_tz)
        supps_count = backfill_supplements(conn, user_tz)
        manual_count = backfill_manual_entries(conn, user_tz)

        total_cur = conn.execute("SELECT COUNT(*) FROM health_events;").fetchone()
        total_events = total_cur[0] if total_cur else 0

        return {
            "status": "completed",
            "workouts_projected": workouts_count,
            "labs_projected": labs_count,
            "supplements_projected": supps_count,
            "manual_entries_projected": manual_count,
            "total_health_events": total_events,
            "user_timezone": user_tz,
        }
    finally:
        conn.close()


def get_all_backfill_statuses(db_path: str | Path) -> List[BackfillStatus]:
    """Retorna os registros de status da tabela health_events_backfill_state."""
    conn = get_db_connection(db_path)
    try:
        cur = conn.execute("SELECT * FROM health_events_backfill_state ORDER BY source_type ASC;")
        rows = cur.fetchall()
        results: List[BackfillStatus] = []
        for r in rows:
            results.append(
                BackfillStatus(
                    source_type=r["source_type"],
                    last_processed_id=r["last_processed_id"],
                    last_processed_timestamp=r["last_processed_timestamp"],
                    total_records_processed=r["total_records_processed"],
                    status=r["status"],
                    last_error=r["last_error"],
                    updated_at=r["updated_at"],
                )
            )
        return results
    except Exception:
        return []
    finally:
        conn.close()
