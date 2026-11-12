import io
import json
import zipfile
from fastapi.testclient import TestClient


def test_portable_export_preserves_raw_units_and_does_not_write(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository
    repo = LongevityRepository(get_db_path())
    repo.add_lab_result({'collected_at': '2026-01-01', 'metric_key': 'glucose_mgdl', 'metric_name': 'Glicose',
                         'value': 90, 'unit': 'mg/dL', 'raw_value': 5, 'raw_unit': 'mmol/L', 'record_origin': 'patient_lab'})
    repo.upsert_daily_checkin({'date_ref': '2026-01-01', 'notes': 'Registro sintético'})
    with repo._get_connection() as conn:
        before = list(conn.iterdump())
    response = client.get('/api/reports/measurements-export')
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert {'manifest.json', 'LEIA-ME.txt', 'lab_results.json', 'daily_metrics.json', 'daily_metric_quality.json',
                'daily_checkins.json', 'health_events.json', 'interventions.json'}.issubset(archive.namelist())
        assert 'ai_settings.json' not in archive.namelist()
        assert json.loads(archive.read('daily_checkins.json'))[0]['notes'] == 'Registro sintético'
        lab = json.loads(archive.read('lab_results.json'))[0]
        assert (lab['value'], lab['unit'], lab['raw_value'], lab['raw_unit'], lab['record_origin']) == (90, 'mg/dL', 5, 'mmol/L', 'patient_lab')
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before
