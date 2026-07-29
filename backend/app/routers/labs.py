from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.lab_parser import ingest_lab_records, OPTIMAL_LONGEVITY_TARGETS

router = APIRouter(prefix="/api/labs", tags=["Labs"])

class LabRecordInput(BaseModel):
    collected_at: str
    metric_key: str
    metric_name: Optional[str] = None
    value: float
    unit: Optional[str] = None
    ref_min: Optional[float] = None
    ref_max: Optional[float] = None
    optimal_target: Optional[float] = None
    category: Optional[str] = None
    notes: Optional[str] = None

class BatchLabInput(BaseModel):
    chronological_age: Optional[float] = 40.0
    records: List[LabRecordInput]

class DeleteLabByDateInput(BaseModel):
    collected_at: str

@router.get("", response_model=List[Dict[str, Any]])
def get_labs():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_lab_results()

@router.get("/latest", response_model=Dict[str, Dict[str, Any]])
def get_latest_labs():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_latest_labs_by_key()

@router.get("/targets")
def get_optimal_targets():
    return OPTIMAL_LONGEVITY_TARGETS

@router.post("/batch")
def add_batch_labs(batch: BatchLabInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    recs = [r.model_dump() for r in batch.records]
    count = ingest_lab_records(recs, repo, chronological_age=batch.chronological_age or 40.0)
    return {"status": "ok", "inserted": count}

@router.delete("/date/{collected_at}")
def delete_labs_by_date(collected_at: str):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    deleted_count = repo.delete_lab_results_by_date(collected_at)
    return {"status": "ok", "deleted": deleted_count, "message": f"Removidos {deleted_count} registros do laudo de {collected_at}"}

@router.post("/delete")
def delete_labs_by_date_post(input_data: DeleteLabByDateInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    deleted_count = repo.delete_lab_results_by_date(input_data.collected_at)
    return {"status": "ok", "deleted": deleted_count, "message": f"Removidos {deleted_count} registros do laudo de {input_data.collected_at}"}
