"""
Módulo de compatibilidade para GoogleHealthClient.
Re-exporta a implementação modular isolada de longevidade.integrations.google_health.client (P1.6).
"""

from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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
    _build_raw_point,
    _extract_date_ref_from_point,
)
from longevidade.integrations.google_health.registry import (
    GoogleHealthDataTypeRegistry,
    SCOPE_ACTIVITY,
    SCOPE_CATEGORY_MAP,
    SCOPE_HEALTH_METRICS,
    SCOPE_NUTRITION,
    SCOPE_SLEEP,
)

__all__ = [
    "GoogleHealthClient",
    "GoogleHealthCredentials",
    "GoogleHealthDataTypeRegistry",
    "build_server_filter",
    "format_rfc3339_utc",
    "get_default_token_path",
    "is_point_in_interval",
    "parse_point_timestamp_utc",
    "_build_raw_point",
    "_extract_date_ref_from_point",
    "GOOGLE_HEALTH_BASE_URL",
    "GOOGLE_HEALTH_SCOPES",
    "GOOGLE_OAUTH_TOKEN_URL",
    "SCOPE_ACTIVITY",
    "SCOPE_HEALTH_METRICS",
    "SCOPE_SLEEP",
    "SCOPE_NUTRITION",
    "SCOPE_CATEGORY_MAP",
]
