"""
Modelos de dados Pydantic e schemas para a Health Timeline e Context Engine.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class HealthEvent(BaseModel):
    """Representa uma ocorrência unificada e contextual de saúde na Timeline."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str  # ISO 8601 UTC
    date_ref: str   # YYYY-MM-DD no timezone do usuário
    time_ref: Optional[str] = None  # HH:MM
    event_type: str  # ex: workout, lab_result, supplement, alcohol, symptom, metric_change
    category: str    # ex: metric, clinical, intervention, lifestyle, symptom, exercise
    title: str
    description: Optional[str] = None
    source: str      # ex: manual, zepp, google_health, hevy, lab_import, derived
    source_type: str # ex: workout, lab_result, supplement_stack, daily_metric, manual_entry
    source_id: Optional[str] = None
    source_key: Optional[str] = None
    confidence: str = "high"       # low, moderate, high
    significance: str = "normal"   # normal, notável, significativa
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_pinned: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class HealthEventCreate(BaseModel):
    """Payload para registro manual de um novo evento de saúde."""

    timestamp: Optional[str] = None  # Se omitido, usa UTC atual
    date_ref: Optional[str] = None   # Se omitido, calcula pelo timestamp local
    time_ref: Optional[str] = None   # HH:MM
    event_type: str
    category: str
    title: str
    description: Optional[str] = None
    source: str = "manual"
    confidence: str = "high"
    significance: str = "normal"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_pinned: bool = False


class HealthEventUpdate(BaseModel):
    """Payload para atualização de um evento manual."""

    timestamp: Optional[str] = None
    date_ref: Optional[str] = None
    time_ref: Optional[str] = None
    event_type: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    significance: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_pinned: Optional[bool] = None


class TimelineQueryFilter(BaseModel):
    """Parâmetros de filtro e busca na Linha do Tempo."""

    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
    category: Optional[str] = None
    event_type: Optional[str] = None
    source: Optional[str] = None
    significance: Optional[str] = None
    limit: int = 100
    offset: int = 0


class TimelineSummaryDay(BaseModel):
    """Agrupamento diário de eventos e resumo de métricas."""

    date_ref: str
    day_of_week: str       # SEG, TER, QUA...
    display_date: str      # DD/MM
    events: List[HealthEvent] = Field(default_factory=list)
    metrics_summary: Dict[str, Any] = Field(default_factory=dict)


class TimelineResponse(BaseModel):
    """Resposta paginada da Timeline contendo a lista plana e os dias agrupados."""

    total: int
    items: List[HealthEvent]
    days: List[TimelineSummaryDay]


class TimelineSummaryWeek(BaseModel):
    """Síntese agregada da semana para o nível de zoom intermediário."""

    week_start: str        # YYYY-MM-DD
    week_end: str          # YYYY-MM-DD
    title: str             # ex: 16–22 Setembro
    avg_sleep_min: Optional[float] = None
    avg_sleep_formatted: Optional[str] = None
    hrv_delta_pct: Optional[float] = None
    rhr_delta_bpm: Optional[float] = None
    training_load_delta_pct: Optional[float] = None
    workout_count: int = 0
    key_events: List[HealthEvent] = Field(default_factory=list)


class TimelineSummaryMonth(BaseModel):
    """Síntese agregada do mês para o nível de zoom macro."""

    month_ref: str         # YYYY-MM
    title: str             # ex: Setembro 2026
    weight_delta_kg: Optional[float] = None
    hrv_delta_pct: Optional[float] = None
    rhr_delta_bpm: Optional[float] = None
    sleep_delta_min: Optional[float] = None
    total_workouts: int = 0
    active_interventions: List[str] = Field(default_factory=list)
    key_events_count: int = 0
    key_events: List[HealthEvent] = Field(default_factory=list)


class BackfillStatus(BaseModel):
    """Estado do processo de backfill/reconciliação de projeção."""

    source_type: str
    last_processed_id: Optional[str] = None
    last_processed_timestamp: Optional[str] = None
    total_records_processed: int = 0
    status: str            # pending, in_progress, completed, error
    last_error: Optional[str] = None
    updated_at: Optional[str] = None


