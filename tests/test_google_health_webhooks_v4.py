"""
Suíte de testes para webhooks oficiais da Google Health API (P1.7 Codex).

Cobre:
- test_webhook_authorization_valid
- test_webhook_authorization_missing
- test_webhook_authorization_invalid
- test_webhook_verification_authorized
- test_webhook_verification_unauthorized
- test_webhook_signature_valid
- test_webhook_signature_invalid
- test_webhook_signature_missing
- test_webhook_signature_unknown_key_id
- test_webhook_raw_payload_verification
- test_webhook_acknowledges_immediately
- test_webhook_dispatches_background_sync
- test_webhook_upsert_notification
- test_webhook_idempotency

Regra AGENTS.md:
- Injetar fixture `client: TestClient` nas funções que realizam chamadas HTTP.
- Proibido instanciar TestClient(app) no nível de módulo.
"""

import base64
import json
import os
import struct
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

from longevidade.integrations.google_health.webhooks_signature import signature_verifier
from longevidade.integrations.google_health.client import GoogleHealthCredentials


@pytest.fixture
def ec_keypair():
    """Gera par de chaves ECDSA P-256 e registra a chave pública no signature_verifier com key_id=987654."""
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key()
    key_id = 987654
    signature_verifier.register_test_key(key_id, pub)
    return priv, pub, key_id


def make_tink_signature(payload_bytes: bytes, priv_key, key_id: int) -> str:
    """Cria o header GOOGLE-HEALTH-API-SIGNATURE em formato Tink válido."""
    der_sig = priv_key.sign(payload_bytes, ec.ECDSA(hashes.SHA256()))
    tink_blob = b"\x01" + struct.pack(">I", key_id) + der_sig
    return base64.b64encode(tink_blob).decode("utf-8")


# ── Autorização e Handshake ───────────────────────────────────────────

def test_webhook_authorization_valid(client: TestClient, monkeypatch):
    """Valida requisição com Authorization correto quando segredo está configurado."""
    monkeypatch.setenv("GOOGLE_HEALTH_WEBHOOK_SECRET", "super-secret-token")
    resp = client.post(
        "/api/google-health/webhook",
        headers={"Authorization": "Bearer super-secret-token"},
        json={"type": "notification", "data": {"dataType": "steps"}},
    )
    assert resp.status_code == 204


def test_webhook_authorization_missing(client: TestClient, monkeypatch):
    """Rejeita requisição quando Authorization estiver ausente e segredo estiver configurado."""
    monkeypatch.setenv("GOOGLE_HEALTH_WEBHOOK_SECRET", "super-secret-token")
    resp = client.post(
        "/api/google-health/webhook",
        json={"type": "notification", "data": {"dataType": "steps"}},
    )
    assert resp.status_code == 401
    assert "Authorization ausente" in resp.json()["detail"]


def test_webhook_authorization_invalid(client: TestClient, monkeypatch):
    """Rejeita requisição com token de Authorization incorreto."""
    monkeypatch.setenv("GOOGLE_HEALTH_WEBHOOK_SECRET", "super-secret-token")
    resp = client.post(
        "/api/google-health/webhook",
        headers={"Authorization": "Bearer wrong-secret"},
        json={"type": "notification", "data": {"dataType": "steps"}},
    )
    assert resp.status_code == 401
    assert "inválidas" in resp.json()["detail"]


