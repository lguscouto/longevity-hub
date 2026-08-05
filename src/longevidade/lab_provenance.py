"""Proveniência e elegibilidade de resultados laboratoriais clínicos."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


PATIENT_LAB_ORIGIN = "patient_lab"
IMPORTED_LAB_ORIGIN = "imported"
SYNTHETIC_LAB_ORIGIN = "synthetic"
FIXTURE_LAB_ORIGIN = "fixture"
CALCULATED_LAB_ORIGIN = "calculated"
MANUAL_LAB_ORIGIN = "manual"
DEMO_LAB_ORIGIN = "demo"
UNVERIFIED_LAB_ORIGIN = "unverified"

VALID_LAB_RECORD_ORIGINS = frozenset(
    {
        PATIENT_LAB_ORIGIN,
        IMPORTED_LAB_ORIGIN,
        SYNTHETIC_LAB_ORIGIN,
        FIXTURE_LAB_ORIGIN,
        CALCULATED_LAB_ORIGIN,
        MANUAL_LAB_ORIGIN,
        DEMO_LAB_ORIGIN,
        UNVERIFIED_LAB_ORIGIN,
    }
)
CLINICALLY_ELIGIBLE_LAB_ORIGINS = frozenset({PATIENT_LAB_ORIGIN, IMPORTED_LAB_ORIGIN})


def normalize_lab_record_origin(value: object, *, default: str = UNVERIFIED_LAB_ORIGIN) -> str:
    """Normaliza e valida a origem; omissão permanece não verificável."""

    normalized = str(value if value is not None else default).strip().lower()
    if normalized not in VALID_LAB_RECORD_ORIGINS:
        allowed = ", ".join(sorted(VALID_LAB_RECORD_ORIGINS))
        raise ValueError(f"record_origin inválido: {normalized!r}. Valores aceitos: {allowed}.")
    return normalized


def is_clinically_eligible_lab(record: Mapping[str, Any]) -> bool:
    """Dados sem provenance explícita são excluídos de relatórios e cálculos clínicos."""

    return record.get("record_origin") in CLINICALLY_ELIGIBLE_LAB_ORIGINS
