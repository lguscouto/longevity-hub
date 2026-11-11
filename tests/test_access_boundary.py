import importlib
import time
import re
from io import BytesIO

import keyring
import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture(autouse=True)
def nondefault_trainer_account(client: TestClient):
    auth = importlib.import_module("backend.app.routers.personal_auth")
    conn = auth._get_connection()
    try:
        auth._ensure_trainer_accounts_table(conn)
        conn.execute("UPDATE personal_trainer_accounts SET password_hash=? WHERE username=?", (auth.hash_password("test-trainer-password"), "willian"))
        conn.commit()
    finally:
        conn.close()


def test_owner_and_trainer_permissions_are_separate(client: TestClient):
    access = importlib.import_module("backend.app.access")
    keyring.set_password(access.SERVICE, access.OWNER_KEY, access.password_hash("temporary-test-password"))
    client.cookies.clear()
    assert client.get("/api/labs").status_code == 401


    assert client.get("/api/profile").status_code == 401
    assert client.get("/openapi.json").status_code == 401
    assert client.post("/api/sync/all").status_code == 401

    trainer = client.post("/api/personal/login", json={"username": "willian", "password": "test-trainer-password"})
    assert trainer.status_code == 200
    assert client.get("/api/labs").status_code == 200
    assert client.get("/api/physical-assessments").status_code == 200
    assert client.get("/api/profile").status_code == 401
    assert client.post("/api/physical-assessments", json={}).status_code == 401
    assert client.post("/api/sync/all").status_code == 401

    assert client.post("/api/owner/login", json={"username": "gustavo", "password": "wrong"}).status_code == 401
    assert client.post("/api/owner/login", json={"username": "gustavo", "password": "temporary-test-password"}).status_code == 200
    assert client.get("/api/profile").status_code == 200
    token = client.cookies.get(access.OWNER_COOKIE)
    access._owner_sessions[token] = time.monotonic() - 1
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/labs").status_code == 200
    client.post("/api/personal/logout")
    assert client.get("/api/labs").status_code == 401


def test_all_registered_api_routes_require_authentication_except_explicit_public_routes(client: TestClient):
    main = importlib.import_module("backend.app.main")
    public = {
        "/api/owner/login", "/api/owner/session", "/api/owner/logout",
        "/api/personal/login", "/api/personal/session", "/api/personal/logout", "/api/personal/change-password",
        "/api/google-health/callback", "/api/google-health/webhook",
    }
    client.cookies.clear()
    checked = 0
    routes = []
    for item in main.app.routes:
        original = getattr(item, "original_router", None)
        routes.extend(original.routes if original is not None else [item])
    for route in routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api/") or path in public:
            continue
        concrete = re.sub(r"\{[^}]+\}", "test-id", path)
        for method in getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}:
            assert client.request(method, concrete).status_code == 401, (method, concrete)
            checked += 1
    assert checked > 50


def test_transport_rejects_remote_http_and_forged_proxy_headers(client: TestClient):
    main = importlib.import_module("backend.app.main")
    with TestClient(main.app, base_url="http://example.invalid", client=("203.0.113.12", 5000)) as remote:
        assert remote.post("/api/owner/login", json={"username": "gustavo", "password": "x"}).status_code == 403
        assert remote.post("/api/owner/login", headers={"X-Forwarded-Proto": "https"}, json={"username": "gustavo", "password": "x"}).status_code == 403
    with TestClient(main.app, base_url="https://example.invalid", client=("203.0.113.12", 5000)) as remote:
        assert remote.get("/api/profile").status_code == 401


def test_explicitly_trusted_proxy_can_forward_https(client: TestClient, monkeypatch):
    monkeypatch.setenv("LONGEVIDADE_TRUSTED_PROXIES", "192.0.2.10")
    main = importlib.import_module("backend.app.main")
    with TestClient(main.app, base_url="http://service.invalid", client=("192.0.2.10", 5000)) as proxy:
        assert proxy.get("/api/profile", headers={"X-Forwarded-Proto": "https"}).status_code == 401
        assert proxy.get("/api/profile", headers={"X-Forwarded-Proto": "http"}).status_code == 403


def test_owner_login_is_rate_limited(client: TestClient):
    access = importlib.import_module("backend.app.access")
    keyring.set_password(access.SERVICE, access.OWNER_KEY, access.password_hash("temporary-test-password"))
    client.cookies.clear()
    for _ in range(8):
        assert client.post("/api/owner/login", json={"username": "gustavo", "password": "wrong"}).status_code == 401
    assert client.post("/api/owner/login", json={"username": "gustavo", "password": "wrong"}).status_code == 429


def test_owner_cookie_logout_and_https_flags(client: TestClient):
    access = importlib.import_module("backend.app.access")
    keyring.set_password(access.SERVICE, access.OWNER_KEY, access.password_hash("temporary-test-password"))
    main = importlib.import_module("backend.app.main")
    with TestClient(main.app, base_url="https://service.invalid", client=("203.0.113.12", 5000)) as remote:
        result = remote.post("/api/owner/login", json={"username": "gustavo", "password": "temporary-test-password"})
        assert result.status_code == 200
        cookie = result.headers["set-cookie"].lower()
        assert "secure" in cookie and "httponly" in cookie and "samesite=strict" in cookie
        assert remote.get("/api/profile").status_code == 200
        assert remote.post("/api/owner/logout").status_code == 200
        assert remote.get("/api/profile").status_code == 401


