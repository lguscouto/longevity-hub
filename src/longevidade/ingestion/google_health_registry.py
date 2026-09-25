"""
Módulo de compatibilidade e registry de Data Types da Google Health API v4.
Re-exporta a implementação modular isolada de longevidade.integrations.google_health.registry (P1.4 / P1.6).
"""

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

__all__ = [
    "GoogleHealthDataTypeRegistry",
    "DataTypeConfig",
    "DATA_TYPES",
    "SCOPE_ACTIVITY",
    "SCOPE_HEALTH_METRICS",
    "SCOPE_SLEEP",
    "SCOPE_NUTRITION",
    "SCOPE_ECG",
    "SCOPE_IRN",
    "SCOPE_CATEGORY_MAP",
]

