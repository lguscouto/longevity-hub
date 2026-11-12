from fastapi.testclient import TestClient


def test_history_combines_sources_without_writing(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository

    repo = LongevityRepository(get_db_path())
    for value in (80, 85):
        repo.add_lab_result({'collected_at': '2026-01-10', 'metric_key': 'fasting_glucose',
                             'metric_name': 'Glicose', 'value': value, 'unit': 'mg/dL',
                             'record_origin': 'patient_lab'})
    repo.add_intervention({'name': 'Rotina sintética', 'category': 'rotina', 'start_date': '2025-12-01'})
    repo.upsert_daily_checkin({'date_ref': '2026-01-10', 'symptom_severity': 2, 'notes': 'Sintoma sintético'})
    with repo._get_connection() as conn:
        before = list(conn.iterdump())
    response = client.get('/api/timeline/clinical', params={'metric_key': 'glucose_mgdl',
                          'start_date': '2026-01-01', 'end_date': '2026-01-31'})
    assert response.status_code == 200
    data = response.json()
    assert [lab['value'] for lab in data['labs']] == [80, 85]
    assert data['interventions'][0]['name'] == 'Rotina sintética'
    assert data['symptoms'][0]['symptom_severity'] == 2
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before
    assert client.get('/api/timeline/clinical', params={'metric_key': 'glucose_mgdl',
                      'start_date': '2026-02-01', 'end_date': '2026-01-01'}).status_code == 422


def test_timeline_cannot_edit_imported_event_or_spoof_source(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository

    created = client.post('/api/timeline/events', json={'date_ref': '2026-01-01', 'event_type': 'symptom',
                          'category': 'symptom', 'title': 'Evento sintético', 'source': 'zepp'}).json()
    assert created['source'] == 'manual'
    repo = LongevityRepository(get_db_path())
    with repo._get_connection() as conn:
        conn.execute("UPDATE health_events SET source = 'zepp', source_type = 'workout' WHERE id = ?", (created['id'],))
        conn.commit()
        before = list(conn.iterdump())
    assert client.patch('/api/timeline/events/' + created['id'], json={'title': 'Alterado'}).status_code == 404
    assert client.delete('/api/timeline/events/' + created['id']).status_code == 404
    assert client.get('/api/timeline').status_code == 200
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before


def test_checkin_events_are_validated_linked_and_editable(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository
    repo = LongevityRepository(get_db_path())
    intervention_id = repo.add_intervention({'name': 'Intervenção sintética', 'category': 'rotina', 'start_date': '2025-01-01'})
    payload = {'date_ref': '2025-01-02', 'event_type': 'symptom', 'category': 'symptom', 'title': 'Sintoma sintético',
               'metadata': {'checkin_event': True, 'severity': 3, 'intervention_id': intervention_id}}
    response = client.post('/api/timeline/events', json=payload)
    assert response.status_code == 201, response.text
    event_id = response.json()['id']
    assert client.patch('/api/timeline/events/' + event_id, json={'title': 'Atualizado'}).status_code == 200
    invalid = dict(payload, metadata={'checkin_event': True, 'severity': 9})
    assert client.post('/api/timeline/events', json=invalid).status_code == 422
    history = client.get('/api/timeline/clinical', params={'metric_key': 'glucose_mgdl', 'start_date': '2025-01-01', 'end_date': '2025-01-03'}).json()
    assert history['symptom_events'][0]['title'] == 'Atualizado'
    assert client.delete('/api/timeline/events/' + event_id).status_code == 200
