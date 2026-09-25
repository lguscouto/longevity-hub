"""Exceções específicas para a integração Google Health API v4."""

from __future__ import annotations


class GoogleHealthError(Exception):
    """Exceção base para erros na integração com Google Health."""
    pass


class GoogleHealthAuthError(GoogleHealthError):
    """Erro de autenticação ou escopos na Google Health API."""
    pass


class GoogleHealthMissingScopeError(GoogleHealthAuthError):
    """Erro específico lançado quando a requisição falha por escopo OAuth ausente (MISSING_OAUTH_SCOPE)."""

    def __init__(
        self,
        message: str,
        required_scope: str | None = None,
        data_type: str | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message)
        self.required_scope = required_scope
        self.data_type = data_type
        self.details = details or {}


class GoogleHealthTokenInvalidError(GoogleHealthAuthError):
    """Erro quando o token de acesso é inválido ou expirou sem possibilidade de refresh."""
    pass


class GoogleHealthAccessRevokedError(GoogleHealthAuthError):
    """Erro quando o usuário revogou o acesso do aplicativo (invalid_grant/user-revoked-access)."""
    pass


class GoogleHealthRateLimitError(GoogleHealthError):
    """Erro de rate limit (HTTP 429 Too Many Requests)."""

    def __init__(self, message: str, retry_after_seconds: float | None = None) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class GoogleHealthTransientError(GoogleHealthError):
    """Erro transitório de servidor (HTTP 500, 502, 503, 504)."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class GoogleHealthValidationError(GoogleHealthError):
    """Erro de validação temporal, de parâmetros ou payload."""
    pass


class GoogleHealthUnsupportedDataTypeError(GoogleHealthValidationError):
    """Erro quando o data type não é suportado pela Google Health API."""
    pass


class GoogleHealthWebhookError(GoogleHealthError):
    """Erro de validação ou processamento de webhook."""
    pass


class GoogleHealthSignatureError(GoogleHealthWebhookError):
    """Erro de verificação da assinatura GOOGLE-HEALTH-API-SIGNATURE."""
    pass

