"""
Repositório de dados SQLite para o Sistema Longevidade.
Fornece interface para consulta, inserção e atualização auditável de dados.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from longevidade.ai.secrets_store import (
    AISecretsStore,
    AI_SECRET_PROVIDERS,
    KeyringSecretsStore,
    PROVIDER_HAS_FIELDS,
    PROVIDER_SECRET_FIELDS,
    is_masked_or_blank_secret,
    is_plain_secret_value,
)


class LongevityRepository:
    def __init__(self, db_path: str | Path, secrets_store: AISecretsStore | None = None):
        self.db_path = Path(db_path)
        self.secrets_store = secrets_store or KeyringSecretsStore()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    # --- USER PROFILE ---
    def get_user_profile(self) -> Dict[str, Any]:
        sql = "SELECT * FROM user_profile WHERE id = 1;"
        with self._get_connection() as conn:
            row = conn.execute(sql).fetchone()
            if row:
                res = dict(row)
                birthdate_str = res.get("birthdate")
                if birthdate_str:
                    try:
                        from datetime import date
                        bdate = date.fromisoformat(birthdate_str[:10])
                        today = date.today()
                        res["chronological_age"] = float(today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day)))
                    except Exception:
                        pass
                return res
            return {"id": 1, "name": "Paciente", "chronological_age": 32.0, "height_cm": 170.0, "target_weight_kg": 75.0}

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
        sql_kdm = "DELETE FROM kdm_records WHERE calculated_at = ? OR DATE(calculated_at) = DATE(?);"
        with self._get_connection() as conn:
            cursor = conn.execute(sql_labs, (collected_at, collected_at))
            conn.execute(sql_pheno, (collected_at, collected_at))
            conn.execute(sql_kdm, (collected_at, collected_at))
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
            data["calculated_at"],
            data["chronological_age"],
            data["pheno_age"],
            data["age_delta"],
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
    def batch_insert_cgm_readings(self, readings: List[Dict[str, Any]]) -> int:
        """Insere leituras CGM brutas com dedup por timestamp.

        O índice único idx_cgm_readings_ts ignora duplicatas silenciosamente.
        Retorna o número real de linhas inseridas.
        """
        sql = """
        INSERT OR IGNORE INTO cgm_readings (timestamp, glucose_mgdl, device_id)
        VALUES (?, ?, ?);
        """
        with self._get_connection() as conn:
            before = conn.execute("SELECT COUNT(*) FROM cgm_readings").fetchone()[0]
            for r in readings:
                conn.execute(sql, (
                    r["timestamp"],
                    r["glucose_mgdl"],
                    r.get("device_id"),
                ))
            conn.commit()
            after = conn.execute("SELECT COUNT(*) FROM cgm_readings").fetchone()[0]
        return after - before

    def get_cgm_readings_by_date_range(
        self, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        """Retorna leituras brutas entre start_date e end_date (inclusive)."""
        sql = """
        SELECT id, timestamp, glucose_mgdl, device_id, created_at
        FROM cgm_readings
        WHERE date(timestamp) >= date(?) AND date(timestamp) <= date(?)
        ORDER BY timestamp ASC;
        """
        with self._get_connection() as conn:
            rows = conn.execute(sql, (start_date, end_date)).fetchall()
            return [dict(row) for row in rows]

    def recalculate_cgm_summary_from_readings(self, date_ref: str) -> Dict[str, Any]:
        """Recalcula o sumário diário a partir das leituras brutas salvas.

        Se não houver leituras para a data, o sumário é removido/zerado.
        Retorna o dicionário do sumário salvo.
        """
        from longevidade.algorithms.cgm_metrics import calculate_cgm_summary

        readings = self.get_cgm_readings_by_date_range(date_ref, date_ref)
        glucose_values = [r["glucose_mgdl"] for r in readings]

        stats = calculate_cgm_summary(glucose_values)
        stats["date_ref"] = date_ref
        self.add_cgm_summary(stats)
        return stats

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

    # --- AI SETTINGS & HISTORY ---
    def _get_legacy_ai_secret(self, provider: str) -> Optional[str]:
        secret_field = PROVIDER_SECRET_FIELDS.get(provider)
        if not secret_field:
            raise ValueError(f"Provedor de IA não suportado: {provider}")

        sql = f"SELECT {secret_field} FROM ai_settings WHERE id = 1;"
        with self._get_connection() as conn:
            row = conn.execute(sql).fetchone()
            if not row:
                return None
            value = row[secret_field]
            if isinstance(value, str) and value.strip():
                return value
            return None

    def get_ai_secret(self, provider: str) -> Optional[str]:
        """Busca a chave real no cofre; usa coluna legada apenas como fallback de leitura.

        O fallback preserva compatibilidade sem migrar nem apagar segredos existentes.
        Novas gravações passam por `upsert_ai_settings` e vão para o cofre.
        """
        if provider not in PROVIDER_SECRET_FIELDS:
            raise ValueError(f"Provedor de IA não suportado: {provider}")
        try:
            secret = self.secrets_store.get(provider)
        except RuntimeError:
            secret = None
        if secret:
            return secret
        return self._get_legacy_ai_secret(provider)

    def has_ai_secret(self, provider: str) -> bool:
        return self.get_ai_secret(provider) is not None

    def get_ai_settings(self) -> Dict[str, Any]:
        sql = "SELECT * FROM ai_settings WHERE id = 1;"
        with self._get_connection() as conn:
            row = conn.execute(sql).fetchone()
            raw = dict(row) if row else {}

        settings = {
            "id": raw.get("id", 1),
            "active_provider": raw.get("active_provider", "openrouter"),
            "selected_model": raw.get("selected_model", "deepseek/deepseek-v4-pro"),
            "privacy_mode": raw.get("privacy_mode") or "minimal",
            "system_prompt_custom": raw.get("system_prompt_custom"),
        }
        for provider in AI_SECRET_PROVIDERS:
            settings[PROVIDER_HAS_FIELDS[provider]] = self.has_ai_secret(provider)
        return settings

    def upsert_ai_settings(self, data: Dict[str, Any]) -> None:
        update_data: Dict[str, Any] = {}
        for field in ["active_provider", "selected_model", "privacy_mode", "system_prompt_custom"]:
            if field in data:
                update_data[field] = data[field]

        # Novas chaves são gravadas no cofre e as colunas legadas ficam NULL.
        # Campos vazios/mascarados preservam o estado atual para não migrar/apagar segredos reais automaticamente.
        for provider, secret_field in PROVIDER_SECRET_FIELDS.items():
            if secret_field not in data:
                continue
            value = data[secret_field]
            if is_plain_secret_value(value):
                self.secrets_store.set(provider, str(value).strip())
                update_data[secret_field] = None
            elif is_masked_or_blank_secret(value):
                continue

        for provider in AI_SECRET_PROVIDERS:
            update_data[PROVIDER_HAS_FIELDS[provider]] = 1 if self.has_ai_secret(provider) else 0

        if not update_data:
            return
        update_set = ", ".join(f"{col} = ?" for col in update_data)
        sql = f"UPDATE ai_settings SET {update_set}, updated_at = CURRENT_TIMESTAMP WHERE id = 1;"
        values = list(update_data.values())
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()

    def save_ai_insight(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO ai_insights_history (
            provider_used, model_used, category, headline, insight_text, actionable_steps, user_prompt, tokens_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data.get("provider_used", "openrouter"),
            data.get("model_used", "deepseek/deepseek-v4-pro"),
            data.get("category", "geral"),
            data.get("headline", "Insight de Longevidade"),
            data.get("insight_text", ""),
            data.get("actionable_steps", ""),
            data.get("user_prompt"),
            data.get("tokens_used", 0)
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def get_ai_insights_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM ai_insights_history ORDER BY id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(row) for row in rows]

    # --- PIPELINE RUN ---
    def log_pipeline_run(self, source: str, records_inserted: int, status: str, logs: str = "") -> None:
        sql = "INSERT INTO pipeline_run (source, records_inserted, status, logs) VALUES (?, ?, ?, ?);"
        with self._get_connection() as conn:
            conn.execute(sql, (source, records_inserted, status, logs))
            conn.commit()

    def get_pipeline_runs(self, limit: int = 20) -> List[Dict[str, Any]]:
        sql = "SELECT id, source, run_at, records_inserted, status, logs FROM pipeline_run ORDER BY run_at DESC, id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            results: List[Dict[str, Any]] = []
            for row in rows:
                entry = dict(row)
                raw_logs = entry.pop("logs", "") or ""
                entry["log_summary"] = self._sanitize_log_summary(raw_logs)
                results.append(entry)
            return results

    @staticmethod
    def _sanitize_log_summary(raw_logs: str) -> str:
        """Gera um resumo sanitizado e curto dos logs do pipeline,
        sem vazar conteúdo sensível ou mensagens longas."""
        if not raw_logs:
            return ""

        first_line = raw_logs.strip().split("\n")[0][:120]

        # Sanitiza: remove caminhos de arquivo, IPs, tokens
        import re
        sanitized = re.sub(
            r"(/[a-zA-Z]:)?[/\\]{1,2}[^\\/:*?\"<>|]+[/\\][^\\/:*?\"<>|]+",
            "[caminho]",
            first_line,
        )
        sanitized = re.sub(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "[ip]", sanitized)
        sanitized = re.sub(r"[A-Za-z0-9+/=]{40,}", "[token]", sanitized)
        return sanitized[:120]

    # --- SUPLEMENTOS & COMPLIANCE (FASE 3) ---
    def get_supplements(self, only_active: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM supplement_stack WHERE is_active = 1 ORDER BY timing ASC, name ASC;" if only_active else "SELECT * FROM supplement_stack ORDER BY is_active DESC, id ASC;"
        with self._get_connection() as conn:
            rows = conn.execute(sql).fetchall()
            return [dict(r) for r in rows]

    def add_supplement(self, data: Dict[str, Any]) -> int:
        category = data.get("category", "Suplemento")
        sql = """
        INSERT INTO supplement_stack (name, dosage, category, frequency, timing, start_date, notes, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data["name"], data["dosage"], category, data.get("frequency", "Diário"),
            data.get("timing", "Manhã"), data.get("start_date", "2026-06-01"),
            data.get("notes"), data.get("is_active", 1)
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            supp_id = cursor.lastrowid
            
            # Log de Auditoria
            conn.execute(
                "INSERT INTO supplement_audit_logs (supplement_id, compound_name, category, action_type, new_value) VALUES (?, ?, ?, ?, ?);",
                (supp_id, data["name"], category, "ADICIONADO", f"Dose: {data['dosage']} ({data.get('timing', 'Manhã')})")
            )
            conn.commit()
            return supp_id

    def update_supplement(self, supplement_id: int, data: Dict[str, Any]) -> None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM supplement_stack WHERE id = ?;", (supplement_id,)).fetchone()
            if not row:
                return
            old_item = dict(row)

            new_name = data.get("name", old_item["name"])
            new_dosage = data.get("dosage", old_item["dosage"])
            new_category = data.get("category", old_item.get("category", "Suplemento"))
            new_frequency = data.get("frequency", old_item["frequency"])
            new_timing = data.get("timing", old_item["timing"])
            new_notes = data.get("notes", old_item.get("notes"))
            new_is_active = data.get("is_active", old_item["is_active"])

            sql_update = """
            UPDATE supplement_stack SET
            name = ?, dosage = ?, category = ?, frequency = ?, timing = ?, notes = ?, is_active = ?
            WHERE id = ?;
            """
            conn.execute(sql_update, (new_name, new_dosage, new_category, new_frequency, new_timing, new_notes, new_is_active, supplement_id))

            # Audit Log para alteração de dose ou horário
            if old_item["dosage"] != new_dosage:
                conn.execute(
                    "INSERT INTO supplement_audit_logs (supplement_id, compound_name, category, action_type, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?);",
                    (supplement_id, new_name, new_category, "DOSE_ALTERADA", old_item["dosage"], new_dosage)
                )
            elif old_item["timing"] != new_timing:
                conn.execute(
                    "INSERT INTO supplement_audit_logs (supplement_id, compound_name, category, action_type, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?);",
                    (supplement_id, new_name, new_category, "HORARIO_ALTERADO", old_item["timing"], new_timing)
                )
            conn.commit()

    def delete_supplement(self, supplement_id: int) -> None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT name, category, dosage FROM supplement_stack WHERE id = ?;", (supplement_id,)).fetchone()
            if row:
                c_name, c_cat, c_dose = row["name"], row["category"] or "Suplemento", row["dosage"]
                conn.execute("DELETE FROM supplement_stack WHERE id = ?;", (supplement_id,))
                conn.execute(
                    "INSERT INTO supplement_audit_logs (supplement_id, compound_name, category, action_type, old_value) VALUES (?, ?, ?, ?, ?);",
                    (supplement_id, c_name, c_cat, "REMOVIDO", f"Dose: {c_dose}")
                )
                conn.commit()

    def get_supplement_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM supplement_audit_logs ORDER BY id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(r) for r in rows]

    def toggle_supplement_log(self, supplement_id: int, taken_at_date: str, status: str = "tomado") -> None:
        sql_check = "SELECT id FROM supplement_logs WHERE supplement_id = ? AND taken_at_date = ?;"
        with self._get_connection() as conn:
            row = conn.execute(sql_check, (supplement_id, taken_at_date)).fetchone()
            if row:
                conn.execute("DELETE FROM supplement_logs WHERE id = ?;", (row["id"],))
            else:
                conn.execute("INSERT INTO supplement_logs (supplement_id, taken_at_date, status) VALUES (?, ?, ?);", (supplement_id, taken_at_date, status))
            conn.commit()

    def get_supplement_logs_for_date(self, taken_at_date: str) -> List[int]:
        sql = "SELECT supplement_id FROM supplement_logs WHERE taken_at_date = ? AND status = 'tomado';"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (taken_at_date,)).fetchall()
            return [r["supplement_id"] for r in rows]

    def save_daily_compliance(self, data: Dict[str, Any]) -> None:
        sql = """
        INSERT INTO protocol_compliance (
            date_ref, sleep_schedule_ok, supplements_ok, exercise_ok, fasting_window_ok, compliance_score, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date_ref) DO UPDATE SET
        sleep_schedule_ok = excluded.sleep_schedule_ok,
        supplements_ok = excluded.supplements_ok,
        exercise_ok = excluded.exercise_ok,
        fasting_window_ok = excluded.fasting_window_ok,
        compliance_score = excluded.compliance_score,
        notes = excluded.notes;
        """
        score = (
            (1 if data.get("sleep_schedule_ok") else 0) +
            (1 if data.get("supplements_ok") else 0) +
            (1 if data.get("exercise_ok") else 0) +
            (1 if data.get("fasting_window_ok") else 0)
        ) * 25.0

        values = (
            data["date_ref"],
            1 if data.get("sleep_schedule_ok") else 0,
            1 if data.get("supplements_ok") else 0,
            1 if data.get("exercise_ok") else 0,
            1 if data.get("fasting_window_ok") else 0,
            score,
            data.get("notes")
        )
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()

    def get_daily_compliance_history(self, days: int = 14) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM protocol_compliance ORDER BY date_ref DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (days,)).fetchall()
            return [dict(r) for r in rows]

    # --- INTERVENTIONS ---
    def get_interventions(self, only_active: bool = False) -> List[Dict[str, Any]]:
        if only_active:
            sql = "SELECT * FROM interventions WHERE is_active = 1 ORDER BY start_date DESC, name ASC;"
        else:
            sql = "SELECT * FROM interventions ORDER BY is_active DESC, start_date DESC, name ASC;"
        with self._get_connection() as conn:
            rows = conn.execute(sql).fetchall()
            return [dict(r) for r in rows]

    def add_intervention(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO interventions (name, category, start_date, end_date, dosage, target_metric, is_active, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            data["name"],
            data["category"],
            data["start_date"],
            data.get("end_date"),
            data.get("dosage"),
            data.get("target_metric"),
            data.get("is_active", 1),
            data.get("notes"),
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def update_intervention(self, intervention_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM interventions WHERE id = ?;", (intervention_id,)).fetchone()
            if not row:
                return None
            old_item = dict(row)

            new_name = data.get("name", old_item["name"])
            new_category = data.get("category", old_item["category"])
            new_start_date = data.get("start_date", old_item["start_date"])
            new_end_date = data.get("end_date", old_item.get("end_date"))
            new_dosage = data.get("dosage", old_item.get("dosage"))
            new_target_metric = data.get("target_metric", old_item.get("target_metric"))
            new_is_active = data.get("is_active", old_item["is_active"])
            new_notes = data.get("notes", old_item.get("notes"))

            sql = """
            UPDATE interventions SET
                name = ?, category = ?, start_date = ?, end_date = ?,
                dosage = ?, target_metric = ?, is_active = ?, notes = ?
            WHERE id = ?;
            """
            conn.execute(sql, (
                new_name, new_category, new_start_date, new_end_date,
                new_dosage, new_target_metric, new_is_active, new_notes,
                intervention_id,
            ))
            conn.commit()
            updated = conn.execute("SELECT * FROM interventions WHERE id = ?;", (intervention_id,)).fetchone()
            return dict(updated) if updated else None

    def delete_intervention(self, intervention_id: int) -> bool:
        with self._get_connection() as conn:
            row = conn.execute("SELECT id FROM interventions WHERE id = ?;", (intervention_id,)).fetchone()
            if not row:
                return False
            conn.execute("DELETE FROM interventions WHERE id = ?;", (intervention_id,))
            conn.commit()
            return True

    # --- KDM BIOLOGICAL AGE (FASE 3) ---
    def save_kdm_record(self, data: Dict[str, Any]) -> int:
        sql = """
        INSERT INTO kdm_records (calculated_at, chronological_age, kdm_age, kdm_delta, biomarkers_used, notes)
        VALUES (?, ?, ?, ?, ?, ?);
        """
        biomarkers_used = data.get("biomarkers_used", "")
        if isinstance(biomarkers_used, (list, tuple, set)):
            biomarkers_used = json.dumps(list(biomarkers_used), ensure_ascii=False)
        values = (
            data["calculated_at"], data["chronological_age"],
            data["kdm_age"], data["kdm_delta"],
            biomarkers_used, data.get("notes")
        )
        with self._get_connection() as conn:
            cursor = conn.execute(sql, values)
            conn.commit()
            return cursor.lastrowid

    def get_kdm_history(self, limit: int = 30) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM kdm_records ORDER BY calculated_at DESC, id DESC LIMIT ?;"
        with self._get_connection() as conn:
            rows = conn.execute(sql, (limit,)).fetchall()
            return [dict(row) for row in rows]

    def get_latest_kdm_record(self) -> Optional[Dict[str, Any]]:
        history = self.get_kdm_history(limit=1)
        return history[0] if history else None

    # --- PHYSICAL ASSESSMENTS ---
    def create_physical_assessment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        assessment_id = data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        sql = """
        INSERT INTO physical_assessments (
            id, assessment_date, title, weight_kg, body_fat_percentage,
            waist_cm, abdomen_cm, hip_cm, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            assessment_id,
            data["assessment_date"],
            data.get("title"),
            data.get("weight_kg"),
            data.get("body_fat_percentage"),
            data.get("waist_cm"),
            data.get("abdomen_cm"),
            data.get("hip_cm"),
            data.get("notes"),
            data.get("created_at", now),
            data.get("updated_at", now),
        )
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()
        return self.get_physical_assessment(assessment_id)  # type: ignore

    def get_physical_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM physical_assessments WHERE id = ?;"
        with self._get_connection() as conn:
            row = conn.execute(sql, (assessment_id,)).fetchone()
            if not row:
                return None
            record = dict(row)
            record["photos"] = self.list_physical_assessment_photos(assessment_id)
            return record

    def list_physical_assessments(
        self,
        limit: int = 50,
        offset: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        conditions = []
        params: list[Any] = []
        if start_date:
            conditions.append("assessment_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("assessment_date <= ?")
            params.append(end_date)
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
        SELECT * FROM physical_assessments
        {where_clause}
        ORDER BY assessment_date DESC, created_at DESC
        LIMIT ? OFFSET ?;
        """
        params.extend([limit, offset])
        with self._get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
            results = []
            for r in rows:
                rec = dict(r)
                rec["photos"] = self.list_physical_assessment_photos(rec["id"])
                results.append(rec)
            return results

    def update_physical_assessment(self, assessment_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        fields = []
        params: list[Any] = []
        updatable = [
            "assessment_date", "title", "weight_kg", "body_fat_percentage",
            "waist_cm", "abdomen_cm", "hip_cm", "notes"
        ]
        for key in updatable:
            if key in data:
                fields.append(f"{key} = ?")
                params.append(data[key])
        if not fields:
            return self.get_physical_assessment(assessment_id)
        now = datetime.now(timezone.utc).isoformat()
        fields.append("updated_at = ?")
        params.append(now)
        params.append(assessment_id)

        sql = f"UPDATE physical_assessments SET {', '.join(fields)} WHERE id = ?;"
        with self._get_connection() as conn:
            cursor = conn.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_physical_assessment(assessment_id)

    def delete_physical_assessment(self, assessment_id: str) -> bool:
        sql = "DELETE FROM physical_assessments WHERE id = ?;"
        with self._get_connection() as conn:
            cursor = conn.execute(sql, (assessment_id,))
            conn.commit()
            return cursor.rowcount > 0

    def add_physical_assessment_photo(self, photo_data: Dict[str, Any]) -> Dict[str, Any]:
        photo_id = photo_data.get("id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        sql = """
        INSERT INTO physical_assessment_photos (
            id, assessment_id, angle, body_state, description, original_filename,
            stored_filename, relative_path, mime_type, file_size, sha256,
            width, height, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        values = (
            photo_id,
            photo_data["assessment_id"],
            photo_data.get("angle", "other"),
            photo_data.get("body_state", "unspecified"),
            photo_data.get("description"),
            photo_data.get("original_filename"),
            photo_data["stored_filename"],
            photo_data["relative_path"],
            photo_data["mime_type"],
            photo_data["file_size"],
            photo_data["sha256"],
            photo_data.get("width"),
            photo_data.get("height"),
            photo_data.get("display_order", 0),
            photo_data.get("created_at", now),
        )
        with self._get_connection() as conn:
            conn.execute(sql, values)
            conn.commit()
        return self.get_physical_assessment_photo(photo_id)  # type: ignore

    def get_physical_assessment_photo(self, photo_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM physical_assessment_photos WHERE id = ?;"
        with self._get_connection() as conn:
            row = conn.execute(sql, (photo_id,)).fetchone()
            return dict(row) if row else None

    def list_physical_assessment_photos(self, assessment_id: str) -> List[Dict[str, Any]]:
        sql = """
        SELECT * FROM physical_assessment_photos
        WHERE assessment_id = ?
        ORDER BY display_order ASC, created_at ASC;
        """
        with self._get_connection() as conn:
            rows = conn.execute(sql, (assessment_id,)).fetchall()
            return [dict(r) for r in rows]

    def update_physical_assessment_photo(self, photo_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        fields = []
        params: list[Any] = []
        updatable = ["angle", "body_state", "description", "display_order"]
        for key in updatable:
            if key in data:
                fields.append(f"{key} = ?")
                params.append(data[key])
        if not fields:
            return self.get_physical_assessment_photo(photo_id)
        params.append(photo_id)
        sql = f"UPDATE physical_assessment_photos SET {', '.join(fields)} WHERE id = ?;"
        with self._get_connection() as conn:
            cursor = conn.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_physical_assessment_photo(photo_id)

    def delete_physical_assessment_photo(self, photo_id: str) -> bool:
        sql = "DELETE FROM physical_assessment_photos WHERE id = ?;"
        with self._get_connection() as conn:
            cursor = conn.execute(sql, (photo_id,))
            conn.commit()
            return cursor.rowcount > 0

