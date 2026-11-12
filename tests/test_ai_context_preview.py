from fastapi.testclient import TestClient


def test_ai_preview_is_read_only_and_changed_context_requires_new_review(client: TestClient, monkeypatch):
    from backend.app.config import get_db_path
    from backend.app.routers import ai
    from longevidade.db.repository import LongevityRepository

    repo = LongevityRepository(get_db_path())
    with repo._get_connection() as conn:
        before = list(conn.iterdump())
    preview = client.post('/api/ai/context-preview', json={'action': 'chat', 'prompt': 'Pergunta sintética'})
    assert preview.status_code == 200 and preview.headers['cache-control'] == 'no-store'
    assert preview.json()['context'] and preview.json()['provider']
    with repo._get_connection() as conn:
        assert list(conn.iterdump()) == before
    repo.upsert_user_profile({'height_cm': 171})
    called = []
    monkeypatch.setattr(ai, '_require_provider_secret', lambda *_: 'test-only')
    monkeypatch.setattr(ai, 'generate_llm_response', lambda **_: called.append(True) or ('resposta sintética', None))
    response = client.post('/api/ai/chat', json={'prompt': 'Pergunta sintética', 'review_hash': preview.json()['review_hash']})
    assert response.status_code == 409
    assert not called
