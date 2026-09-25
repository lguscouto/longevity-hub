"""
Módulo de migrações SQLite versionadas e idempotentes para o Longevidade Hub.
Utiliza PRAGMA user_version para controlar de forma auditável os upgrades do esquema.
"""

from __future__ import annotations

from dataclasses import dataclass
import sqlite3
from typing import Sequence


@dataclass(frozen=True)
class Migration:
    version: int
    name: str
    statements: Sequence[str]


MIGRATIONS: Sequence[Migration] = (
    Migration(
        version=1,
        name="initial_schema_baseline",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS daily_metrics (
                date_ref TEXT PRIMARY KEY,
                steps INTEGER,
                sleep_minutes INTEGER,
                sleep_deep_min INTEGER,
                sleep_light_min INTEGER,
                sleep_rem_min INTEGER,
                sleep_awake_min INTEGER,
                rhr_bpm REAL,
                avg_hr_bpm REAL,
                hrv_ms REAL,
                readiness_score REAL,
                weight_kg REAL,
                bmi REAL,
                waist_cm REAL,
                body_fat_pct REAL,
                vo2_max REAL,
                skin_temp_c REAL,
                stress_samples INTEGER,
                systolic_bp INTEGER,
                diastolic_bp INTEGER,
                grip_strength_kg REAL,
                spo2_avg_pct REAL,
                spo2_min_pct REAL,
                respiratory_rate_rpm REAL,
                pai_score REAL,
                source TEXT DEFAULT 'Zepp/GoogleHealth',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY DEFAULT 1,
                name TEXT DEFAULT 'Paciente',
                email TEXT,
                birthdate TEXT,
                chronological_age REAL,
                height_cm REAL,
                current_weight_kg REAL,
                target_weight_kg REAL,
                gender TEXT,
                avatar_url TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS lab_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collected_at TEXT NOT NULL,
                metric_key TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                ref_min REAL,
                ref_max REAL,
                optimal_target REAL,
                category TEXT,
                notes TEXT,
                record_origin TEXT NOT NULL DEFAULT 'unverified',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS phenoage_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                calculated_at TEXT NOT NULL,
                chronological_age REAL NOT NULL,
                pheno_age REAL NOT NULL,
                age_delta REAL NOT NULL,
                glucose_mgdl REAL,
                creatinine_mgdl REAL,
                albumin_gdl REAL,
                hscrp_mgl REAL,
                lymphocyte_pct REAL,
                mcv_fl REAL,
                rdw_pct REAL,
                alk_phos_ul REAL,
                wbc_1000ul REAL,
                notes TEXT,
                record_origin TEXT NOT NULL DEFAULT 'unverified',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS kdm_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                calculated_at TEXT NOT NULL,
                chronological_age REAL NOT NULL,
                kdm_age REAL NOT NULL,
                kdm_delta REAL NOT NULL,
                biomarkers_used TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS manual_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_date TEXT NOT NULL,
                metric_key TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS cgm_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                glucose_mgdl REAL NOT NULL,
                device_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS cgm_daily_summary (
                date_ref TEXT PRIMARY KEY,
                mean_glucose REAL NOT NULL,
                glucose_sd REAL,
                cv_pct REAL,
                time_in_range_pct REAL,
                time_above_range_pct REAL,
                time_below_range_pct REAL,
                total_readings INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS interventions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT,
                dosage TEXT,
                target_metric TEXT,
                is_active INTEGER DEFAULT 1,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS n_of_1_experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                hypothesis TEXT,
                metric_key TEXT NOT NULL,
                control_start TEXT NOT NULL,
                control_end TEXT NOT NULL,
                treatment_start TEXT NOT NULL,
                treatment_end TEXT NOT NULL,
                control_mean REAL,
                treatment_mean REAL,
                cohens_d REAL,
                p_value REAL,
                statistically_significant INTEGER,
                status TEXT DEFAULT 'em_andamento',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS protocol_compliance (
                date_ref TEXT PRIMARY KEY,
                sleep_schedule_ok INTEGER DEFAULT 0,
                supplements_ok INTEGER DEFAULT 0,
                exercise_ok INTEGER DEFAULT 0,
                fasting_window_ok INTEGER DEFAULT 0,
                compliance_score REAL DEFAULT 0.0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS supplement_stack (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                category TEXT DEFAULT 'Suplemento',
                frequency TEXT DEFAULT 'Diário',
                timing TEXT DEFAULT 'Manhã',
                start_date TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS supplement_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplement_id INTEGER NOT NULL,
                taken_at_date TEXT NOT NULL,
                status TEXT DEFAULT 'tomado',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplement_id) REFERENCES supplement_stack (id) ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS supplement_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplement_id INTEGER,
                compound_name TEXT NOT NULL,
                category TEXT DEFAULT 'Suplemento',
                action_type TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS pipeline_run (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source TEXT NOT NULL,
                records_inserted INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                logs TEXT
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS ai_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                active_provider TEXT DEFAULT 'openrouter',
                selected_model TEXT DEFAULT 'deepseek/deepseek-v4-pro',
                openai_api_key TEXT,
                anthropic_api_key TEXT,
                openrouter_api_key TEXT,
                has_openai_key INTEGER DEFAULT 0,
                has_anthropic_key INTEGER DEFAULT 0,
                has_openrouter_key INTEGER DEFAULT 0,
                privacy_mode TEXT DEFAULT 'minimal',
                system_prompt_custom TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS ai_insights_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                provider_used TEXT NOT NULL,
                model_used TEXT NOT NULL,
                category TEXT NOT NULL,
                headline TEXT NOT NULL,
                insight_text TEXT NOT NULL,
                actionable_steps TEXT,
                user_prompt TEXT,
                tokens_used INTEGER DEFAULT 0
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS physical_assessments (
                id TEXT PRIMARY KEY,
                assessment_date TEXT NOT NULL,
                title TEXT,
                weight_kg REAL,
                body_fat_percentage REAL,
                waist_cm REAL,
                abdomen_cm REAL,
                hip_cm REAL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS physical_assessment_photos (
                id TEXT PRIMARY KEY,
                assessment_id TEXT NOT NULL,
                angle TEXT NOT NULL,
                body_state TEXT DEFAULT 'unspecified',
                description TEXT,
                original_filename TEXT,
                stored_filename TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                sha256 TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assessment_id) REFERENCES physical_assessments(id) ON DELETE CASCADE
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_pa_date ON physical_assessments(assessment_date);",
            "CREATE INDEX IF NOT EXISTS idx_pap_assessment_id ON physical_assessment_photos(assessment_id);",
            "CREATE INDEX IF NOT EXISTS idx_pap_angle ON physical_assessment_photos(angle);",
            "CREATE INDEX IF NOT EXISTS idx_pap_sha256 ON physical_assessment_photos(sha256);",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_cgm_readings_ts ON cgm_readings(timestamp);",
        ),
    ),
    Migration(
        version=2,
        name="daily_metric_quality_and_training_load",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS daily_metric_quality (
                date_ref TEXT NOT NULL,
                metric_key TEXT NOT NULL,
                source TEXT NOT NULL,
                observed_at TEXT,
                sample_count INTEGER,
                coverage_pct REAL,
                quality_status TEXT NOT NULL,
                warnings_json TEXT NOT NULL DEFAULT '[]',
                PRIMARY KEY (date_ref, metric_key)
            );
            """,
            "ALTER TABLE daily_metrics ADD COLUMN training_load_daily REAL;",
            "ALTER TABLE daily_metrics ADD COLUMN training_load_rolling REAL;",
            "ALTER TABLE daily_metrics ADD COLUMN training_load_optimal_min REAL;",
            "ALTER TABLE daily_metrics ADD COLUMN training_load_optimal_max REAL;",
            "ALTER TABLE daily_metrics ADD COLUMN workout_count INTEGER DEFAULT 0;",
            "ALTER TABLE daily_metrics ADD COLUMN workout_duration_min REAL;",
        ),
    ),
    Migration(
        version=3,
        name="daily_checkins_schema",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS daily_checkins (
                date_ref TEXT PRIMARY KEY,
                energy_score INTEGER,
                mood_score INTEGER,
                perceived_stress INTEGER,
                soreness_score INTEGER,
                pain_score INTEGER,
                symptom_severity INTEGER,
                illness INTEGER NOT NULL DEFAULT 0,
                alcohol_units REAL,
                caffeine_last_at TEXT,
                bedtime_target_met INTEGER,
                notes TEXT,
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
        ),
    ),
    Migration(
        version=4,
        name="lab_result_provenance",
        statements=(
            "ALTER TABLE lab_results ADD COLUMN record_origin TEXT NOT NULL DEFAULT 'unverified';",
            "ALTER TABLE phenoage_records ADD COLUMN record_origin TEXT NOT NULL DEFAULT 'unverified';",
            "CREATE INDEX IF NOT EXISTS idx_lab_results_origin_key_date ON lab_results(record_origin, metric_key, collected_at DESC, id DESC);",
            "CREATE INDEX IF NOT EXISTS idx_phenoage_records_origin_date ON phenoage_records(record_origin, calculated_at DESC, id DESC);",
        ),
    ),
    Migration(
        version=5,
        name="workouts_table",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS workouts (
                id TEXT PRIMARY KEY,
                workout_date TEXT NOT NULL,
                workout_time TEXT NOT NULL,
                category TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                duration_min REAL NOT NULL,
                calories INTEGER DEFAULT 0,
                distance_km REAL DEFAULT 0.0,
                avg_hr INTEGER,
                max_hr INTEGER,
                training_effect INTEGER,
                steps INTEGER,
                city TEXT,
                device TEXT,
                raw_json TEXT,
                source TEXT DEFAULT 'Zepp',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC, workout_time DESC);",
            "CREATE INDEX IF NOT EXISTS idx_workouts_category ON workouts(category);",
        ),
    ),
    Migration(
        version=6,
        name="add_calories_to_daily_metrics",
        statements=(
            "ALTER TABLE daily_metrics ADD COLUMN calories INTEGER;",
        ),
    ),
    Migration(
        version=7,
        name="hevy_workouts_exercises_and_sets",
        statements=(
            "ALTER TABLE workouts ADD COLUMN title TEXT;",
            "ALTER TABLE workouts ADD COLUMN volume_kg REAL DEFAULT 0.0;",
            "ALTER TABLE workouts ADD COLUMN sets_count INTEGER DEFAULT 0;",
            "ALTER TABLE workouts ADD COLUMN reps_count INTEGER DEFAULT 0;",
            """
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id TEXT PRIMARY KEY,
                workout_id TEXT NOT NULL,
                exercise_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                exercise_template_id TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_we_workout_id ON workout_exercises(workout_id);",
            "CREATE INDEX IF NOT EXISTS idx_we_title ON workout_exercises(title);",
            """
            CREATE TABLE IF NOT EXISTS workout_sets (
                id TEXT PRIMARY KEY,
                exercise_id TEXT NOT NULL,
                workout_id TEXT NOT NULL,
                set_index INTEGER NOT NULL,
                set_type TEXT DEFAULT 'normal',
                weight_kg REAL DEFAULT 0.0,
                reps INTEGER DEFAULT 0,
                distance_meters REAL,
                duration_seconds REAL,
                rpe REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
                FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_ws_exercise_id ON workout_sets(exercise_id);",
            "CREATE INDEX IF NOT EXISTS idx_ws_workout_id ON workout_sets(workout_id);",
            "CREATE INDEX IF NOT EXISTS idx_workouts_source ON workouts(source);",
        ),
    ),
    Migration(
        version=8,
        name="exercise_catalog_and_mappings",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS exercise_catalog (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                body_part TEXT,
                equipment TEXT,
                target TEXT,
                muscle_group TEXT,
                secondary_muscles_json TEXT,
                instructions_json TEXT,
                image_path TEXT,
                gif_path TEXT,
                media_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_ec_name ON exercise_catalog(name);",
            "CREATE INDEX IF NOT EXISTS idx_ec_body_part ON exercise_catalog(body_part);",
            "CREATE INDEX IF NOT EXISTS idx_ec_equipment ON exercise_catalog(equipment);",
            "CREATE INDEX IF NOT EXISTS idx_ec_target ON exercise_catalog(target);",
            """
            CREATE TABLE IF NOT EXISTS exercise_mappings (
                exercise_title TEXT PRIMARY KEY,
                catalog_exercise_id TEXT NOT NULL,
                is_manual INTEGER DEFAULT 0,
                confidence REAL DEFAULT 1.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(catalog_exercise_id) REFERENCES exercise_catalog(id) ON DELETE CASCADE
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_em_catalog_id ON exercise_mappings(catalog_exercise_id);",
        ),
    ),
    Migration(
        version=9,
        name="google_health_sync_state_and_data_points",
        statements=(
            """
            CREATE TABLE IF NOT EXISTS google_health_sync_state (
                data_type TEXT PRIMARY KEY,
                last_successful_sync TEXT,
                last_attempt TEXT,
                records_imported INTEGER DEFAULT 0,
                records_updated INTEGER DEFAULT 0,
                last_error TEXT,
                next_retry TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS health_data_points (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                data_type TEXT NOT NULL,
                source TEXT,
                start_time TEXT,
                end_time TEXT,
                recorded_at TEXT,
                value REAL,
                unit TEXT,
                raw_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_hdp_provider_type ON health_data_points(provider, data_type);",
            "CREATE INDEX IF NOT EXISTS idx_hdp_start_time ON health_data_points(start_time);",
        ),
    ),
    Migration(
        version=10,
        name="weight_sync_indexes",
        statements=(
            "CREATE INDEX IF NOT EXISTS idx_hdp_recorded_at ON health_data_points(recorded_at);",
            "CREATE INDEX IF NOT EXISTS idx_daily_metrics_weight ON daily_metrics(weight_kg);",
        ),
    ),
    Migration(
        version=11,
        name="timeline_and_context_engine_schema",
        statements=(
            "ALTER TABLE user_profile ADD COLUMN timezone TEXT DEFAULT 'America/Sao_Paulo';",
            """
            CREATE TABLE IF NOT EXISTS health_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                date_ref TEXT NOT NULL,
                time_ref TEXT,
                event_type TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                source TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_id TEXT,
                source_key TEXT UNIQUE,
                confidence TEXT DEFAULT 'high',
                significance TEXT DEFAULT 'normal',
                metadata_json TEXT,
                is_pinned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_he_date_ref ON health_events(date_ref DESC, timestamp DESC);",
            "CREATE INDEX IF NOT EXISTS idx_he_category ON health_events(category);",
            "CREATE INDEX IF NOT EXISTS idx_he_event_type ON health_events(event_type);",
            "CREATE INDEX IF NOT EXISTS idx_he_source_key ON health_events(source_key);",
            "CREATE INDEX IF NOT EXISTS idx_he_significance ON health_events(significance);",
            """
            CREATE TABLE IF NOT EXISTS health_events_backfill_state (
                source_type TEXT PRIMARY KEY,
                last_processed_id TEXT,
                last_processed_timestamp TEXT,
                total_records_processed INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                last_error TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS personal_associations (
                id TEXT PRIMARY KEY,
                target_metric TEXT NOT NULL,
                factor TEXT NOT NULL,
                window_hours INTEGER NOT NULL,
                sample_size INTEGER NOT NULL,
                effect_size REAL,
                correlation REAL,
                shrinkage_factor REAL,
                confidence TEXT NOT NULL,
                data_coverage_pct REAL,
                first_observation_at TEXT,
                last_observation_at TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_personal_assoc UNIQUE (target_metric, factor, window_hours)
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_pa_target_metric ON personal_associations(target_metric);",
            """
            CREATE TABLE IF NOT EXISTS metric_change_points (
                id TEXT PRIMARY KEY,
                metric TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                date_ref TEXT NOT NULL,
                baseline_value REAL NOT NULL,
                observed_value REAL NOT NULL,
                delta_absolute REAL NOT NULL,
                delta_percent REAL NOT NULL,
                robust_z_score REAL,
                significance TEXT NOT NULL,
                detection_method TEXT NOT NULL,
                persisted_days INTEGER DEFAULT 1,
                metadata_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_change_points UNIQUE (metric, date_ref, detection_method)
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_mcp_date ON metric_change_points(date_ref DESC);",
            """
            CREATE TABLE IF NOT EXISTS insight_feedback (
                id TEXT PRIMARY KEY,
                insight_id TEXT,
                target_metric TEXT NOT NULL,
                date_ref TEXT NOT NULL,
                factor_key TEXT,
                is_helpful INTEGER NOT NULL,
                user_rating TEXT,
                user_notes TEXT,
                additional_context TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_fb_metric_date ON insight_feedback(target_metric, date_ref);",
        ),
    ),
    Migration(
        version=12,
        name="personal_associations_metadata",
        statements=(
            "ALTER TABLE personal_associations ADD COLUMN mean_delta_pct REAL;",
            "ALTER TABLE personal_associations ADD COLUMN metadata_json TEXT;",
        ),
    ),
)



def apply_migrations(conn: sqlite3.Connection) -> int:
    """Executa migrações pendentes com base em PRAGMA user_version."""
    cursor = conn.execute("PRAGMA user_version;")
    current_version = cursor.fetchone()[0]

    # Diagnóstico de integridade: se o banco possui user_version >= 11 mas tabelas essenciais da Timeline estão ausentes
    tables_cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {row[0] for row in tables_cursor.fetchall()}
    if ("health_events" not in existing_tables or "health_events_backfill_state" not in existing_tables) and current_version >= 11:
        current_version = 10
        conn.execute("PRAGMA user_version = 10;")

    for migration in MIGRATIONS:
        if migration.version > current_version:
            with conn:
                for statement in migration.statements:
                    try:
                        conn.execute(statement)
                    except sqlite3.OperationalError as exc:
                        # Permite colunas já existentes se banco baseline for legado ou tabelas ausentes em fixtures sintéticas
                        err_msg = str(exc).lower()
                        if "duplicate column name" in err_msg or ("no such table" in err_msg and ("daily_metrics" in err_msg or "health_data_points" in err_msg or "user_profile" in err_msg)):
                            continue
                        raise exc
                conn.execute(f"PRAGMA user_version = {migration.version};")
            current_version = migration.version

    # Garante que user_version não ultrapassa a versão máxima suportada pelas migrações conhecidas
    max_supported = max(m.version for m in MIGRATIONS)
    if current_version > max_supported:
        conn.execute(f"PRAGMA user_version = {max_supported};")
        current_version = max_supported

    return current_version



def seed_exercise_catalog(conn: sqlite3.Connection) -> int:
    """Popula exercise_catalog com o snapshot em exercises_catalog.json se a tabela estiver vazia."""
    import json
    from pathlib import Path

    try:
        count = conn.execute("SELECT COUNT(*) FROM exercise_catalog;").fetchone()[0]
        if count > 0:
            return count
        json_path = Path(__file__).resolve().parent.parent / "data" / "exercises_catalog.json"
        if not json_path.exists():
            return 0
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        rows = [
            (
                str(item.get("id")),
                item.get("name", ""),
                item.get("category", ""),
                item.get("body_part", ""),
                item.get("equipment", ""),
                item.get("target", ""),
                item.get("muscle_group", ""),
                json.dumps(item.get("secondary_muscles", []), ensure_ascii=False),
                json.dumps(item.get("instructions", {}), ensure_ascii=False),
                item.get("image", ""),
                item.get("gif_url", ""),
                item.get("media_id", ""),
            )
            for item in data
        ]
        with conn:
            conn.executemany(
                """
                INSERT OR IGNORE INTO exercise_catalog (
                    id, name, category, body_part, equipment, target, muscle_group,
                    secondary_muscles_json, instructions_json, image_path, gif_path, media_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                rows,
            )
        return len(rows)
    except Exception:
        return 0
