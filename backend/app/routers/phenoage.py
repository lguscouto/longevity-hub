from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.algorithms.phenoage import PhenoAgeInput, calculate_phenoage
from longevidade.ingestion.lab_normalization import PHENOAGE_REQUIRED_MARKERS
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


_PHENOAGE_LAB_ALIASES = {
    "glucose_mgdl": "glucose_mgdl",
    "fasting_glucose": "glucose_mgdl",
    "glucose": "glucose_mgdl",
    "creatinine_mgdl": "creatinine_mgdl",
    "creatinine": "creatinine_mgdl",
    "albumin_gdl": "albumin_gdl",
    "albumin": "albumin_gdl",
    "hscrp_mgl": "hscrp_mgl",
    "hscrp": "hscrp_mgl",
    "hs_crp": "hscrp_mgl",
    "crp": "hscrp_mgl",
    "lymphocyte_pct": "lymphocyte_pct",
    "lymphocyte": "lymphocyte_pct",
    "mcv_fl": "mcv_fl",
    "mcv": "mcv_fl",
    "rdw_pct": "rdw_pct",
    "rdw": "rdw_pct",
    "alk_phos_ul": "alk_phos_ul",
    "alk_phos": "alk_phos_ul",
    "alp": "alk_phos_ul",
    "wbc_1000ul": "wbc_1000ul",
    "wbc": "wbc_1000ul",
}


def _normalize_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def _latest_phenoage_values(repo: LongevityRepository) -> dict[str, float]:
    values: dict[str, float] = {}
    for metric_key, row in repo.get_latest_labs_by_key().items():
        canonical = _PHENOAGE_LAB_ALIASES.get(_normalize_key(metric_key))
        if canonical is None:
            continue
        try:
            value = float(row.get("value"))
        except (TypeError, ValueError):
            continue
        values[canonical] = value
    return values


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
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_phenoage_history()


@router.post("/calculate")
def calculate_and_save_phenoage(req: PhenoAgeCalculateRequest):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    payload = req.model_dump(exclude_none=True)
    chronological_age = payload.pop("chronological_age", None)
    data_input: PhenoAgeInput = _latest_phenoage_values(repo)
    data_input.update(payload)
    data_input["chronological_age"] = chronological_age if chronological_age is not None else _profile_chronological_age(repo)

    res = calculate_phenoage(data_input)
    if res.get("status") != "complete":
        return {"status": "incomplete", "id": None, "saved": False, "result": res}

    rec = {
        "calculated_at": date.today().isoformat(),
        "chronological_age": res["chronological_age"],
        "pheno_age": res["pheno_age"],
        "age_delta": res["age_delta"],
        **{field: data_input.get(field) for field in PHENOAGE_REQUIRED_MARKERS},
    }
    row_id = repo.add_phenoage_record(rec)
    return {"status": "ok", "id": row_id, "saved": True, "result": res}
