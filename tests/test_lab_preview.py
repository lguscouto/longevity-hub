import io
import shutil

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFont
import pytest
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def test_pdf_preview_is_read_only_and_requires_review(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.db.repository import LongevityRepository

    repo = LongevityRepository(get_db_path())
    with repo._get_connection() as conn:
        before = list(conn.iterdump())
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(50, 750, 'Glicose: 90 mg/dL')
    pdf.drawString(50, 730, 'Confira os resultados no laudo original.')
    pdf.save()
    response = client.post('/api/labs/preview', files={'file': ('laudo.pdf', buffer.getvalue(), 'application/pdf')})
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    assert response.json()['suggestions'][0]['raw_value'] == '90'
    assert response.json()['suggestions'][0]['page'] == 1
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before


def test_preview_rejects_invalid_file(client: TestClient):
    assert client.post('/api/labs/preview', files={'file': ('bad.png', b'bad', 'image/png')}).status_code == 422


def test_image_preview_reports_missing_ocr(monkeypatch):
    from longevidade.ingestion import lab_preview_worker

    monkeypatch.setattr(lab_preview_worker.shutil, 'which', lambda _: None)
    image = io.BytesIO()
    Image.new('RGB', (100, 100), 'white').save(image, format='PNG')
    result = lab_preview_worker.extract_preview(image.getvalue())
    assert result['suggestions'] == []
    assert 'OCR indisponível' in result['pages'][0]['warning']


@pytest.mark.skipif(not shutil.which('tesseract'), reason='Tesseract local indisponível')
def test_local_ocr_image_and_scanned_pdf(client: TestClient):
    image = Image.new('RGB', (1600, 250), 'white')
    try:
        font = ImageFont.truetype('arial.ttf', 55)
    except OSError:
        font = ImageFont.load_default(size=55)
    ImageDraw.Draw(image).text((40, 70), 'Glicose: 90 mg/dL', font=font, fill='black')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    response = client.post('/api/labs/preview', files={'file': ('laudo.png', buffer.getvalue(), 'image/png')})
    assert response.status_code == 200
    assert '90' in response.json()['pages'][0]['text']
    scanned = io.BytesIO()
    pdf = canvas.Canvas(scanned, pagesize=(800, 125))
    pdf.drawImage(ImageReader(image), 0, 0, 800, 125)
    pdf.save()
    response = client.post('/api/labs/preview', files={'file': ('scaneado.pdf', scanned.getvalue(), 'application/pdf')})
    assert response.status_code == 200
    assert '90' in response.json()['pages'][0]['text']


def test_reviewed_import_backup_duplicates_and_raw_values(client: TestClient):
    from backend.app.config import get_db_path
    from longevidade.backup import verify_backup

    row = {'collected_at': '2026-01-23', 'metric_key': 'glucose_mgdl', 'value': 90,
           'unit': 'mg/dL', 'raw_value': 90, 'raw_unit': 'mg/dL', 'ref_min': 70, 'ref_max': 99}
    assert client.post('/api/labs/confirm', json={'records': [row]}).status_code == 422
    response = client.post('/api/labs/confirm', json={'records': [row], 'confirmed': True})
    assert response.status_code == 200
    backups = list((get_db_path().parent / 'backups').glob('*.zip'))
    assert backups
    verify_backup(backups[-1])
    saved = client.get('/api/labs').json()[0]
    assert saved['raw_value'] == 90 and saved['raw_unit'] == 'mg/dL'
    assert client.post('/api/labs/confirm', json={'records': [row], 'confirmed': True}).status_code == 409
    assert client.post('/api/labs/confirm', json={'records': [{**row, 'raw_value': '<90'}], 'confirmed': True}).status_code == 422
    assert client.post('/api/labs/confirm', json={'records': [{**row, 'raw_value': 80}], 'confirmed': True}).status_code == 422
    preview = client.post('/api/labs/validate-preview', json={'records': [row]})
    assert preview.status_code == 200 and preview.headers['cache-control'] == 'no-store'
    assert preview.json()['records'][0]['duplicate'] is True


def test_preview_validates_units_and_inverted_ranges(client: TestClient):
    row = {'collected_at': '2026-01-23', 'metric_key': 'glucose_mgdl', 'value': 90,
           'unit': 'unidade inválida', 'raw_value': 90, 'raw_unit': 'unidade inválida'}
    response = client.post('/api/labs/validate-preview', json={'records': [row]})
    assert response.status_code == 200 and response.json()['records'][0]['error']
    invalid_range = {**row, 'unit': 'mg/dL', 'raw_unit': 'mg/dL', 'ref_min': 100, 'ref_max': 70}
    assert client.post('/api/labs/validate-preview', json={'records': [invalid_range]}).json()['records'][0]['error']


def test_reviewed_import_rolls_back_on_failure(client: TestClient, monkeypatch):
    from longevidade.db.repository import LongevityRepository

    original = LongevityRepository.add_lab_result
    calls = 0

    def fail_second(self, data, connection=None):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError('simulated failure')
        return original(self, data, connection=connection)

    monkeypatch.setattr(LongevityRepository, 'add_lab_result', fail_second)
    rows = [{'collected_at': '2026-01-23', 'metric_key': key, 'value': 90,
             'unit': 'mg/dL', 'raw_value': 90, 'raw_unit': 'mg/dL'} for key in ('glucose_mgdl', 'apob')]
    assert client.post('/api/labs/confirm', json={'records': rows, 'confirmed': True}).status_code == 503
    assert client.get('/api/labs').json() == []
