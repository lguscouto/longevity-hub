"""Consulta longitudinal sem reconciliação ou escrita no banco."""
from __future__ import annotations

from datetime import date
import json

from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.lab_normalization import normalize_lab_key
from longevidade.reports.lab_reference import lab_reference_status


def clinical_history(repo: LongevityRepository, metric_key: str, start: date, end: date) -> dict:
    start_text, end_text = start.isoformat(), end.isoformat()
    normalized = normalize_lab_key(metric_key)
    with repo._get_connection() as conn:
        labs = [dict(row) for row in conn.execute(
            "SELECT * FROM lab_results WHERE substr(collected_at, 1, 10) BETWEEN ? AND ? ORDER BY collected_at, id",
            (start_text, end_text),
        ) if normalize_lab_key(row['metric_key']) == normalized]
        interventions = [dict(row) for row in conn.execute(
            "SELECT id, name, category, start_date, end_date, dosage FROM interventions "
            "WHERE start_date <= ? AND (end_date IS NULL OR end_date >= ?) ORDER BY start_date, id",
            (end_text, start_text),
        )]
        symptoms = [dict(row) for row in conn.execute(
            "SELECT date_ref, symptom_severity, notes FROM daily_checkins "
            "WHERE date_ref BETWEEN ? AND ? AND symptom_severity IS NOT NULL ORDER BY date_ref",
            (start_text, end_text),
        )]
        symptom_events = [dict(row) for row in conn.execute(
            "SELECT id, date_ref, time_ref, title, description, source, metadata_json FROM health_events "
            "WHERE date_ref BETWEEN ? AND ? AND event_type = 'symptom' AND source = 'manual' ORDER BY date_ref, time_ref, id",
            (start_text, end_text),
        )]
        changes = [dict(row) for row in conn.execute(
            "SELECT id, created_at, compound_name, action_type, old_value, new_value FROM supplement_audit_logs "
            "WHERE substr(created_at, 1, 10) BETWEEN ? AND ? ORDER BY created_at, id",
            (start_text, end_text),
        )]
    for event in symptom_events:
        try:
            metadata = json.loads(event.pop('metadata_json') or '{}')
        except (TypeError, ValueError):
            metadata = {}
        if not isinstance(metadata, dict):
            metadata = {}
        event['severity'] = metadata.get('severity')
        event['intervention_id'] = metadata.get('intervention_id')
        event['intervention_name'] = next((item['name'] for item in interventions if item['id'] == event['intervention_id']), None)
    return {
        'metric_key': normalized, 'start_date': start_text, 'end_date': end_text,
        'labs': [{**row, 'reference_status': lab_reference_status(row)} for row in labs],
        'interventions': interventions, 'symptoms': symptoms, 'symptom_events': symptom_events, 'changes': changes,
    }
