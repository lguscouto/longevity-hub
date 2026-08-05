"""Seleção única de dados laboratoriais elegíveis para documentos clínicos."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from longevidade.db.repository import LongevityRepository
from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS


@dataclass(frozen=True)
class ClinicalLabSnapshot:
    """Dados com provenance clínica explícita, prontos para relatórios e análises."""

    latest_labs: dict[str, dict[str, Any]]
    latest_phenoage: dict[str, Any] | None
    excluded_lab_results: int
    excluded_phenoage_records: int


def get_clinical_lab_snapshot(repo: LongevityRepository) -> ClinicalLabSnapshot:
    """Exclui por padrão dados sintéticos, fixtures e registros legados não verificados."""

    phenoage_history = repo.get_phenoage_history(
        limit=1,
        record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
    )
    return ClinicalLabSnapshot(
        latest_labs=repo.get_latest_labs_by_key(
            record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
        ),
        latest_phenoage=phenoage_history[0] if phenoage_history else None,
        excluded_lab_results=repo.count_lab_results_excluded_from_clinical_use(),
        excluded_phenoage_records=repo.count_phenoage_records_excluded_from_clinical_use(),
    )
