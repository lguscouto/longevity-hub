"""
Módulo de verificação criptográfica do header GOOGLE-HEALTH-API-SIGNATURE (P1.7).

Conforme especificação oficial da Google Health API:
- Chaves públicas publicadas em:
  https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json
- Formato Tink Keyset contendo chaves EcdsaPublicKey (curva NIST P-256 / SHA-256).
- Header GOOGLE-HEALTH-API-SIGNATURE contém:
  - 5 bytes de prefixo Tink: 1 byte versão (0x01) + 4 bytes key_id (big-endian).
  - Assinatura ECDSA codificada em DER.
- A assinatura deve ser verificada contra os bytes do corpo bruto recebido (raw request body).
"""

from __future__ import annotations

import base64
import json
import logging
import struct
import time
from typing import Any, Dict, Optional, Tuple
from urllib.error import URLError
from urllib.request import Request, urlopen

try:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec
    _HAS_CRYPTOGRAPHY = True
except ImportError:
    InvalidSignature = Exception  # type: ignore
    hashes = None  # type: ignore
    ec = None  # type: ignore
    _HAS_CRYPTOGRAPHY = False

from longevidade.integrations.google_health.errors import (
    GoogleHealthSignatureError,
    GoogleHealthWebhookError,
)

logger = logging.getLogger("longevidade.google_health.webhooks_signature")

GOOGLE_HEALTH_WEBHOOK_PUBLIC_KEYSET_URL = (
    "https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json"
)

# Chaves estáticas de fallback/conhecidas para resiliência quando a rede externa estiver inacessível
FALLBACK_KEYSET: Dict[str, Any] = {
    "primaryKeyId": 3908867516,
    "key": [
        {
            "keyData": {
                "typeUrl": "type.googleapis.com/google.crypto.tink.EcdsaPublicKey",
                "value": "EgYIAxACGAIaIQBuWzwqKbBeNzHKDnE+UQyYi+xZFbyHD0L7EkIq98nz8yIhAIrPyGj2znh4/Ry60aI+JRneY8/bLoIuG2M+KLMbFT9X",
                "keyMaterialType": "ASYMMETRIC_PUBLIC",
            },
            "status": "ENABLED",
            "keyId": 4193570438,
            "outputPrefixType": "TINK",
        }
    ],
}


