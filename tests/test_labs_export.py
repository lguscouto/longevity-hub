from __future__ import annotations

import csv
import io
from starlette.testclient import TestClient


def test_export_labs_empty_database(client: TestClient):
    resp = client.get("/api/labs/export")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "exames_longevidade_historico_completo.csv" in resp.headers["content-disposition"]
    # Garante que possui BOM UTF-8 e cabeçalho
    text = resp.text
    assert text.startswith("\ufeff")
    reader = csv.reader(io.StringIO(text.lstrip("\ufeff")), delimiter=";")
    headers = next(reader)
    assert "Data Coleta" in headers
    assert "Exame" in headers
    assert "Resultado" in headers


def test_export_labs_with_data_and_date_filter(client: TestClient):
    # 1. Inserir exames em duas datas diferentes
    payload_1 = {
        "chronological_age": 35.0,
        "records": [
            {
                "collected_at": "2026-01-23",
                "metric_key": "total_testosterone",
                "metric_name": "Testosterona Total",
                "value": 282.0,
                "unit": "ng/dL",
            },
            {
                "collected_at": "2026-01-23",
                "metric_key": "platelets",
                "metric_name": "Plaquetas",
                "value": 235.0,
                "unit": "10^3/uL",
            },
        ],
    }
    payload_2 = {
        "chronological_age": 35.0,
        "records": [
            {
                "collected_at": "2024-03-13",
                "metric_key": "fasting_glucose",
                "metric_name": "Glicose de Jejum",
                "value": 85.0,
                "unit": "mg/dL",
            },
        ],
    }
    client.post("/api/labs/batch", json=payload_1)
    client.post("/api/labs/batch", json=payload_2)

    # 2. Exportar todos os exames
    all_resp = client.get("/api/labs/export")
    assert all_resp.status_code == 200
    all_text = all_resp.text.lstrip("\ufeff")
    reader_all = list(csv.reader(io.StringIO(all_text), delimiter=";"))
    assert len(reader_all) >= 4  # Header + pelo menos 3 linhas

    # 3. Exportar apenas a data 2026-01-23
    date_resp = client.get("/api/labs/export?date=2026-01-23")
    assert date_resp.status_code == 200
    assert "exames_longevidade_2026-01-23.csv" in date_resp.headers["content-disposition"]
    date_text = date_resp.text.lstrip("\ufeff")
    reader_date = list(csv.reader(io.StringIO(date_text), delimiter=";"))
    assert len(reader_date) == 3  # Header + 2 registros
    dates_in_csv = [row[0] for row in reader_date[1:]]
    assert all(d == "2026-01-23" for d in dates_in_csv)

    # 4. Exportar no formato JSON
    json_resp = client.get("/api/labs/export?date=2026-01-23&format=json")
    assert json_resp.status_code == 200
    json_data = json_resp.json()
    assert json_data["total_records"] == 2
    assert json_data["collected_at_filter"] == "2026-01-23"
    assert len(json_data["records"]) == 2
    metric_keys = [r["chave_metrica"] for r in json_data["records"]]
    assert "total_testosterone" in metric_keys
    assert "platelets" in metric_keys
