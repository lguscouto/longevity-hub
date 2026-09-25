"""
Pacote oficial de integração com a Google Health API v4 do Longevidade Hub.
Fornece cliente HTTP REST v4, gerenciador de autenticação, registry de tipos de dados e subsistema de webhooks.
"""

from longevidade.integrations.google_health.auth import (
    DEFAULT_REDIRECT_URI,
    OAuthStateManager,
    oauth_state_manager,
    safe_json_for_script,
)
from longevidade.integrations.google_health.client import (
    GOOGLE_HEALTH_BASE_URL,
    GOOGLE_HEALTH_SCOPES,
    GOOGLE_OAUTH_TOKEN_URL,
    GoogleHealthClient,
    GoogleHealthCredentials,
    build_server_filter,
    format_rfc3339_utc,
    get_default_token_path,
    is_point_in_interval,
    parse_point_timestamp_utc,
)
from longevidade.integrations.google_health.errors import (
    GoogleHealthAccessRevokedError,
    GoogleHealthAuthError,
    GoogleHealthError,
    GoogleHealthMissingScopeError,
    GoogleHealthRateLimitError,
    GoogleHealthSignatureError,
    GoogleHealthTokenInvalidError,
    GoogleHealthTransientError,
    GoogleHealthUnsupportedDataTypeError,
    GoogleHealthValidationError,
    GoogleHealthWebhookError,
)
from longevidade.integrations.google_health.registry import (
    DATA_TYPES,
    DataTypeConfig,
    GoogleHealthDataTypeRegistry,
    SCOPE_ACTIVITY,
    SCOPE_CATEGORY_MAP,
    SCOPE_ECG,
    SCOPE_HEALTH_METRICS,
    SCOPE_IRN,
    SCOPE_NUTRITION,
    SCOPE_SLEEP,
)
from longevidade.integrations.google_health.webhooks import (
    GoogleHealthWebhookPayload,
    WebhookInterval,
    WebhookNotificationData,
    extract_notification_events,
    normalize_webhook_payloads,
    parse_webhook_payload,
)
from longevidade.integrations.google_health.webhooks_signature import (
    GoogleHealthWebhookSignatureVerifier,
    signature_verifier,
)

__all__ = [
    "GoogleHealthClient",
    "GoogleHealthCredentials",
    "GoogleHealthDataTypeRegistry",
    "DataTypeConfig",
    "DATA_TYPES",
    "GoogleHealthWebhookSignatureVerifier",
    "signature_verifier",
    "GoogleHealthWebhookPayload",
    "WebhookNotificationData",
    "WebhookInterval",
    "parse_webhook_payload",
    "normalize_webhook_payloads",
    "extract_notification_events",

    "OAuthStateManager",
    "oauth_state_manager",
    "safe_json_for_script",
    "DEFAULT_REDIRECT_URI",
    "build_server_filter",
    "format_rfc3339_utc",
    "get_default_token_path",
    "is_point_in_interval",
    "parse_point_timestamp_utc",
    "GoogleHealthError",
    "GoogleHealthAuthError",
    "GoogleHealthMissingScopeError",
    "GoogleHealthTokenInvalidError",
    "GoogleHealthAccessRevokedError",
    "GoogleHealthRateLimitError",
    "GoogleHealthTransientError",
    "GoogleHealthUnsupportedDataTypeError",
    "GoogleHealthValidationError",
    "GoogleHealthWebhookError",
    "GoogleHealthSignatureError",
    "GOOGLE_HEALTH_BASE_URL",
    "GOOGLE_HEALTH_SCOPES",
    "GOOGLE_OAUTH_TOKEN_URL",
    "SCOPE_ACTIVITY",
    "SCOPE_HEALTH_METRICS",
    "SCOPE_SLEEP",
    "SCOPE_NUTRITION",
    "SCOPE_ECG",
    "SCOPE_IRN",
    "SCOPE_CATEGORY_MAP",
]