class PersonalAssociation(BaseModel):
    """Representa uma associação pessoal aprendida pelo motor estatístico."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    target_metric: str        # 'hrv_ms', 'rhr_bpm', 'sleep_minutes', 'weight_kg'
    factor: str               # 'alcohol', 'sleep_deficit', 'acute_training_load', etc.
    factor_name: str          # Nome amigável para exibição
    window_hours: int         # 12, 24, 36, 48, 72
    sample_size: int          # n de observações pareadas
    effect_size: Optional[float] = None       # Cohen's d
    mean_delta_pct: Optional[float] = None    # Variação média observada na métrica em %
    correlation: Optional[float] = None       # Pearson/Spearman se houver dose contínua
    shrinkage_factor: float = 0.0             # Regularização bayesiana (0.0 a 1.0)
    confidence: str = "low"                   # 'low', 'moderate', 'high'
    data_coverage_pct: Optional[float] = None # % de completude na janela
    user_feedback_balance: int = 0            # positivos - negativos
    headline: str                             # Síntese direta da evidência
    evidence_text: str                        # Frase explicativa completa
    first_observation_at: Optional[str] = None
    last_observation_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PersonalAssociationsResponse(BaseModel):
    """Payload de retorno da lista de associações pessoais aprendidas."""

    total: int
    items: List[PersonalAssociation]
    last_calculated_at: Optional[str] = None


class MetricChangePoint(BaseModel):
    """Representa uma quebra de patamar persistente (level shift) em uma série temporal fisiológica."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    metric: str                # 'hrv_ms', 'rhr_bpm', 'sleep_minutes', 'weight_kg'
    metric_name: str           # Nome formatado (ex: 'HRV (VFC)')
    unit: str                  # 'ms', 'bpm', 'min', 'kg'
    timestamp: str             # ISO 8601 UTC
    date_ref: str              # YYYY-MM-DD
    baseline_value: float      # Mediana prévia do patamar anterior (30 dias)
    observed_value: float      # Mediana do novo patamar recente
    delta_absolute: float      # observed - baseline
    delta_percent: float       # % de alteração
    robust_z_score: Optional[float] = None
    significance: str          # 'notável', 'significativa'
    detection_method: str      # 'cusum_confirmed', 'robust_level_shift'
    persisted_days: int = 1    # Duração em dias contíguos da alteração
    headline: str              # Título explicativo
    description: str           # Frase descritiva
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None


class ChangePointsResponse(BaseModel):
    """Envelope de retorno para lista de quebras de patamar."""

    total: int
    items: List[MetricChangePoint]


class CovariateItem(BaseModel):
    """Representa o balanço de uma covariável exógena entre controle e tratamento."""

    key: str
    name: str
    category: str  # 'substance', 'exercise', 'routine', 'supplement', 'sleep'
    control_mean: float
    treatment_mean: float
    unit: str = ""
    delta_pct: float
    standardized_diff: float
    is_imbalanced: bool
    control_raw: Optional[Dict[str, Any]] = None
    treatment_raw: Optional[Dict[str, Any]] = None
    detail_text: Optional[str] = None


class ConfounderReport(BaseModel):
    """Relatório estruturado de balanço de covariáveis para detecção de viés metodológico."""

    experiment_id: Optional[int] = None
    intervention_id: Optional[int] = None
    control_period: Dict[str, Any]
    treatment_period: Dict[str, Any]
    covariates: List[CovariateItem] = Field(default_factory=list)
    has_severe_confounding: bool = False
    imbalanced_factors_count: int = 0
    warning_summary: str
    disclaimer: str


class ConfounderBalanceRequest(BaseModel):
    """Payload para cálculo dinâmico de balanceamento de covariáveis entre duas janelas temporais."""

    control_start: str
    control_end: str
    treatment_start: str
    treatment_end: str
    experiment_id: Optional[int] = None


class BeforeAfterAnalysisResponse(BaseModel):
    """Análise comparativa Antes vs. Depois de uma intervenção com balanço de confundidores."""

    intervention_id: int
    intervention_name: str
    category: str
    start_date: str
    end_date: Optional[str] = None
    target_metric: Optional[str] = None
    target_metric_name: Optional[str] = None
    control_period: Dict[str, Any]
    treatment_period: Dict[str, Any]
    metric_comparison: Optional[Dict[str, Any]] = None
    confounder_report: ConfounderReport

