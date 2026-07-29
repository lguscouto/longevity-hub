from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.algorithms.phenoage import PhenoAgeInput, calculate_phenoage

router = APIRouter(prefix="/api/phenoage", tags=["PhenoAge"])

class PhenoAgeCalculateRequest(BaseModel):
    chronological_age: float = 40.0
    glucose_mgdl: Optional[float] = 90.0
    creatinine_mgdl: Optional[float] = 0.9
    albumin_gdl: Optional[float] = 4.5
    hscrp_mgl: Optional[float] = 0.5
    lymphocyte_pct: Optional[float] = 30.0
    mcv_fl: Optional[float] = 89.0
    rdw_pct: Optional[float] = 12.5
    alk_phos_ul: Optional[float] = 65.0
    wbc_1000ul: Optional[float] = 6.0

@router.get("/history", response_model=List[Dict[str, Any]])
def get_phenoage_history():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_phenoage_history()

@router.post("/calculate")
def calculate_and_save_phenoage(req: PhenoAgeCalculateRequest):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    data_input: PhenoAgeInput = req.model_dump()
    res = calculate_phenoage(data_input)

    from datetime import date
    rec = {
        "calculated_at": date.today().isoformat(),
        "chronological_age": res["chronological_age"],
        "pheno_age": res["pheno_age"],
        "age_delta": res["age_delta"],
        **req.model_dump()
    }
    row_id = repo.add_phenoage_record(rec)
    return {"status": "ok", "id": row_id, "result": res}
