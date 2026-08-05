from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.algorithms.phenoage import PhenoAgeInput, calculate_phenoage
from longevidade.algorithms.phenoage_panel import PhenoAgeLabPanel, select_latest_complete_phenoage_panel
from longevidade.ingestion.lab_normalization import PHENOAGE_REQUIRED_MARKERS
from longevidade.lab_provenance import (
    CLINICALLY_ELIGIBLE_LAB_ORIGINS,
    IMPORTED_LAB_ORIGIN,
    MANUAL_LAB_ORIGIN,
    PATIENT_LAB_ORIGIN,
)
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/phenoage", tags=["PhenoAge"])


class PhenoAgeCalculateRequest(BaseModel):
    chronological_age: Optional[float] = None
    glucose_mgdl: Optional[float] = None
    creatinine_mgdl: Optional[float] = None
    albumin_gdl: Optional[float] = None
    hscrp_mgl: Optional[float] = None
    lymphocyte_pct: Optional[float] = None
    mcv_fl: Optional[float] = None
    rdw_pct: Optional[float] = None
    alk_phos_ul: Optional[float] = None
    wbc_1000ul: Optional[float] = None


def _latest_complete_phenoage_panel(repo: LongevityRepository) -> PhenoAgeLabPanel | None:
    return select_latest_complete_phenoage_panel(
        repo.get_lab_results(
            limit=10_000,
            record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
        )
    )


def _clinical_panel_origin(panel: PhenoAgeLabPanel) -> str:
    """Propaga provenance importada somente quando todo o painel veio dela."""

    if panel.record_origins == frozenset({IMPORTED_LAB_ORIGIN}):
        return IMPORTED_LAB_ORIGIN
    return PATIENT_LAB_ORIGIN


def _profile_chronological_age(repo: LongevityRepository) -> float:
    try:
        profile = repo.get_user_profile()
        value = profile.get("chronological_age")
        return float(value) if value is not None else 40.0
    except (TypeError, ValueError):
        return 40.0


@router.get("/history", response_model=List[Dict[str, Any]])
def get_phenoage_history():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return repo.get_phenoage_history(record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS)
    except FileNotFoundError:
        return []


@router.post("/calculate")
def calculate_and_save_phenoage(req: PhenoAgeCalculateRequest):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    payload = req.model_dump(exclude_none=True)
    chronological_age = payload.pop("chronological_age", None)
    has_manual_marker_overrides = bool(payload)
    panel = None if has_manual_marker_overrides else _latest_complete_phenoage_panel(repo)
    data_input: PhenoAgeInput = dict(payload) if has_manual_marker_overrides else dict(panel.values if panel else {})
    data_input["chronological_age"] = chronological_age if chronological_age is not None else _profile_chronological_age(repo)

    res = calculate_phenoage(data_input)
    if res.get("status") != "complete":
        if not has_manual_marker_overrides and panel is None:
            res["reason"] = "no_complete_single_collection_panel"
        return {"status": "incomplete", "id": None, "saved": False, "result": res}

    rec = {
        "calculated_at": date.today().isoformat() if has_manual_marker_overrides else panel.collected_at,
        "chronological_age": res["chronological_age"],
        "pheno_age": res["pheno_age"],
        "age_delta": res["age_delta"],
        "record_origin": MANUAL_LAB_ORIGIN if has_manual_marker_overrides else _clinical_panel_origin(panel),
        **{field: data_input.get(field) for field in PHENOAGE_REQUIRED_MARKERS},
    }
    row_id = repo.add_phenoage_record(rec)
    return {"status": "ok", "id": row_id, "saved": True, "result": res}