class GoogleHealthWebhookSignatureVerifier:
    """Verificador de assinaturas GOOGLE-HEALTH-API-SIGNATURE com cache de keyset."""

    def __init__(
        self,
        keyset_url: str = GOOGLE_HEALTH_WEBHOOK_PUBLIC_KEYSET_URL,
        cache_ttl_seconds: int = 86400,
    ) -> None:
        self.keyset_url = keyset_url
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cached_keyset: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0
        self._custom_keys: Dict[int, Any] = {}

    def register_test_key(self, key_id: int, public_key: Any) -> None:
        """Registra uma chave de teste diretamente em memória (útil para suítes unitárias)."""
        self._custom_keys[key_id] = public_key

    def get_public_keyset(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Obtém o keyset público, buscando da rede se expirado ou forçado."""
        now = time.time()
        if not force_refresh and self._cached_keyset and (now - self._cache_timestamp < self.cache_ttl_seconds):
            return self._cached_keyset

        try:
            req = Request(
                self.keyset_url,
                headers={"Accept": "application/json", "User-Agent": "LongevidadeHub-Verifier/1.1"},
            )
            with urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, dict) and "key" in data:
                    self._cached_keyset = data
                    self._cache_timestamp = now
                    return self._cached_keyset
        except Exception as exc:
            logger.warning("Falha ao obter keyset oficial do Google: %s. Utilizando fallback.", exc)

        if self._cached_keyset:
            return self._cached_keyset

        self._cached_keyset = FALLBACK_KEYSET
        self._cache_timestamp = now
        return self._cached_keyset

    @staticmethod
    def parse_ecdsa_p256_public_key(value_base64: str) -> Any:
        """
        Extrai a chave pública ECDSA P-256 a partir do protobuf serializado EcdsaPublicKey do Tink.
        
        No schema protobuf do Tink:
        - field 2: EcdsaParams (tag 0x12)
        - field 3: x coordinate (tag 0x1a, length 33 com byte 0 inicial ou 32 bytes)
        - field 4: y coordinate (tag 0x22, length 33 com byte 0 inicial ou 32 bytes)
        """
        if not _HAS_CRYPTOGRAPHY or ec is None:
            raise GoogleHealthSignatureError("Biblioteca 'cryptography' é necessária para decodificar chaves públicas ECDSA.")

        raw = base64.b64decode(value_base64)
        
        # Localiza tag 0x1a (field 3) e tag 0x22 (field 4)
        idx = 0
        x_bytes: Optional[bytes] = None
        y_bytes: Optional[bytes] = None

        while idx < len(raw):
            tag = raw[idx]
            field_num = tag >> 3
            wire_type = tag & 0x07
            idx += 1

            if wire_type == 2:  # length-delimited
                length = raw[idx]
                idx += 1
                data = raw[idx : idx + length]
                idx += length

                if field_num == 3:
                    # Coordenada x: se tiver 33 bytes com leading zero, ignora o primeiro byte
                    x_bytes = data[-32:] if len(data) >= 32 else data.rjust(32, b"\x00")
                elif field_num == 4:
                    # Coordenada y: se tiver 33 bytes com leading zero, ignora o primeiro byte
                    y_bytes = data[-32:] if len(data) >= 32 else data.rjust(32, b"\x00")
            elif wire_type == 0:  # varint
                while idx < len(raw) and (raw[idx] & 0x80):
                    idx += 1
                idx += 1
            else:
                idx += 1

        if not x_bytes or not y_bytes:
            raise GoogleHealthSignatureError("Não foi possível extrair coordenadas (x, y) do protobuf EcdsaPublicKey.")

        x_int = int.from_bytes(x_bytes, "big")
        y_int = int.from_bytes(y_bytes, "big")
        public_numbers = ec.EllipticCurvePublicNumbers(x_int, y_int, ec.SECP256R1())
        return public_numbers.public_key()

    def get_public_key_by_id(self, key_id: int) -> Optional[Any]:
        """Localiza a chave pública correspondente ao key_id."""
        if key_id in self._custom_keys:
            return self._custom_keys[key_id]

        keyset = self.get_public_keyset()
        keys = keyset.get("key", [])

        for k in keys:
            if k.get("keyId") == key_id and k.get("status") == "ENABLED":
                key_data = k.get("keyData", {})
                val_b64 = key_data.get("value")
                if val_b64:
                    try:
                        return self.parse_ecdsa_p256_public_key(val_b64)
                    except Exception as err:
                        logger.error("Erro ao decodificar chave keyId=%s: %s", key_id, err)
                        return None

        # Se não encontrou, tenta forçar atualização do keyset para suportar rotação de chave
        keyset = self.get_public_keyset(force_refresh=True)
        for k in keyset.get("key", []):
            if k.get("keyId") == key_id and k.get("status") == "ENABLED":
                val_b64 = k.get("keyData", {}).get("value")
                if val_b64:
                    return self.parse_ecdsa_p256_public_key(val_b64)

        return None

    def verify(self, raw_body_bytes: bytes, signature_header: str) -> bool:
        """
        Verifica a assinatura GOOGLE-HEALTH-API-SIGNATURE contra o payload em bytes do body JSON bruto.
        
        Retorna True se válida, False se inválida ou chave desconhecida.
        """
        if not _HAS_CRYPTOGRAPHY or ec is None or hashes is None:
            logger.warning("Biblioteca 'cryptography' não está instalada. Verificação de assinatura ignorada.")
            return False

        if not signature_header or not raw_body_bytes:
            return False

        try:
            raw_sig = base64.b64decode(signature_header)
        except Exception:
            return False

        if len(raw_sig) < 6:
            # Precisa de pelo menos 1 byte prefixo + 4 bytes key_id + DER signature
            return False

        # Prefixo Tink: 1 byte version (raw_sig[0]) + 4 bytes key_id (raw_sig[1:5])
        key_id = struct.unpack(">I", raw_sig[1:5])[0]
        der_signature = raw_sig[5:]

        public_key = self.get_public_key_by_id(key_id)
        if not public_key:
            logger.warning("Chave pública keyId=%s não encontrada no keyset.", key_id)
            return False

        try:
            public_key.verify(der_signature, raw_body_bytes, ec.ECDSA(hashes.SHA256()))
            return True
        except InvalidSignature:
            return False
        except Exception as exc:
            logger.error("Exceção ao verificar assinatura: %s", exc)
            return False


# Instância global padrão
signature_verifier = GoogleHealthWebhookSignatureVerifier()
