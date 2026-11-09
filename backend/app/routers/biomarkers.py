"""Endpoints da API para o Catálogo e Avaliação de Biomarcadores Derivados (§12)."""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS
from longevidade.metrics.derived_catalog import (
    DERIVED_METRICS_CATALOG,
    get_derived_metrics_by_category,
)
from longevidade.metrics.engine import (
    build_observation_context_for_date,
    evaluate_all_metrics,
)

router = APIRouter(prefix="/api/biomarkers", tags=["Biomarkers"])


class EvaluateBiomarkersPayload(BaseModel):
    raw_inputs: Dict[str, Any]
    measured_at: Optional[str] = None
    birthdate: Optional[str] = None
    cohort_variant: Optional[str] = "nhanes"


def _get_repo() -> LongevityRepository:
    db_path = get_db_path()
    initialize_db(db_path)
    return LongevityRepository(db_path)


@router.get("/catalog")
def get_biomarkers_catalog() -> Dict[str, Any]:
    """Retorna o catálogo completo de métricas com metadados agrupados nas 7 categorias da §12."""
    by_category = get_derived_metrics_by_category()
    catalog_list = [
        {
            "id": spec.id,
            "display_name": spec.display_name,
            "category": spec.category,
            "subcategory": spec.subcategory,
            "definition": spec.definition,
            "algorithm_version": spec.algorithm_version,
            "input_keys": spec.input_keys,
            "output_unit": spec.output_unit,
            "source_url": spec.source_url,
            "evidence_level": spec.evidence_level,
            "implementation_status": spec.implementation_status,
            "limitations": spec.limitations,
            "priority": spec.priority,
        }
        for spec in DERIVED_METRICS_CATALOG.values()
    ]
    return {
        "status": "ok",
        "total_metrics": len(catalog_list),
        "metrics": catalog_list,
        "categories": list(by_category.keys()),
        "by_category": {
            cat: [
                {
                    "id": s.id,
                    "display_name": s.display_name,
                    "category": s.category,
                    "subcategory": s.subcategory,
                    "definition": s.definition,
                    "algorithm_version": s.algorithm_version,
                    "input_keys": s.input_keys,
                    "output_unit": s.output_unit,
                    "source_url": s.source_url,
                    "evidence_level": s.evidence_level,
                    "implementation_status": s.implementation_status,
                    "limitations": s.limitations,
                    "priority": s.priority,
                }
                for s in specs
            ]
            for cat, specs in by_category.items()
        },
    }


