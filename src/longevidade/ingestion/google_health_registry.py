"""
Registry centralizado de Data Types para a Google Health API v4 e Health Connect.
Conforme especificação Longevidade Hub Codex (Seção 11, 12, 13, 14):
- Centraliza nome do data type, filter_name, escopo obrigatório, operações suportadas e disponibilidade.
- Identifica recursos ativos vs. recursos de roadmap (ex.: BMR e Skin Temperature).
- Diferencia suporte nativo Google Health API vs. Health Connect (ex.: Pressão Arterial).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set


SCOPE_ACTIVITY = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly"
SCOPE_HEALTH_METRICS = "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly"
SCOPE_SLEEP = "https://www.googleapis.com/auth/googlehealth.sleep.readonly"
SCOPE_NUTRITION = "https://www.googleapis.com/auth/googlehealth.nutrition.readonly"

SCOPE_CATEGORY_MAP: Dict[str, str] = {
    "activity": SCOPE_ACTIVITY,
    "activity_and_fitness": SCOPE_ACTIVITY,
    "health_metrics": SCOPE_HEALTH_METRICS,
    "health_metrics_and_measurements": SCOPE_HEALTH_METRICS,
    "sleep": SCOPE_SLEEP,
    "nutrition": SCOPE_NUTRITION,
}


@dataclass(frozen=True)
class DataTypeConfig:
    data_type: str
    filter_name: str
    scope: str
    operations: List[str]
    webhook_supported: bool
    is_active: bool
    is_roadmap: bool = False
    provider: str = "google_health"
    unit: Optional[str] = None
    metric_fields: List[str] = field(default_factory=list)
    description: str = ""
    official_name: Optional[str] = None
    endpoint_name: Optional[str] = None
    supported_operations: Optional[List[str]] = None
    normalizer: Optional[str] = None
    enabled: Optional[bool] = None
    status: str = "stable"

    def __post_init__(self):
        if self.official_name is None:
            object.__setattr__(self, "official_name", self.data_type)
        if self.endpoint_name is None:
            object.__setattr__(self, "endpoint_name", self.data_type)
        if self.supported_operations is None:
            object.__setattr__(self, "supported_operations", list(self.operations))
        if self.enabled is None:
            object.__setattr__(self, "enabled", self.is_active and not self.is_roadmap)
        if self.is_roadmap and self.status == "stable":
            object.__setattr__(self, "status", "roadmap")
        if self.provider == "health_connect" and self.status == "stable":
            object.__setattr__(self, "status", "health_connect_only")


# Registry com mapeamento completo de data types
DATA_TYPES: Dict[str, DataTypeConfig] = {
    "steps": DataTypeConfig(
        data_type="steps",
        filter_name="steps",
        scope=SCOPE_ACTIVITY,
        operations=["list", "reconcile", "rollup", "dailyRollup"],
        webhook_supported=True,
        is_active=True,
        unit="count",
        metric_fields=["steps"],
        description="Passos diários e intradiários.",
    ),
    "active-energy-burned": DataTypeConfig(
        data_type="active-energy-burned",
        filter_name="active_energy_burned",
        scope=SCOPE_ACTIVITY,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="kilocalories",
        metric_fields=["calories"],
        description="Calorias ativas gastas.",
    ),
    "distance": DataTypeConfig(
        data_type="distance",
        filter_name="distance",
        scope=SCOPE_ACTIVITY,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="meters",
        metric_fields=[],
        description="Distância percorrida.",
    ),
    "vo2-max": DataTypeConfig(
        data_type="vo2-max",
        filter_name="vo2_max",
        scope=SCOPE_ACTIVITY,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="ml/kg/min",
        metric_fields=["vo2_max"],
        description="Capacidade cardiorrespiratória máxima.",
    ),
    "heart-rate": DataTypeConfig(
        data_type="heart-rate",
        filter_name="heart_rate",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "reconcile", "rollup", "dailyRollup"],
        webhook_supported=True,
        is_active=True,
        unit="bpm",
        metric_fields=["avg_hr_bpm", "max_hr_bpm"],
        description="Frequência cardíaca contínua e intradiária.",
    ),
    "daily-resting-heart-rate": DataTypeConfig(
        data_type="daily-resting-heart-rate",
        filter_name="daily_resting_heart_rate",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="bpm",
        metric_fields=["rhr_bpm"],
        description="Frequência cardíaca de repouso diária oficial.",
    ),
    "heart-rate-variability": DataTypeConfig(
        data_type="heart-rate-variability",
        filter_name="heart_rate_variability",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="rmssd_ms",
        metric_fields=["hrv_ms"],
        description="Variabilidade da frequência cardíaca (RMSSD).",
    ),
    "sleep": DataTypeConfig(
        data_type="sleep",
        filter_name="sleep",
        scope=SCOPE_SLEEP,
        operations=["list", "dailyRollup"],
        webhook_supported=True,
        is_active=True,
        unit="minutes",
        metric_fields=["sleep_minutes", "sleep_deep_min", "sleep_light_min", "sleep_rem_min", "sleep_awake_min"],
        description="Sessões e estágios de sono (profundo, REM, leve, acordado).",
    ),
    "oxygen-saturation": DataTypeConfig(
        data_type="oxygen-saturation",
        filter_name="oxygen_saturation",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="percentage",
        metric_fields=["spo2_avg_pct", "spo2_min_pct"],
        description="Saturação de oxigênio periférico (SpO2).",
    ),
    "weight": DataTypeConfig(
        data_type="weight",
        filter_name="weight",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="grams_or_kg",
        metric_fields=["weight_kg", "bmi"],
        description="Peso corporal.",
    ),
    "body-fat": DataTypeConfig(
        data_type="body-fat",
        filter_name="body_fat",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="percentage",
        metric_fields=["body_fat_pct"],
        description="Percentual de gordura corporal.",
    ),
    "respiratory-rate": DataTypeConfig(
        data_type="respiratory-rate",
        filter_name="respiratory_rate",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=True,
        unit="rpm",
        metric_fields=["respiratory_rate_rpm"],
        description="Frequência respiratória diária e intradiária.",
    ),
    # Itens de Roadmap (Não habilitados para sincronização até estarem disponíveis e estáveis)
    "basal-metabolic-rate": DataTypeConfig(
        data_type="basal-metabolic-rate",
        filter_name="basal_metabolic_rate",
        scope=SCOPE_ACTIVITY,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=False,
        is_roadmap=True,
        unit="kcal/day",
        description="Taxa metabólica basal (Roadmap Google Health).",
    ),
    "skin-temperature": DataTypeConfig(
        data_type="skin-temperature",
        filter_name="skin_temperature",
        scope=SCOPE_HEALTH_METRICS,
        operations=["list", "dailyRollup"],
        webhook_supported=False,
        is_active=False,
        is_roadmap=True,
        unit="celsius",
        metric_fields=["skin_temp_c"],
        description="Temperatura da pele granular/variação (Roadmap Google Health).",
    ),
    # Suportado via Health Connect, não assumir suporte na Google Health API direta
    "blood-pressure": DataTypeConfig(
        data_type="blood-pressure",
        filter_name="blood_pressure",
        scope="android.permission.health.READ_BLOOD_PRESSURE",
        operations=["read"],
        webhook_supported=False,
        is_active=True,
        is_roadmap=False,
        provider="health_connect",
        unit="mmHg",
        metric_fields=["systolic_bp", "diastolic_bp"],
        description="Pressão Arterial suportada via Health Connect (BloodPressureRecord).",
    ),
}


class GoogleHealthDataTypeRegistry:
    """Interface de consulta e validação do registry de data types."""

    @staticmethod
    def get(data_type: str) -> Optional[DataTypeConfig]:
        return DATA_TYPES.get(data_type)

    @staticmethod
    def is_active(data_type: str) -> bool:
        cfg = DATA_TYPES.get(data_type)
        return bool(cfg and cfg.is_active and not cfg.is_roadmap and cfg.provider == "google_health")

    @staticmethod
    def get_active_google_health_types() -> List[str]:
        return [
            dt for dt, cfg in DATA_TYPES.items()
            if cfg.is_active and not cfg.is_roadmap and cfg.provider == "google_health"
        ]

    @staticmethod
    def is_scope_authorized_for_type(data_type: str, authorized_scopes: Set[str] | List[str]) -> bool:
        cfg = DATA_TYPES.get(data_type)
        if not cfg or not cfg.scope:
            return False
        auth_set = set(authorized_scopes)
        return cfg.scope in auth_set

    @staticmethod
    def filter_types_by_scopes(types: List[str] | Set[str], authorized_scopes: List[str] | Set[str]) -> List[str]:
        """Filtra uma lista de tipos retornando apenas aqueles para os quais o usuário concedeu escopo."""
        auth_set = set(authorized_scopes)
        result = []
        for t in types:
            cfg = DATA_TYPES.get(t)
            if cfg and cfg.scope in auth_set:
                result.append(t)
        return result

    @staticmethod
    def supports_operation(data_type: str, operation: str) -> bool:
        cfg = DATA_TYPES.get(data_type)
        if not cfg:
            return False
        return operation in cfg.operations or (cfg.supported_operations is not None and operation in cfg.supported_operations)

    @staticmethod
    def get_by_status(status: str) -> List[DataTypeConfig]:
        """Retorna todos os tipos de dados com o status especificado (stable, available, roadmap, health_connect_only)."""
        return [cfg for cfg in DATA_TYPES.values() if cfg.status == status]

    @staticmethod
    def get_by_operation(operation: str) -> List[DataTypeConfig]:
        """Retorna todos os tipos de dados que suportam determinada operação (list, reconcile, rollUp, dailyRollUp)."""
        return [
            cfg for cfg in DATA_TYPES.values()
            if operation in cfg.operations or (cfg.supported_operations is not None and operation in cfg.supported_operations)
        ]
