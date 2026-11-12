"""Extração local de prévia, executada em processo limitado pelo chamador."""
from __future__ import annotations

import io
import json
import re
import shutil
import subprocess
import sys

from PIL import Image, ImageFile
from longevidade.ingestion.lab_normalization import LAB_KEY_ALIASES, normalize_lab_key

Image.MAX_IMAGE_PIXELS = 20_000_000
ImageFile.LOAD_TRUNCATED_IMAGES = False
MAX_PAGES = 20
MAX_TEXT = 100_000


def _ocr(image: Image.Image) -> tuple[str, str | None]:
    executable = shutil.which('tesseract')
    if not executable:
        return '', 'OCR indisponível: instale o Tesseract com o idioma português.'
    buffer = io.BytesIO()
    image.convert('RGB').save(buffer, format='PNG')
    try:
        result = subprocess.run([executable, 'stdin', 'stdout', '-l', 'por'], input=buffer.getvalue(),
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return '', 'Não foi possível executar o OCR; preencha os resultados manualmente.'
    if result.returncode:
        return '', 'OCR indisponível ou idioma português ausente; preencha os resultados manualmente.'
    return result.stdout.decode('utf-8', errors='replace')[:MAX_TEXT], None


def _suggestions(text: str, page: int) -> list[dict]:
    known = set(LAB_KEY_ALIASES.values())
    rows = []
    for line in text.splitlines():
        match = re.match(r'^\s*(.{2,80}?)\s*[:=]\s*([<>≤≥]?\s*-?\d+(?:[.,]\d+)?)\s*([^\s]+)?', line)
        if not match:
            continue
        name, value, unit = match.groups()
        key = normalize_lab_key(name.strip())
        if key not in known:
            continue
        rows.append({'page': page, 'metric_key': key, 'raw_name': name.strip(),
                     'raw_value': value.strip(), 'raw_unit': unit or '', 'collected_at': None,
                     'ref_min': None, 'ref_max': None, 'method': None,
                     'warning': 'Sugestão automática: confira todos os campos no laudo.'})
    return rows[:500]


def extract_preview(payload: bytes) -> dict:
    pages = []
    if payload.startswith(b'%PDF-'):
        import pypdfium2 as pdfium
        document = pdfium.PdfDocument(payload)
        try:
            if len(document) > MAX_PAGES:
                raise ValueError('O PDF excede o limite de 20 páginas.')
            for index in range(len(document)):
                page = document[index]
                try:
                    textpage = page.get_textpage()
                    try:
                        text = textpage.get_text_range()[:MAX_TEXT]
                    finally:
                        textpage.close()
                    warning = None
                    if len(text.strip()) < 20:
                        width, height = page.get_size()
                        if width * height * 1.5 * 1.5 > 20_000_000:
                            raise ValueError('Página excede o limite de resolução.')
                        bitmap = page.render(scale=1.5)
                        try:
                            text, warning = _ocr(bitmap.to_pil())
                        finally:
                            bitmap.close()
                    pages.append({'page': index + 1, 'text': text, 'warning': warning})
                finally:
                    page.close()
        finally:
            document.close()
    else:
        with Image.open(io.BytesIO(payload)) as image:
            if image.width * image.height > 20_000_000:
                raise ValueError('A imagem excede o limite de resolução.')
            image.load()
            text, warning = _ocr(image)
            pages.append({'page': 1, 'text': text, 'warning': warning})
    suggestions = [row for page in pages for row in _suggestions(page['text'], page['page'])][:500]
    return {'pages': pages, 'suggestions': suggestions,
            'notice': 'A extração pode conter erros. Confira os dados no laudo antes de salvar.'}


def main() -> None:
    try:
        result = extract_preview(sys.stdin.buffer.read())
        sys.stdout.write(json.dumps(result, ensure_ascii=True))
    except Exception:
        sys.stdout.write(json.dumps({'error': 'Arquivo inválido ou não suportado para prévia.'}, ensure_ascii=True))
        sys.exit(1)


if __name__ == '__main__':
    main()
