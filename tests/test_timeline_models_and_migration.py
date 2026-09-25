"""
Testes unitários para Migration 11, modelos de dados, idempotência e adaptadores de eventos.
"""

import sqlite3
from pathlib import Path

import pytest

from longevidade.context.backfill import (
    backfill_lab_results,
    backfill_manual_entries,
    backfill_supplements,
    backfill_workouts,
    reconcile_all_sources,
)
from longevidade.context.events import (
    lab_result_to_health_event,
    manual_entry_to_health_event,
    supplement_to_health_event,
    workout_to_health_event,
)
from longevidade.context.models import HealthEventCreate
from longevidade.context.service import TimelineContextService
from longevidade.db.migrations import apply_migrations
from longevidade.db.schema import initialize_db


def test_migration_11_creates_tables_and_indexes(tmp_path):
    db_file = tmp_path / "test_migration_11.sqlite3"
    initialize_db(db_file)

    conn = sqlite3.connect(db_file)
    cur = conn.cursor()

    # Verifica user_version >= 11
    cur.execute("PRAGMA user_version;")
    version = cur.fetchone()[0]
    assert version >= 11

    # Verifica existência das tabelas criadas na Migration 11
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {r[0] for r in cur.fetchall()}
    assert "health_events" in tables
    assert "health_events_backfill_state" in tables
    assert "personal_associations" in tables
    assert "metric_change_points" in tables
    assert "insight_feedback" in tables

    # Verifica coluna timezone em user_profile
    cur.execute("PRAGMA table_info(user_profile);")
    columns = {r[1] for r in cur.fetchall()}
    assert "timezone" in columns

    # Verifica índices da tabela health_events
    cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='health_events';")
    indexes = {r[0] for r in cur.fetchall()}
    assert "idx_he_date_ref" in indexes
    assert "idx_he_category" in indexes
    assert "idx_he_event_type" in indexes
    assert "idx_he_source_key" in indexes
    assert "idx_he_significance" in indexes

    conn.close()


def test_adapters_generate_stable_source_keys():
    # Workout
    w_row = {
        "id": "wk_123",
        "workout_date": "2026-09-24",
        "workout_time": "18:30:00",
        "category": "Musculação",
        "activity_type": "weight_training",
        "title": "Treino A - Peito",
        "duration_min": 60,
        "calories": 400,
        "volume_kg": 3500.0,
        "sets_count": 16,
        "reps_count": 160,
        "source": "Hevy",
    }
    w_event = workout_to_health_event(w_row, "America/Sao_Paulo")
    assert w_event.source_key == "workout:wk_123"
    assert w_event.category == "exercise"
    assert w_event.significance == "notável"
    assert "Treino A - Peito" in w_event.title

    # Lab result
    lab_row = {
        "id": 99,
        "collected_at": "2026-09-20T08:00:00Z",
        "metric_key": "triglycerides",
        "metric_name": "Triglicerídeos",
        "value": 210.0,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 150.0,
        "optimal_target": 100.0,
        "record_origin": "lab_import",
    }
    lab_event = lab_result_to_health_event(lab_row, "America/Sao_Paulo")
    assert lab_event.source_key == "lab_result:99"
    assert lab_event.significance == "significativa"
    assert "Triglicerídeos" in lab_event.title

    # Supplement
    supp_row = {
        "id": 5,
        "name": "Creatina",
        "dosage": "5 g",
        "category": "Suplemento",
        "timing": "Manhã",
        "frequency": "Diário",
        "start_date": "2026-09-01",
    }
    supp_event = supplement_to_health_event(supp_row, "America/Sao_Paulo")
    assert supp_event.source_key == "supplement:5:2026-09-01"
    assert supp_event.category == "intervention"

    # Manual entry
    man_row = {
        "id": 10,
        "entry_date": "2026-09-23",
        "metric_key": "alcohol",
        "value": 3.0,
        "unit": "doses",
        "notes": "Vinho jantar",
    }
    man_event = manual_entry_to_health_event(man_row, "America/Sao_Paulo")
    assert man_event.source_key == "manual_entry:10"
    assert man_event.event_type == "alcohol"
    assert man_event.category == "lifestyle"


def test_backfill_and_idempotent_reconcile(tmp_path):
    db_file = tmp_path / "test_backfill.sqlite3"
    initialize_db(db_file)

    conn = sqlite3.connect(db_file)
    # Insere dados de treino e exames
    conn.execute(
        """
        INSERT INTO workouts (id, workout_date, workout_time, category, activity_type, duration_min, calories, volume_kg)
        VALUES ('w_1', '2026-09-21', '07:00:00', 'Corrida', 'running', 45, 450, 0.0);
        """
    )
    conn.execute(
        """
        INSERT INTO lab_results (id, collected_at, metric_key, metric_name, value, unit, ref_min, ref_max)
        VALUES (1, '2026-09-22', 'glucose', 'Glicemia de Jejum', 92.0, 'mg/dL', 70, 99);
        """
    )
    conn.commit()
    conn.close()

    # Executa reconciliação 1ª vez
    res1 = reconcile_all_sources(db_file)
    assert res1["status"] == "completed"
    assert res1["workouts_projected"] >= 1
    assert res1["labs_projected"] >= 1

    # Executa reconciliação 2ª vez (deve ser idempotente, sem duplicar eventos)
    res2 = reconcile_all_sources(db_file)
    assert res2["status"] == "completed"

    conn = sqlite3.connect(db_file)
    count_w = conn.execute("SELECT COUNT(*) FROM health_events WHERE source_key = 'workout:w_1';").fetchone()[0]
    count_l = conn.execute("SELECT COUNT(*) FROM health_events WHERE source_key = 'lab_result:1';").fetchone()[0]
    assert count_w == 1
    assert count_l == 1
    conn.close()
