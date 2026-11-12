"""Exportação portátil de medições sem incluir banco ou credenciais."""
from datetime import datetime, timezone
import io
import json
import zipfile

from longevidade.db.repository import LongevityRepository

EXPORT_TABLES = (
    'lab_results', 'daily_metrics', 'daily_metric_quality', 'daily_checkins', 'health_events',
    'interventions', 'n_of_1_experiments', 'supplement_stack', 'supplement_logs',
    'supplement_audit_logs', 'manual_entries', 'cgm_readings', 'cgm_daily_summary',
    'phenoage_records', 'kdm_records', 'workouts', 'workout_exercises', 'workout_sets',
    'physical_assessments', 'health_data_points', 'protocol_compliance',
)


def create_portable_export(repo: LongevityRepository) -> bytes:
    with repo._get_connection() as conn:
        data = {table: [dict(row) for row in conn.execute(f'SELECT * FROM {table} ORDER BY rowid')]
                for table in EXPORT_TABLES}
    manifest = {'format': 'longevidade-measurements', 'version': 1,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'records': {table: len(rows) for table, rows in data.items()},
                'excludes': ['credenciais', 'fotos', 'configurações', 'demais tabelas']}
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
        archive.writestr('LEIA-ME.txt', 'Exportação de medições em JSON UTF-8. O pacote não é criptografado. '
                         'Exames incluem raw_value/raw_unit, value/unit, data e record_origin. '
                         'daily_metric_quality contém a origem por métrica quando disponível. '
                         'Ausência de origem representa informação indisponível. '
                         'Também inclui eventos, check-ins, intervenções e outros registros de saúde listados no manifesto. '
                         'Não substitui o backup de banco e fotos.')
        for table, rows in data.items():
            archive.writestr(f'{table}.json', json.dumps(rows, ensure_ascii=False, indent=2, allow_nan=False))
    return output.getvalue()
