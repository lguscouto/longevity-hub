import sqlite3
from fastapi.testclient import TestClient


def test_derived_and_timeline_get_do_not_change_database(client: TestClient):
    from backend.app.config import get_db_path

    def snapshot():
        connection = sqlite3.connect(get_db_path())
        try:
            return tuple(connection.iterdump())
        finally:
            connection.close()

    before = snapshot()
    for path in ('/api/biomarkers/derived', '/api/timeline', '/api/timeline/summary/weekly', '/api/phenoage/history'):
        assert client.get(path).status_code == 200
    assert snapshot() == before
