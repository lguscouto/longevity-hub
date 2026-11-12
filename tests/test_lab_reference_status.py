from fastapi.testclient import TestClient

from longevidade.reports.lab_reference import lab_reference_status


def test_reference_status_requires_origin_unit_and_bounds():
    lab = {'metric_key': 'fasting_glucose', 'value': 65, 'unit': 'mg/dL',
           'ref_min': 70, 'ref_max': 99, 'optimal_target': 85, 'record_origin': 'patient_lab'}
    assert lab_reference_status(lab) == 'out_of_range'
    assert lab_reference_status({**lab, 'value': 80}) == 'in_clinical_range'
    assert lab_reference_status({**lab, 'unit': 'unknown'}) == 'noncanonical_unit'
    assert lab_reference_status({**lab, 'ref_min': None, 'ref_max': None}) == 'no_reference'
    assert lab_reference_status({**lab, 'record_origin': 'unverified'}) == 'not_eligible'


def test_labs_export_and_briefing_agree_with_recorded_reference(client: TestClient):
    payload = {'records': [{'collected_at': '2026-01-23', 'metric_key': 'fasting_glucose',
               'value': 65, 'unit': 'mg/dL', 'ref_min': 70, 'ref_max': 99, 'optimal_target': 85}]}
    assert client.post('/api/labs/batch', json=payload).status_code == 200
    result = client.get('/api/labs').json()[0]
    assert result['reference_status'] == 'out_of_range'
    exported = client.get('/api/labs/export?format=json').json()['records'][0]
    assert exported['status_clinico'] == 'Fora da referência'
    briefing = client.get('/api/reports/doctor-briefing').json()['markdown']
    assert 'Fora da referência' in briefing
    assert 'Meta histórica não validada' in briefing
