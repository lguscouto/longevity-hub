"""
Catálogo canônico de biomarcadores e métricas do Longevidade Hub.
Centraliza rótulo PT-BR, unidade, direção de otimização, janela de baseline e faixas de plausibilidade.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class MetricDefinition:
    key: str
    label: str
    unit: str
    higher_is_better: Optional[bool]
    baseline_days: int = 28
    min_observations: int = 14
    plausible_min: Optional[float] = None
    plausible_max: Optional[float] = None


METRICS_CATALOG: Dict[str, MetricDefinition] = {
    "hrv_ms": MetricDefinition(
        key="hrv_ms",
        label="HRV Noturna",
        unit="ms",
        higher_is_better=True,
        baseline_days=28,
        min_observations=14,
        plausible_min=5.0,
        plausible_max=250.0,
    ),
    "rhr_bpm": MetricDefinition(
        key="rhr_bpm",
        label="FC de Repouso (RHR)",
        unit="bpm",
        higher_is_better=False,
        baseline_days=28,
        min_observations=14,
        plausible_min=30.0,
        plausible_max=120.0,
    ),
    "steps": MetricDefinition(
        key="steps",
        label="Passos Diários",
        unit="passos",
        higher_is_better=True,
        baseline_days=28,
        min_observations=7,
        plausible_min=0.0,
        plausible_max=100000.0,
    ),
    "sleep_minutes": MetricDefinition(
        key="sleep_minutes",
        label="Sono Total",
        unit="minutos",
        higher_is_better=True,
        baseline_days=28,
        min_observations=7,
        plausible_min=60.0,
        plausible_max=900.0,
    ),
    "sleep_rem_min": MetricDefinition(
        key="sleep_rem_min",
        label="Sono REM",
        unit="minutos",
        higher_is_better=True,
        baseline_days=28,
        min_observations=7,
        plausible_min=0.0,
        plausible_max=300.0,
    ),
    "spo2_avg_pct": MetricDefinition(
        key="spo2_avg_pct",
        label="SpO2 Médio",
        unit="%",
        higher_is_better=True,
        baseline_days=28,
        min_observations=7,
        plausible_min=70.0,
        plausible_max=100.0,
    ),
    "respiratory_rate_rpm": MetricDefinition(
        key="respiratory_rate_rpm",
        label="Freq. Respiratória",
        unit="rpm",
        higher_is_better=False,
        baseline_days=28,
        min_observations=7,
        plausible_min=6.0,
        plausible_max=40.0,
    ),
    "pai_score": MetricDefinition(
        key="pai_score",
        label="Score PAI (7d)",
        unit="pts",
        higher_is_better=True,
        baseline_days=28,
        min_observations=7,
        plausible_min=0.0,
        plausible_max=300.0,
    ),
    "vo2_max": MetricDefinition(
        key="vo2_max",
        label="VO2 Max",
        unit="mL/kg/min",
        higher_is_better=True,
        baseline_days=28,
        min_observations=1,
        plausible_min=15.0,
        plausible_max=95.0,
    ),
    "systolic_bp": MetricDefinition(
        key="systolic_bp",
        label="PA Sistólica",
        unit="mmHg",
        higher_is_better=False,
        baseline_days=28,
        min_observations=7,
        plausible_min=70.0,
        plausible_max=240.0,
    ),
    "diastolic_bp": MetricDefinition(
        key="diastolic_bp",
        label="PA Diastólica",
        unit="mmHg",
        higher_is_better=False,
        baseline_days=28,
        min_observations=7,
        plausible_min=40.0,
        plausible_max=140.0,
    ),
}


def get_metric_definition(key: str) -> Optional[MetricDefinition]:
    """Retorna a definição da métrica pelo nome de sua chave."""
    return METRICS_CATALOG.get(key)
