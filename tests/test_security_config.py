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

    lan_disallowed = client.options(
        "/api/health",
        headers={
            "Origin": "http://192.168.100.250:8887",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert lan_disallowed.headers.get("access-control-allow-origin") is None


def test_app_declares_loopback_cors_defaults():
    from backend.app.main import LOCAL_ALLOWED_ORIGINS

    assert "http://127.0.0.1:8886" in LOCAL_ALLOWED_ORIGINS
    assert "http://127.0.0.1:8887" in LOCAL_ALLOWED_ORIGINS
    assert "*" not in LOCAL_ALLOWED_ORIGINS


def test_cors_regex_allows_lan_when_env_enabled(monkeypatch):
    import re
    from backend.app.main import _get_cors_origin_regex

    default_regex = _get_cors_origin_regex()
    assert re.match(default_regex, "http://127.0.0.1:8887")
    assert re.match(default_regex, "http://whitexp.ddns.net:8887")
    assert not re.match(default_regex, "http://192.168.100.250:8887")

    monkeypatch.setenv("LONGEVIDADE_ALLOW_LAN", "1")
    lan_regex = _get_cors_origin_regex()
    assert re.match(lan_regex, "http://192.168.100.250:8887")
    assert re.match(lan_regex, "http://192.168.1.10:8886")
    assert not re.match(lan_regex, "http://evil.example.invalid")
