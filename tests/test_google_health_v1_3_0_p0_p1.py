"""
Testes de conformidade para Longevidade Hub v1.3.0 — Google Health API (P0, P1 e P2).
Atende às diretrizes do projeto Longevidade:
- Fixture client: TestClient injetado como parâmetro para rotas FastAPI
- Proibido TestClient(app) no nível de módulo
- Cobertura de GetIdentity, migração, webhooks em lote, healthUserId, subscriber lifecycle, registry e escopos
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError
import pytest
from fastapi.testclient import TestClient

from longevidade.ingestion.google_health_client import (
    GOOGLE_HEALTH_SCOPES,
    GoogleHealthClient,
    GoogleHealthCredentials,
    GoogleHealthDataTypeRegistry,
    SCOPE_ACTIVITY,
    SCOPE_HEALTH_METRICS,
    SCOPE_ECG,
    SCOPE_IRN,
)
from longevidade.integrations.google_health.webhooks import (
    normalize_webhook_payloads,
    extract_notification_events,
    parse_webhook_payload,
)


# ── P0.1: GetIdentity & Persistência de healthUserId ────────────────────────

def test_get_identity_success(tmp_path: Path):
    token_path = tmp_path / "token.json"
    creds = GoogleHealthCredentials(
        client_id="client123",
        client_secret="secret123",
        access_token="valid_access_token",
        refresh_token="valid_refresh_token",
    )
    creds.save_to_file(token_path)

    client = GoogleHealthClient(credentials=creds, token_path=token_path)

    mock_resp = {
        "healthUserId": "health-user-xyz-456",
        "legacyUserId": "fitbit-user-789",
        "name": "users/me/identity",
    }

    mock_urlopen_resp = MagicMock()
    mock_urlopen_resp.read.return_value = json.dumps(mock_resp).encode("utf-8")
    mock_urlopen_resp.__enter__.return_value = mock_urlopen_resp

    with patch("longevidade.integrations.google_health.client._get_urlopen") as mock_get_urlopen:
        mock_get_urlopen.return_value.return_value = mock_urlopen_resp
        data, err = client.get_identity("valid_access_token")

        assert err is None
        assert data["healthUserId"] == "health-user-xyz-456"
        assert client.credentials.health_user_id == "health-user-xyz-456"

        # Verifica persistência no arquivo JSON
        reloaded = GoogleHealthCredentials.from_file(token_path)
        assert reloaded is not None
        assert reloaded.health_user_id == "health-user-xyz-456"


def test_get_identity_missing_scope_error(tmp_path: Path):
    token_path = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="token_without_scope")
    client = GoogleHealthClient(credentials=creds, token_path=token_path)

    error_body = json.dumps({
        "error": {
            "code": 403,
            "message": "Request had insufficient authentication scopes.",
            "status": "PERMISSION_DENIED",
            "details": [{"reason": "MISSING_OAUTH_SCOPE"}],
        }
    }).encode("utf-8")

    http_err = HTTPError("url", 403, "Forbidden", hdrs={}, fp=MagicMock(read=lambda *args, **kwargs: error_body))

    with patch("longevidade.integrations.google_health.client._get_urlopen") as mock_get_urlopen:
        mock_get_urlopen.return_value.side_effect = http_err
        data, err = client.get_identity("token_without_scope")

        assert data is None
        assert "MISSING_OAUTH_SCOPE" in str(err)


# ── P0.2: Migração transparente de usuários existentes ──────────────────────

def test_ensure_active_token_migrates_existing_user(tmp_path: Path):
    token_path = tmp_path / "legacy_token.json"
    # Credencial antiga sem health_user_id
    legacy_creds = GoogleHealthCredentials(
        client_id="cid",
        client_secret="sec",
        access_token="active_token",
        refresh_token="ref_token",
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        health_user_id=None,
    )
    legacy_creds.save_to_file(token_path)

    client = GoogleHealthClient(token_path=token_path)
    assert client.credentials.health_user_id is None

    mock_resp = {"healthUserId": "migrated-health-id-999"}
    with patch.object(client, "get_identity", return_value=(mock_resp, None)) as mock_id:
        # ensure_active_token detecta ausência de health_user_id e executa migração
        ok, err = client.ensure_active_token()
        assert ok is True
        assert err is None
        mock_id.assert_called_once()


# ── P1.1 & P1.2 & P2.1 & P2.2 & P2.4: Registry e Escopos ───────────────────

def test_registry_new_data_types_present():
    expected_types = [
        "daily-respiratory-rate",
        "daily-heart-rate-zones",
        "daily-vo2-max",
        "run-vo2-max",
        "daily-sleep-temperature-derivations",
        "core-body-temperature",
        "respiratory-rate-sleep-summary",
        "exercise",
        "sedentary-period",
        "time-in-heart-rate-zone",
        "active-minutes",
        "total-calories",
        "swim-lengths-data",
        "ground-contact-time",
        "step-cadence",
        "stride-length",
    ]
    for dt in expected_types:
        cfg = GoogleHealthDataTypeRegistry.get(dt)
        assert cfg is not None, f"Tipo {dt} ausente no registry"
        assert cfg.filter_name == dt.replace("-", "_")
        assert cfg.provider == "google_health"
        assert cfg.is_active is True


def test_registry_ecg_and_irn_opt_in():
    ecg_cfg = GoogleHealthDataTypeRegistry.get("electrocardiogram")
    assert ecg_cfg is not None
    assert ecg_cfg.status == "opt_in"
    assert ecg_cfg.is_active is False
    assert ecg_cfg.scope == SCOPE_ECG
    assert ecg_cfg.webhook_supported is False
    assert GoogleHealthDataTypeRegistry.is_webhook_supported("electrocardiogram") is False

    irn_cfg = GoogleHealthDataTypeRegistry.get("irregular-rhythm-notification")
    assert irn_cfg is not None
    assert irn_cfg.status == "opt_in"
    assert irn_cfg.is_active is False
    assert irn_cfg.scope == SCOPE_IRN
    # P0: IRN não é documentado como tipo com suporte a webhook na Google Health API
    assert irn_cfg.webhook_supported is False
    assert GoogleHealthDataTypeRegistry.is_webhook_supported("irregular-rhythm-notification") is False

    webhook_types = GoogleHealthDataTypeRegistry.get_webhook_supported_types()
    assert "irregular-rhythm-notification" not in webhook_types
    assert "electrocardiogram" not in webhook_types

    # Garantir que NÃO estão nos escopos padrão de consentimento
    assert SCOPE_ECG not in GOOGLE_HEALTH_SCOPES
    assert SCOPE_IRN not in GOOGLE_HEALTH_SCOPES


def test_registry_blood_pressure_health_connect_only():
    bp_cfg = GoogleHealthDataTypeRegistry.get("blood-pressure")
    assert bp_cfg is not None
    assert bp_cfg.provider == "health_connect"
    assert bp_cfg.status == "health_connect_only"
    assert "android.permission" in bp_cfg.scope


def test_registry_daily_types_supported_operations():
    """P0: Valida que tipos Daily e Session suportam list e reconcile, rejeitando dailyRollUp."""
    daily_types = [
        "daily-resting-heart-rate",
        "daily-heart-rate-variability",
        "daily-heart-rate-zones",
        "daily-oxygen-saturation",
        "daily-respiratory-rate",
        "daily-sleep-temperature-derivations",
        "daily-vo2-max",
    ]
    for dt in daily_types:
        cfg = GoogleHealthDataTypeRegistry.get(dt)
        assert cfg is not None, f"Tipo {dt} ausente no registry"
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "list") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "reconcile") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "dailyRollUp") is False
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "rollUp") is False

    session_types = ["sleep", "exercise", "respiratory-rate-sleep-summary"]
    for dt in session_types:
        cfg = GoogleHealthDataTypeRegistry.get(dt)
        assert cfg is not None
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "list") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "reconcile") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "dailyRollUp") is False

    interval_types = [
        "steps",
        "heart-rate",
        "active-energy-burned",
        "distance",
        "total-calories",
        "active-minutes",
    ]
    for dt in interval_types:
        cfg = GoogleHealthDataTypeRegistry.get(dt)
        assert cfg is not None
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "list") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "reconcile") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "rollUp") is True
        assert GoogleHealthDataTypeRegistry.supports_operation(dt, "dailyRollUp") is True


# ── P1.3: Webhook batches e resiliência ──────────────────────────────────────

def test_normalize_webhook_payloads():
    # Payload único
    single = {"data": {"healthUserId": "user1", "dataType": "steps"}}
    norm_single = normalize_webhook_payloads(single)
    assert len(norm_single) == 1

    # Lote de eventos
    batch = [
        {"data": {"healthUserId": "user1", "dataType": "steps"}},
        {"data": {"healthUserId": "user1", "dataType": "heart-rate"}},
    ]
    norm_batch = normalize_webhook_payloads(batch)
    assert len(norm_batch) == 2

    # Lote envelopado em dict
    wrapped = {
        "events": [
            {"data": {"healthUserId": "user1", "dataType": "sleep"}},
            {"data": {"healthUserId": "user1", "dataType": "weight"}},
        ]
    }
    norm_wrapped = normalize_webhook_payloads(wrapped)
    assert len(norm_wrapped) == 2


def test_webhook_batch_endpoint_execution(client: TestClient, tmp_path: Path):
    token_path = tmp_path / "token.json"
    creds = GoogleHealthCredentials(
        client_id="cid",
        client_secret="sec",
        access_token="token",
        health_user_id="user-batch-123",
    )
    creds.save_to_file(token_path)

    batch_payload = [
        {
            "type": "notification",
            "data": {
                "healthUserId": "user-batch-123",
                "operation": "UPSERT",
                "dataType": "steps",
                "intervals": [{"startTime": "2026-03-01T00:00:00Z", "endTime": "2026-03-01T23:59:59Z"}],
            },
        },
        {
            "type": "notification",
            "data": {
                "healthUserId": "user-batch-123",
                "operation": "UPSERT",
                "dataType": "daily-resting-heart-rate",
                "intervals": [{"startTime": "2026-03-01T00:00:00Z", "endTime": "2026-03-01T23:59:59Z"}],
            },
        },
    ]

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_path):
        resp = client.post("/api/google-health/webhook", json=batch_payload)
        assert resp.status_code == 204


def test_webhook_lifecycle_revoked_access(client: TestClient, tmp_path: Path):
    token_path = tmp_path / "token.json"
    creds = GoogleHealthCredentials(
        client_id="cid",
        client_secret="sec",
        access_token="token",
        health_user_id="user-revoked-123",
        reauthentication_required=False,
    )
    creds.save_to_file(token_path)

    payload = [
        {
            "type": "notification",
            "data": {
                "healthUserId": "user-revoked-123",
                "operation": "user-revoked-access",
            },
        }
    ]

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_path):
        resp = client.post("/api/google-health/webhook", json=payload)
        assert resp.status_code == 204

        # Verifica se o arquivo local teve o flag reauthentication_required ativado
        updated = GoogleHealthCredentials.from_file(token_path)
        assert updated.reauthentication_required is True


# ── P1.4: Mapeamento de healthUserId no Webhook ──────────────────────────────

def test_webhook_mismatched_health_user_id(client: TestClient, tmp_path: Path):
    token_path = tmp_path / "token.json"
    creds = GoogleHealthCredentials(
        client_id="cid",
        client_secret="sec",
        access_token="token",
        health_user_id="local-user-555",
    )
    creds.save_to_file(token_path)

    # Webhook enviando healthUserId que não pertence ao usuário local
    payload = {
        "data": {
            "healthUserId": "unknown-foreign-user-999",
            "operation": "UPSERT",
            "dataType": "steps",
        }
    }

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_path):
        with patch("backend.app.routers.google_health.sync_google_health_api") as mock_sync:
            resp = client.post("/api/google-health/webhook", json=payload)
            assert resp.status_code == 204
            # Não deve sincronizar dados para usuário com ID divergente
            mock_sync.assert_not_called()


# ── P1.5: Subscriber & Subscription Lifecycle ───────────────────────────────

def test_subscriber_lifecycle_methods(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="valid_token", client_id="myproj-123.apps.googleusercontent.com")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    mock_resp = {"subscriber": {"endpointUri": "https://example.com/webhook"}}

    with patch.object(client, "_post_json", return_value=(mock_resp, None)) as mock_post:
        data, err = client.create_subscriber(
            endpoint_uri="https://example.com/webhook",
            subscriber_id="sub-1",
            project_id="myproj-123",
        )
        assert err is None
        mock_post.assert_called_once()
        url_called = mock_post.call_args[0][0]
        assert "projects/myproj-123/subscribers" in url_called
        assert "subscriberId=sub-1" in url_called

    with patch.object(client, "_get_json", return_value=({"subscribers": [{"name": "sub-1"}]}, None)) as mock_get:
        subs, err = client.list_subscribers(project_id="myproj-123")
        assert err is None
        assert len(subs) == 1

    with patch.object(client, "_delete", return_value=(True, None)) as mock_del:
        ok, err = client.delete_subscriber(subscriber_id="sub-1", project_id="myproj-123")
        assert ok is True
        assert err is None


# ── P1.6: Sem OOB redirect URI no script CLI ────────────────────────────────

def test_auth_script_no_oob():
    script_path = Path("integrations/google/scripts/auth_google_health.py")
    content = script_path.read_text(encoding="utf-8")
    assert "urn:ietf:wg:oauth:2.0:oob" not in content
    assert "DEFAULT_REDIRECT_URI" in content
    assert "127.0.0.1" in content or "localhost" in content


# ── P1.7: Erro 403 MISSING_OAUTH_SCOPE sem retry cego ───────────────────────

def test_missing_oauth_scope_aborts_retry(tmp_path: Path):
    creds = GoogleHealthCredentials(access_token="limited_token")
    client = GoogleHealthClient(credentials=creds, token_path=tmp_path / "token.json")

    error_body = json.dumps({
        "error": {
            "code": 403,
            "message": "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
            "status": "PERMISSION_DENIED",
            "details": [{"reason": "MISSING_OAUTH_SCOPE"}],
        }
    }).encode("utf-8")

    http_err = HTTPError("url", 403, "Forbidden", hdrs={}, fp=MagicMock(read=lambda *args, **kwargs: error_body))

    with patch("longevidade.integrations.google_health.client._get_urlopen") as mock_get_urlopen:
        mock_get_urlopen.return_value.side_effect = http_err
        # fetch_data_points chama _get_json
        pts, err = client.fetch_data_points("daily-respiratory-rate")

        assert pts == []
        assert "MISSING_OAUTH_SCOPE" in str(err)
        # Não deve executar 4 tentativas (3 retries). Deve parar imediatamente no 403!
        assert mock_get_urlopen.return_value.call_count == 1
