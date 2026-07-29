"""
Esquema do banco de dados SQLite para o projeto Longevidade.
Contém definições de tabelas auditáveis, incluindo IA, Suplementos, Hormônios, Audit Logs, KDM Age e Protocolo Compliance.
"""

import sqlite3
from pathlib import Path


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

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
    source TEXT DEFAULT 'Zepp/GoogleFit',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS manual_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cgm_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    glucose_mgdl REAL NOT NULL,
    device_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS supplement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_id INTEGER NOT NULL,
    taken_at_date TEXT NOT NULL,
    status TEXT DEFAULT 'tomado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplement_id) REFERENCES supplement_stack (id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS pipeline_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL,
    records_inserted INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    logs TEXT
);

CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    active_provider TEXT DEFAULT 'openrouter',
    selected_model TEXT DEFAULT 'deepseek/deepseek-v4-pro',
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    openrouter_api_key TEXT,
    system_prompt_custom TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
"""


def initialize_db(db_path: str | Path) -> None:
    """Inicializa o esquema do banco de dados SQLite."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA_SQL)
        
        # Migração defensiva: adiciona a coluna 'category' em supplement_stack se não existir
        try:
            conn.execute("ALTER TABLE supplement_stack ADD COLUMN category TEXT DEFAULT 'Suplemento';")
        except sqlite3.OperationalError:
            pass

        # Garante linha inicial no user_profile se vazia
        conn.execute("INSERT OR IGNORE INTO user_profile (id, name, chronological_age, height_cm, target_weight_kg) VALUES (1, 'Paciente', 32.0, 170.0, 75.0);")
        # Garante linha inicial nas configurações de IA se vazia
        conn.execute("INSERT OR IGNORE INTO ai_settings (id, active_provider, selected_model) VALUES (1, 'openrouter', 'deepseek/deepseek-v4-pro');")
        
        # Garante inserção de suplementos básicos Blueprint se a tabela estiver vazia
        count_supps = conn.execute("SELECT COUNT(*) FROM supplement_stack;").fetchone()[0]
        if count_supps == 0:
            supps = [
                ("NMN (Nicotinamida Mononucleotídeo)", "500 mg", "Suplemento", "Diário", "Manhã (Jejum)", "2026-06-01", "Potencializador NAD+"),
                ("Ômega-3 (EPA/DHA)", "2000 mg", "Suplemento", "Diário", "Almoço", "2026-06-01", "Saúde cardiovascular & anti-inflamatório"),
                ("Berberina HCL", "500 mg", "Suplemento", "Diário", "Jantar", "2026-06-15", "Otimização glicêmica & sensibilidade à insulina"),
                ("Creatina Monohidratada", "5 g", "Suplemento", "Diário", "Manhã", "2026-06-01", "Neuroproteção & força muscular"),
                ("Glicinato de Magnésio", "400 mg", "Suplemento", "Diário", "Noite", "2026-06-01", "Relaxamento muscular & indução ao sono")
            ]
            conn.executemany(
                "INSERT INTO supplement_stack (name, dosage, category, frequency, timing, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?);",
                supps
            )

        conn.commit()
