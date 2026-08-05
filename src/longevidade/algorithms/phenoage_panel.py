"""Seleção de painéis PhenoAge temporalmente coerentes.

PhenoAge exige nove biomarcadores. Eles só podem compor o cálculo quando
pertencem à mesma data de coleta; escolher o último resultado de cada marcador
poderia criar um painel inexistente a partir de exames heterogêneos.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date
from typing import Any

from longevidade.ingestion.lab_normalization import (
    PHENOAGE_REQUIRED_MARKERS,
    coerce_float,
    normalize_lab_key,
)


@dataclass(frozen=True)
class PhenoAgeLabPanel:
    """Valores elegíveis de uma única data de coleta."""

    collected_at: str
    values: dict[str, float]
    record_origins: frozenset[str]


def _collection_date(value: object) -> str | None:
    """Normaliza data/timestamp ISO para a data clínica de coleta."""

    raw_value = str(value or "").strip()
    if len(raw_value) < 10:
        return None
    try:
        return date.fromisoformat(raw_value[:10]).isoformat()
    except ValueError:
        return None


def _record_rank(record: Mapping[str, Any], position: int) -> tuple[int, int]:
    """Escolhe deterministamente a versão mais recente de um marcador repetido."""

    try:
        row_id = int(record.get("id"))
    except (TypeError, ValueError):
        row_id = position
    return row_id, position


def select_latest_complete_phenoage_panel(
    records: Iterable[Mapping[str, Any]],
) -> PhenoAgeLabPanel | None:
    """Retorna o painel completo mais recente sem combinar datas de coleta.

    Linhas com data inválida, valor inválido ou marcador fora dos nove exigidos
    não compõem um painel. Para duplicatas na mesma data, a maior identidade de
    linha (ou a última posição para registros ainda não persistidos) prevalece.
    """

    panels: dict[str, dict[str, tuple[tuple[int, int], float, str]]] = {}
    required_markers = set(PHENOAGE_REQUIRED_MARKERS)

    for position, record in enumerate(records):
        collected_at = _collection_date(record.get("collected_at"))
        metric_key = normalize_lab_key(str(record.get("metric_key") or ""))
        value = coerce_float(record.get("value"))
        if collected_at is None or metric_key not in required_markers or value is None:
            continue

        panel = panels.setdefault(collected_at, {})
        rank = _record_rank(record, position)
        previous = panel.get(metric_key)
        if previous is None or rank > previous[0]:
            panel[metric_key] = (rank, value, str(record.get("record_origin") or ""))

    for collected_at in sorted(panels, reverse=True):
        panel = panels[collected_at]
        if not all(marker in panel for marker in PHENOAGE_REQUIRED_MARKERS):
            continue
        return PhenoAgeLabPanel(
            collected_at=collected_at,
            values={marker: panel[marker][1] for marker in PHENOAGE_REQUIRED_MARKERS},
            record_origins=frozenset(panel[marker][2] for marker in PHENOAGE_REQUIRED_MARKERS),
        )

    return None