def test_cross_origin_mutation_and_unconfigured_webhook_are_rejected(client: TestClient, monkeypatch):
    client.cookies.clear()
    monkeypatch.delenv("GOOGLE_HEALTH_WEBHOOK_SECRET", raising=False)
    monkeypatch.delenv("GOOGLE_HEALTH_ENDPOINT_AUTH", raising=False)
    assert client.post("/api/owner/login", headers={"Origin": "http://evil.invalid"}, json={"username": "gustavo", "password": "x"}).status_code == 403
    assert client.post("/api/google-health/webhook", json={"type": "notification"}).status_code == 401
    assert client.post("/api/google-health/webhook", headers={"Authorization": "anything"}, json={"type": "verification"}).status_code == 401


def test_trainer_can_view_photos_and_download_but_not_mutate(client: TestClient):
    created = client.post("/api/physical-assessments", json={"assessment_date": "2026-01-01", "title": "Teste"})
    assert created.status_code == 201
    assessment = created.json()["id"]
    image = BytesIO()
    Image.new("RGB", (20, 20), "blue").save(image, format="JPEG")
    uploaded = client.post(f"/api/physical-assessments/{assessment}/photos",
                           files={"files": ("test.jpg", image.getvalue(), "image/jpeg")},
                           data={"angle": "front", "body_state": "relaxed"})
    assert uploaded.status_code == 201
    content_url = uploaded.json()[0]["content_url"]
    download_url = f"/api/physical-assessments/{assessment}/photos/download"
    client.cookies.clear()
    assert client.get(content_url).status_code == 401
    assert client.get(download_url).status_code == 401
    assert client.post("/api/personal/login", json={"username": "willian", "password": "test-trainer-password"}).status_code == 200
    assert client.get(content_url).headers["content-type"] == "image/jpeg"
    assert client.get(download_url).headers["content-type"] == "application/zip"
    assert client.delete(f"/api/physical-assessments/{assessment}").status_code == 401


def test_default_trainer_password_requires_change_before_data_access(client: TestClient):
    auth = importlib.import_module("backend.app.routers.personal_auth")
    conn = auth._get_connection()
    try:
        conn.execute("UPDATE personal_trainer_accounts SET password_hash=? WHERE username=?", (auth.DEFAULT_PT_HASH, "willian"))
        conn.commit()
    finally:
        conn.close()
    client.cookies.clear()
    result = client.post("/api/personal/login", json={"username": "willian", "password": "1234"})
    assert result.status_code == 200
    assert result.json()["requires_password_change"] is True
    assert client.get("/api/labs").status_code == 401
    token = result.json()["token"]
    result = client.post("/api/personal/change-password", headers={"X-Personal-Token": token},
                         json={"current_password": "1234", "new_password": "new-test-password"})
    assert result.status_code == 200
    assert client.get("/api/labs").status_code == 200


def test_remote_attacker_cannot_replace_the_public_initial_trainer_password(client: TestClient):
    auth = importlib.import_module("backend.app.routers.personal_auth")
    access = importlib.import_module("backend.app.access")
    keyring.set_password(access.SERVICE, access.OWNER_KEY, access.password_hash("temporary-test-password"))
    conn = auth._get_connection()
    try:
        conn.execute("UPDATE personal_trainer_accounts SET password_hash=? WHERE username=?", (auth.DEFAULT_PT_HASH, "willian"))
        conn.commit()
    finally:
        conn.close()
    main = importlib.import_module("backend.app.main")
    with TestClient(main.app, base_url="https://service.invalid", client=("203.0.113.12", 5000)) as remote:
        login = remote.post("/api/personal/login", json={"username": "willian", "password": "1234"})
        token = login.json()["token"]
        payload = {"current_password": "1234", "new_password": "new-test-password"}
        assert remote.post("/api/personal/change-password", headers={"X-Personal-Token": token}, json=payload).status_code == 403
        assert remote.get("/api/labs").status_code == 401
        assert remote.post("/api/owner/login", json={"username": "gustavo", "password": "temporary-test-password"}).status_code == 200
        assert remote.post("/api/personal/change-password", headers={"X-Personal-Token": token}, json=payload).status_code == 200


def test_owner_local_pin_rejects_wrong_username_and_remote_use(client: TestClient):
    access = importlib.import_module("backend.app.access")
    keyring.set_password(access.SERVICE, access.OWNER_LOCAL_KEY, access.password_hash("9271"))
    client.cookies.clear()
    credentials = {"username": "gustavo", "password": "9271"}
    assert client.post("/api/owner/login", json={**credentials, "username": "outra-pessoa"}).status_code == 401
    malformed_pin = client.post("/api/owner/login", json={**credentials, "password": "92711"})
    assert malformed_pin.status_code == 401
    assert "PIN de 4 dígitos" in malformed_pin.json()["detail"]
    assert client.post("/api/owner/login", json=credentials).status_code == 200
    assert client.get("/api/profile").status_code == 200
    token = client.cookies.get(access.OWNER_COOKIE)

    main = importlib.import_module("backend.app.main")
    with TestClient(main.app, base_url="https://service.invalid", client=("203.0.113.12", 5000)) as remote:
        assert remote.post("/api/owner/login", json=credentials).status_code == 401
        remote.cookies.set(access.OWNER_COOKIE, token)
        assert remote.get("/api/owner/session").status_code == 401
        assert remote.get("/api/profile").status_code == 401

    assert client.post("/api/owner/logout").status_code == 200
    assert client.get("/api/profile").status_code == 401
