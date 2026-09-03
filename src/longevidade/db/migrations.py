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
                source TEXT DEFAULT 'Zepp/GoogleFit',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY DEFAULT 1,
                name TEXT DEFAULT 'Paciente',
                email TEXT,
                birthdate TEXT DEFAULT '1994-03-22',
                chronological_age REAL DEFAULT 32.0,
                height_cm REAL DEFAULT 170.0,
                current_weight_kg REAL,
                target_weight_kg REAL DEFAULT 75.0,
                gender TEXT DEFAULT 'Masculino',
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
)



def apply_migrations(conn: sqlite3.Connection) -> int:
    """Executa migrações pendentes com base em PRAGMA user_version."""
    cursor = conn.execute("PRAGMA user_version;")
    current_version = cursor.fetchone()[0]

    for migration in MIGRATIONS:
        if migration.version > current_version:
            with conn:
                for statement in migration.statements:
                    try:
                        conn.execute(statement)
                    except sqlite3.OperationalError as exc:
                        # Permite colunas já existentes se banco baseline for legado ou tabelas ausentes em fixtures sintéticas
                        err_msg = str(exc).lower()
                        if "duplicate column name" in err_msg or "no such table: daily_metrics" in err_msg:
                            continue
                        raise exc
                conn.execute(f"PRAGMA user_version = {migration.version};")
            current_version = migration.version

    return current_version
