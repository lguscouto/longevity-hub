"""
Armazenamento de segredos de IA fora do SQLite.

A implementação de produção usa `keyring`, que no Windows grava no
Credential Manager. Os testes devem injetar `MemorySecretsStore` para não
tocar o cofre real do sistema operacional.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional, Protocol


AI_SECRET_PROVIDERS = ("openai", "anthropic", "openrouter")
PROVIDER_SECRET_FIELDS = {
    "openai": "openai_api_key",
    "anthropic": "anthropic_api_key",
    "openrouter": "openrouter_api_key",
}
PROVIDER_HAS_FIELDS = {
    "openai": "has_openai_key",
    "anthropic": "has_anthropic_key",
    "openrouter": "has_openrouter_key",
}
DEFAULT_KEYRING_SERVICE = "longevidade.ai"


class AISecretsStore(Protocol):
    """Contrato mínimo para cofre de chaves de provedores de IA."""

    def get(self, provider: str) -> Optional[str]:
        ...

    def set(self, provider: str, secret: str) -> None:
        ...

    def delete(self, provider: str) -> None:
        ...

    def has(self, provider: str) -> bool:
        ...


def _provider_account(provider: str) -> str:
    if provider not in AI_SECRET_PROVIDERS:
        raise ValueError(f"Provedor de IA não suportado: {provider}")
    return provider


def is_masked_or_blank_secret(value: object) -> bool:
    """Retorna True quando a UI enviou campo vazio ou placeholder mascarado."""
    if value is None:
        return True
    if not isinstance(value, str):
        return True
    stripped = value.strip()
    return not stripped or "*" in stripped


def is_plain_secret_value(value: object) -> bool:
    """Retorna True somente para chave nova/digitada, nunca para máscara da UI."""
    return isinstance(value, str) and bool(value.strip()) and "*" not in value


def mask_secret(secret: Optional[str]) -> Optional[str]:
    if not secret:
        return None
    if len(secret) < 8:
        return "*" * len(secret)
    return secret[:4] + "*" * (len(secret) - 8) + secret[-4:]


@dataclass
class KeyringSecretsStore:
    """Cofre baseado em keyring/Windows Credential Manager."""

    service_name: str = DEFAULT_KEYRING_SERVICE

    def _keyring_module(self):
        try:
            import keyring  # type: ignore
        except ImportError as exc:  # pragma: no cover - depende do ambiente local
            raise RuntimeError(
                "Dependência 'keyring' não instalada. Rode `pip install -e .` ou "
                "instale backend/requirements.txt para ativar o cofre de chaves."
            ) from exc
        return keyring

    def get(self, provider: str) -> Optional[str]:
        account = _provider_account(provider)
        return self._keyring_module().get_password(self.service_name, account)

    def set(self, provider: str, secret: str) -> None:
        account = _provider_account(provider)
        if not secret or not secret.strip():
            raise ValueError("Chave de API vazia não pode ser gravada no cofre.")
        self._keyring_module().set_password(self.service_name, account, secret.strip())

    def delete(self, provider: str) -> None:
        account = _provider_account(provider)
        keyring = self._keyring_module()
        try:
            keyring.delete_password(self.service_name, account)
        except Exception:
            # Idempotente: deletar segredo inexistente não deve quebrar fluxo futuro.
            pass

    def has(self, provider: str) -> bool:
        return self.get(provider) is not None


@dataclass
class MemorySecretsStore:
    """Fake store determinístico para testes; nunca toca o cofre real."""

    values: Dict[str, str] = field(default_factory=dict)

    def get(self, provider: str) -> Optional[str]:
        _provider_account(provider)
        return self.values.get(provider)

    def set(self, provider: str, secret: str) -> None:
        _provider_account(provider)
        if not secret or not secret.strip():
            raise ValueError("Chave de API vazia não pode ser gravada no fake store.")
        self.values[provider] = secret.strip()

    def delete(self, provider: str) -> None:
        _provider_account(provider)
        self.values.pop(provider, None)

    def has(self, provider: str) -> bool:
        return self.get(provider) is not None