def test_webhook_verification_authorized(client: TestClient, monkeypatch):
    """Handshake de verificação com credenciais válidas responde 200."""
    monkeypatch.setenv("GOOGLE_HEALTH_WEBHOOK_SECRET", "handshake-secret")
    resp = client.post(
        "/api/google-health/webhook",
        headers={"Authorization": "Bearer handshake-secret"},
        json={"type": "verification"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "verified"}


def test_webhook_verification_unauthorized(client: TestClient, monkeypatch):
    """Handshake de verificação sem credenciais responde 401 conforme especificação da Google."""
    monkeypatch.delenv("GOOGLE_HEALTH_WEBHOOK_SECRET", raising=False)
    resp = client.post(
        "/api/google-health/webhook",
        json={"type": "verification"},
    )
    assert resp.status_code == 401


# ── Assinatura Criptográfica GOOGLE-HEALTH-API-SIGNATURE ──────────────

def test_webhook_signature_valid(client: TestClient, ec_keypair):
    """Valida aceitação quando GOOGLE-HEALTH-API-SIGNATURE for autêntica (ECDSA P-256)."""
    priv, _, key_id = ec_keypair
    payload_dict = {"type": "notification", "data": {"dataType": "steps"}}
    payload_bytes = json.dumps(payload_dict).encode("utf-8")

    sig_header = make_tink_signature(payload_bytes, priv, key_id)

    resp = client.post(
        "/api/google-health/webhook",
        content=payload_bytes,
        headers={
            "Content-Type": "application/json",
            "GOOGLE-HEALTH-API-SIGNATURE": sig_header,
        },
    )
    assert resp.status_code == 204


def test_webhook_signature_invalid(client: TestClient, ec_keypair):
    """Rejeita quando a assinatura não conferir com o payload bruto recebido."""
    priv, _, key_id = ec_keypair
    original_bytes = b'{"type": "notification", "data": {"dataType": "steps"}}'
    tampered_bytes = b'{"type": "notification", "data": {"dataType": "heart-rate"}}'

    sig_header = make_tink_signature(original_bytes, priv, key_id)

    resp = client.post(
        "/api/google-health/webhook",
        content=tampered_bytes,
        headers={
            "Content-Type": "application/json",
            "GOOGLE-HEALTH-API-SIGNATURE": sig_header,
        },
    )
    assert resp.status_code == 401
    assert "Assinatura GOOGLE-HEALTH-API-SIGNATURE inválida" in resp.json()["detail"]


def test_webhook_signature_missing(client: TestClient, monkeypatch):
    """Rejeita se assinatura for estritamente exigida por configuração e o header estiver ausente."""
    monkeypatch.setenv("GOOGLE_HEALTH_REQUIRE_SIGNATURE", "true")
    resp = client.post(
        "/api/google-health/webhook",
        json={"type": "notification", "data": {"dataType": "steps"}},
    )
    assert resp.status_code == 401
    assert "Header GOOGLE-HEALTH-API-SIGNATURE obrigatório" in resp.json()["detail"]


def test_webhook_signature_unknown_key_id(client: TestClient, ec_keypair):
    """Rejeita se key_id extraído do prefixo Tink não existir no keyset."""
    priv, _, _ = ec_keypair
    unknown_key_id = 111222333  # chave inexistente
    payload_bytes = b'{"type": "notification"}'
    sig_header = make_tink_signature(payload_bytes, priv, unknown_key_id)

    resp = client.post(
        "/api/google-health/webhook",
        content=payload_bytes,
        headers={
            "Content-Type": "application/json",
            "GOOGLE-HEALTH-API-SIGNATURE": sig_header,
        },
    )
    assert resp.status_code == 401


def test_webhook_raw_payload_verification(client: TestClient, ec_keypair):
    """Garante que a assinatura é verificada contra os bytes exatos e brutos do corpo HTTP."""
    priv, _, key_id = ec_keypair
    # Payload com espaços intencionais para testar validação de bytes brutos sem re-serialização
    raw_spaced_payload = b'{\n  "type":   "notification",\n  "data": {"dataType": "sleep"}\n}'
    sig_header = make_tink_signature(raw_spaced_payload, priv, key_id)

    resp = client.post(
        "/api/google-health/webhook",
        content=raw_spaced_payload,
        headers={
            "Content-Type": "application/json",
            "GOOGLE-HEALTH-API-SIGNATURE": sig_header,
        },
    )
    assert resp.status_code == 204


# ── Processamento Assíncrono e Resposta Imediata ──────────────────────

def test_webhook_acknowledges_immediately(client: TestClient):
    """Valida resposta imediata 204 No Content sem bloquear aguardando rede."""
    resp = client.post(
        "/api/google-health/webhook",
        json={"type": "notification", "data": {"dataType": "sleep"}},
    )
    assert resp.status_code == 204
    assert resp.content == b""


def test_webhook_dispatches_background_sync(client: TestClient, tmp_path: Path):
    """Valida que o webhook enfileira a sincronização correta com background_tasks."""
    token_file = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="valid_access_token")
    creds.save_to_file(token_file)

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        with patch("backend.app.routers.google_health.sync_google_health_api") as mock_sync:
            resp = client.post(
                "/api/google-health/webhook",
                json={
                    "type": "notification",
                    "data": {
                        "dataType": "steps",
                        "intervals": [{"startTime": "2026-09-20T10:00:00Z"}],
                    },
                },
            )
            assert resp.status_code == 204
            mock_sync.assert_called_once()
            call_kwargs = mock_sync.call_args[1]
            assert call_kwargs["selected_types"] == ["steps"]


def test_webhook_upsert_notification(client: TestClient, tmp_path: Path):
    """Processa notificação de operação UPSERT mapeando dados vitais."""
    token_file = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="valid_access_token")
    creds.save_to_file(token_file)

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        with patch("backend.app.routers.google_health.sync_google_health_api") as mock_sync:
            resp = client.post(
                "/api/google-health/webhook",
                json={
                    "type": "notification",
                    "data": {
                        "healthUserId": "user_12345",
                        "operation": "UPSERT",
                        "dataType": "heart-rate",
                    },
                },
            )
            assert resp.status_code == 204
            mock_sync.assert_called_once()
            call_kwargs = mock_sync.call_args[1]
            assert "heart-rate" in call_kwargs["selected_types"]


def test_webhook_idempotency(client: TestClient, tmp_path: Path):
    """Duas notificações consecutivas idênticas são tratadas sem efeitos colaterais duplicados."""
    token_file = tmp_path / "token.json"
    creds = GoogleHealthCredentials(access_token="valid_access_token")
    creds.save_to_file(token_file)

    payload = {
        "type": "notification",
        "data": {
            "healthUserId": "user_12345",
            "operation": "UPSERT",
            "dataType": "steps",
        },
    }

    with patch("backend.app.routers.google_health.get_default_token_path", return_value=token_file):
        with patch("backend.app.routers.google_health.sync_google_health_api") as mock_sync:
            resp1 = client.post("/api/google-health/webhook", json=payload)
            resp2 = client.post("/api/google-health/webhook", json=payload)
            assert resp1.status_code == 204
            assert resp2.status_code == 204
            assert mock_sync.call_count == 2