def _compute_derived_biomarkers(
    target_date: Optional[str] = None,
    cohort_variant: Optional[str] = None,
    cohort: Optional[str] = None,
    persist: bool = False,
) -> Dict[str, Any]:
    repo = _get_repo()
    available_dates = repo.get_distinct_lab_dates(record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS)
    c_var = cohort_variant if isinstance(cohort_variant, str) else None
    c_alias = cohort if isinstance(cohort, str) else None
    effective_cohort = (c_var or c_alias or "nhanes").lower().strip()

    # Determina a data efetiva com validação estrita de formato ISO
    if target_date:
        try:
            date.fromisoformat(target_date[:10])
            effective_date = target_date[:10]
        except (ValueError, TypeError):
            effective_date = date.today().isoformat()
    elif available_dates:
        effective_date = available_dates[0]
    else:
        effective_date = date.today().isoformat()

    # Constrói o contexto clínico unificado e pareia antropometria
    inputs, pair_limitations = build_observation_context_for_date(
        repo,
        effective_date,
        anthropometry_window_days=7,
    )

    # Executa todas as métricas
    evaluation_results = evaluate_all_metrics(
        inputs,
        measured_at=effective_date,
        cohort_variant=effective_cohort,
    )

    # Adiciona limitações de pareamento nas métricas calculadas
    if pair_limitations:
        for res in evaluation_results.values():
            if res.get("status") in {"calculated", "missing_inputs"}:
                res["limitations"] = list(res.get("limitations", [])) + pair_limitations

    # Persiste os resultados calculados apenas se solicitado explicitamente (POST /recalculate)
    records_persisted = 0
    if persist:
        to_persist = [r for r in evaluation_results.values() if r.get("status") != "not_implemented"]
        records_persisted = repo.save_derived_metric_records(to_persist)

    # Agrupa os resultados pelas 7 categorias oficiais
    by_category: Dict[str, List[Dict[str, Any]]] = {
        "biological_age": [],
        "metabolic_insulin": [],
        "inflammation_immune_nutrition": [],
        "hepatic": [],
        "cardiovascular_renal": [],
        "body_composition": [],
        "direct_biomarkers": [],
    }
    for res in evaluation_results.values():
        metric_spec = DERIVED_METRICS_CATALOG.get(res["metric_id"])
        cat = metric_spec.category if metric_spec else "direct_biomarkers"
        if cat in by_category:
            by_category[cat].append({
                **res,
                "display_name": metric_spec.display_name if metric_spec else res["metric_id"],
                "subcategory": metric_spec.subcategory if metric_spec else "",
                "definition": metric_spec.definition if metric_spec else "",
                "priority": metric_spec.priority if metric_spec else "P0",
                "missing_inputs": res.get("missing_input_keys", []),
            })

    # Coleta séries históricas das 5 variáveis diretas (§9)
    direct_keys_map = {
        "total_testosterone": ["total_testosterone", "testosterone_total"],
        "hematocrit": ["hematocrit", "hematocrit_pct"],
        "hemoglobin": ["hemoglobin", "hemoglobin_g_dl", "hb"],
        "hba1c": ["hba1c", "hba1c_pct"],
        "hs_crp": ["hs_crp", "hscrp", "hscrp_mgl", "hs_crp_mg_l", "pcr_us"],
    }
    all_labs = repo.get_lab_results(limit=2000, record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS)
    direct_series: Dict[str, List[Dict[str, Any]]] = {k: [] for k in direct_keys_map}

    for lab in sorted(all_labs, key=lambda x: str(x.get("collected_at", ""))):
        k = lab.get("metric_key", "")
        for target_canonical, aliases in direct_keys_map.items():
            if k in aliases or k == target_canonical:
                direct_series[target_canonical].append({
                    "collected_at": lab.get("collected_at"),
                    "value": lab.get("value"),
                    "unit": lab.get("unit"),
                })

    return {
        "status": "ok",
        "measured_at": effective_date,
        "collected_at": effective_date,
        "cohort_variant": effective_cohort,
        "cohort": effective_cohort,
        "available_dates": available_dates,
        "metrics": list(evaluation_results.values()),
        "by_category": by_category,
        "metrics_by_category": by_category,
        "direct_biomarkers": direct_series,
        "direct_biomarkers_series": direct_series,
        "records_persisted": records_persisted,
        "context": {
            "inputs_count": len(inputs),
            "paired_limitations": pair_limitations,
        },
    }


@router.get("/derived")
def get_derived_biomarkers(
    target_date: Optional[str] = Query(None, alias="date"),
    cohort_variant: Optional[str] = Query(None, alias="cohort_variant"),
    cohort: Optional[str] = Query(None, alias="cohort"),
) -> Dict[str, Any]:
    """Retorna os indicadores derivados para a data solicitada sem mutações em disco (GET idempotente)."""
    return _compute_derived_biomarkers(
        target_date=target_date,
        cohort_variant=cohort_variant,
        cohort=cohort,
        persist=False,
    )


@router.post("/derived/recalculate")
def recalculate_derived_biomarkers(
    target_date: Optional[str] = Query(None, alias="date"),
    cohort_variant: Optional[str] = Query(None, alias="cohort_variant"),
    cohort: Optional[str] = Query(None, alias="cohort"),
) -> Dict[str, Any]:
    """Calcula e persiste indicadores derivados no banco de dados SQLite."""
    return _compute_derived_biomarkers(
        target_date=target_date,
        cohort_variant=cohort_variant,
        cohort=cohort,
        persist=True,
    )


@router.post("/evaluate")
def evaluate_biomarkers(payload: EvaluateBiomarkersPayload) -> Dict[str, Any]:
    """Endpoint síncrono para avaliar entradas fornecidas diretamente sem persistência."""
    results = evaluate_all_metrics(
        payload.raw_inputs,
        measured_at=payload.measured_at,
        cohort_variant=payload.cohort_variant or "nhanes",
        birthdate=payload.birthdate,
    )
    return {
        "status": "ok",
        "measured_at": payload.measured_at or date.today().isoformat(),
        "cohort_variant": payload.cohort_variant or "nhanes",
        "metrics": results,
    }
