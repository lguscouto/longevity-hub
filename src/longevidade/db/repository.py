"""
Repositório de dados SQLite para o Sistema Longevidade.
Fornece interface para consulta, inserção e atualização auditável de dados.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional


class LongevityRepository:
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # --- USER PROFILE ---
    def get_user_profile(self) -> Dict[str, Any]:
        sql = "SELECT * FROM user_profile WHERE id = 1;"
        with self._get_connection() as conn:
            row = conn.execute(sql).fetchone()
            if row:
                return dict(row)
            return {"id": 1, "name": "Paciente", "chronological_age": 40.0, "height_cm": 178.0, "target_weight_kg": 75.0}

    def upsert_user_profile(self, data: Dict[str, Any]) -> None:
        fields = [
            "name", "email", "birthdate", "chronological_age",
            "height_cm", "current_weight_kg", "target_weight_kg", "gender", "avatar_url"
        ]
        columns = [f for f in fields if f in data]
        if not columns:
            return
        update_set = ", ".join(f"{col} = ?" for col in columns)
        sql = f"UPDATE user_profile SET {update_set}, updated_at = CURRENT_TIMESTAMP WHERE id = 1;"
        values = [data[col] for col in columns]
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()

    # --- DAILY METRICS ---
    def upsert_daily_metric(self, data: Dict[str, Any]) -> None:
        if "date_ref" not in data:
            raise ValueError("date_ref é obrigatório para daily_metrics")

        fields = [
            "date_ref", "steps", "sleep_minutes", "sleep_deep_min", "sleep_light_min",
            "sleep_rem_min", "sleep_awake_min", "rhr_bpm", "avg_hr_bpm", "hrv_ms",
            "readiness_score", "weight_kg", "bmi", "waist_cm", "body_fat_pct",
            "vo2_max", "skin_temp_c", "stress_samples", "systolic_bp", "diastolic_bp",
            "grip_strength_kg", "source"
        ]

        columns = [f for f in fields if f in data]
        placeholders = ", ".join("?" for _ in columns)
        col_names = ", ".join(columns)
        update_set = ", ".join(f"{col} = excluded.{col}" for col in columns if col != "date_ref")

        sql = f"""
        INSERT INTO daily_metrics ({col_names})
        VALUES ({placeholders})
        ON CONFLICT(date_ref) DO UPDATE SET
        {update_set}, updated_at = CURRENT_TIMESTAMP;
        """

        values = [data[f] for f in columns]
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()

    def get_daily_metrics(self, days: int = 30) -> List[Dict[str, Any]]:
        sql = """
        SELECT * FROM daily_metrics
        ORDER BY date_ref DESC
        LIMIT ?;
        """
        with self._get_connection() as conn:
            rows = conn.execute(sql, (days,)).fetchall()
            return [dict(row) for row in rows]

    def get_daily_metric_by_date(self, date_ref: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM daily_metrics WHERE date_ref = ?;"
        with self._get_connection() as conn:
            row = conn.execute(sql, (date_ref,)).fetchone()
            return dict(row) if row else None

    # --- LAB RESULTS ---
    def add_lab_result(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO lab_results (collected_at, metric_key, metric_name, value, unit, ref_min, ref_max, optimal_target, category, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data["collected_at"],
            data["metric_key"],
            data.get("metric_name", data["metric_key"]),
            data["value"],
            data.get("unit", ""),
            data.get("ref_min"),
            data.get("ref_max"),
            data.get("optimal_target"),
            data.get("category", "Geral"),
            data.get("notes"),
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def get_lab_results(self, limit: int = 200) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM lab_results ORDER BY collected_at DESC, id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(row) for row in rows]

    def delete_lab_results_by_date(self, collected_at: str) -> int:
        sql_labs = "DELETE FROM lab_results WHERE collected_at = ? OR DATE(collected_at) = DATE(?);"
        sql_pheno = "DELETE FROM phenoage_records WHERE calculated_at = ? OR DATE(calculated_at) = DATE(?);"
        with self._get_connection() as conn:
            cursor = conn.execute(sql_labs, (collected_at, collected_at))
            conn.execute(sql_pheno, (collected_at, collected_at))
            conn.commit()
            return cursor.rowcount

    def get_latest_labs_by_key(self) -> Dict[str, Dict[str, Any]]:
        sql = """
        SELECT * FROM lab_results
        WHERE id IN (
            SELECT MAX(id) FROM lab_results GROUP BY metric_key
        );
        """
        with self._get_connection() as conn:
            rows = conn.execute(sql).fetchall()
            return {row["metric_key"]: dict(row) for row in rows}

    # --- PHENOAGE ---
    def add_phenoage_record(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO phenoage_records (
            calculated_at, chronological_age, pheno_age, age_delta,
            glucose_mgdl, creatinine_mgdl, albumin_gdl, hscrp_mgl,
            lymphocyte_pct, mcv_fl, rdw_pct, alk_phos_ul, wbc_1000ul, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data.get("calculated_at"),
            data.get("chronological_age"),
            data.get("pheno_age"),
            data.get("age_delta"),
            data.get("glucose_mgdl"),
            data.get("creatinine_mgdl"),
            data.get("albumin_gdl"),
            data.get("hscrp_mgl"),
            data.get("lymphocyte_pct"),
            data.get("mcv_fl"),
            data.get("rdw_pct"),
            data.get("alk_phos_ul"),
            data.get("wbc_1000ul"),
            data.get("notes"),
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def get_phenoage_history(self, limit: int = 30) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM phenoage_records ORDER BY calculated_at DESC, id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(row) for row in rows]

    # --- N-OF-1 EXPERIMENTS ---
    def add_n_of_1_experiment(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO n_of_1_experiments (
            title, hypothesis, metric_key, control_start, control_end,
            treatment_start, treatment_end, control_mean, treatment_mean,
            cohens_d, p_value, statistically_significant, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data["title"],
            data.get("hypothesis"),
            data["metric_key"],
            data["control_start"],
            data["control_end"],
            data["treatment_start"],
            data["treatment_end"],
            data.get("control_mean"),
            data.get("treatment_mean"),
            data.get("cohens_d"),
            data.get("p_value"),
            data.get("statistically_significant"),
            data.get("status", "em_andamento"),
            data.get("notes"),
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def get_n_of_1_experiments(self) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM n_of_1_experiments ORDER BY id DESC;"
        with self._get_connection() as conn:
            rows = conn.execute(sql).fetchall()
            return [dict(row) for row in rows]

    # --- CGM ---
    def add_cgm_summary(self, data: Dict[str, Any]) -> None:
        sql = """
        INSERT INTO cgm_daily_summary (
            date_ref, mean_glucose, glucose_sd, cv_pct, time_in_range_pct,
            time_above_range_pct, time_below_range_pct, total_readings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date_ref) DO UPDATE SET
        mean_glucose = excluded.mean_glucose,
        glucose_sd = excluded.glucose_sd,
        cv_pct = excluded.cv_pct,
        time_in_range_pct = excluded.time_in_range_pct,
        time_above_range_pct = excluded.time_above_range_pct,
        time_below_range_pct = excluded.time_below_range_pct,
        total_readings = excluded.total_readings;
        """
        values = (
            data["date_ref"], data["mean_glucose"], data.get("glucose_sd"), data.get("cv_pct"),
            data.get("time_in_range_pct"), data.get("time_above_range_pct"),
            data.get("time_below_range_pct"), data["total_readings"]
        )
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()

    def get_cgm_summaries(self, limit: int = 30) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM cgm_daily_summary ORDER BY date_ref DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(row) for row in rows]

    # --- PIPELINE RUN ---
    def log_pipeline_run(self, source: str, records_inserted: int, status: str, logs: str = "") -> None:
        sql = "INSERT INTO pipeline_run (source, records_inserted, status, logs) VALUES (?, ?, ?, ?);"
        with self._get_connection() as conn:
            conn.execute(sql, (source, records_inserted, status, logs))
            conn.commit()
