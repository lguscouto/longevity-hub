"""Exceções específicas para a integração Google Health API v4."""

from __future__ import annotations


class GoogleHealthError(Exception):
    """Exceção base para erros na integração com Google Health."""
    pass


class GoogleHealthAuthError(GoogleHealthError):
    """Erro de autenticação ou escopos na Google Health API."""
    pass


class GoogleHealthValidationError(GoogleHealthError):
    """Erro de validação temporal, de parâmetros ou payload."""
    pass


class GoogleHealthWebhookError(GoogleHealthError):
    """Erro de validação ou processamento de webhook."""
    pass


class GoogleHealthSignatureError(GoogleHealthWebhookError):
    """Erro de verificação da assinatura GOOGLE-HEALTH-API-SIGNATURE."""
    pass
