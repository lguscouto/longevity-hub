def test_cors_allows_only_explicit_local_origins(client):
    allowed = client.options(
        "/api/health",
        headers={
            "Origin": "http://127.0.0.1:8886",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://127.0.0.1:8886"

    disallowed = client.options(
        "/api/health",
        headers={
            "Origin": "http://evil.example.invalid",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert disallowed.headers.get("access-control-allow-origin") is None
    assert disallowed.headers.get("access-control-allow-origin") != "*"


def test_app_declares_loopback_cors_defaults():
    from backend.app.main import LOCAL_ALLOWED_ORIGINS

    assert "http://127.0.0.1:8886" in LOCAL_ALLOWED_ORIGINS
    assert "http://127.0.0.1:8887" in LOCAL_ALLOWED_ORIGINS
    assert "*" not in LOCAL_ALLOWED_ORIGINS
