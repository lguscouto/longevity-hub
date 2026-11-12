from fastapi.testclient import TestClient


def test_planned_experiment_counts_missing_and_preserves_legacy_contract(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository

    payload = {'title': 'Experimento sintético', 'hypothesis': 'Hipótese', 'metric_key': 'hrv_ms',
               'control_start': '2025-01-01', 'control_end': '2025-01-03',
               'treatment_start': '2025-01-04', 'treatment_end': '2025-01-06'}
    old_response = client.post('/api/n-of-1', json=payload).json()
    assert old_response['saved'] is False
    payload.update(save_incomplete=True, adherence='2 de 3 dias', simultaneous_changes='Rotina')
    response = client.post('/api/n-of-1', json=payload)
    assert response.status_code == 200 and response.json()['saved'] is True
    repo = LongevityRepository(get_db_path())
    repo.upsert_daily_metric({'date_ref': '2025-01-01', 'hrv_ms': 40})
    with repo._get_connection() as conn:
        before = list(conn.iterdump())
    response = client.get('/api/n-of-1')
    result = response.json()[0]
    assert result['adherence'] == '2 de 3 dias'
    assert result['simultaneous_changes'] == 'Rotina'
    assert (result['control_observations'], result['control_missing']) == (1, 2)
    assert result['treatment_missing'] == 3 and result['p_value'] is None
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before


def test_future_days_are_not_reported_as_missing(client: TestClient):
    from datetime import date, timedelta

    start = date.today() + timedelta(days=10)
    payload = {'title': 'Planejado', 'metric_key': 'hrv_ms', 'save_incomplete': True,
               'control_start': str(start), 'control_end': str(start + timedelta(days=2)),
               'treatment_start': str(start + timedelta(days=3)), 'treatment_end': str(start + timedelta(days=5))}
    assert client.post('/api/n-of-1', json=payload).json()['saved'] is True
    result = client.get('/api/n-of-1').json()[0]
    assert result['control_missing'] == 0 and result['treatment_missing'] == 0
