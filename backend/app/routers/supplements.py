from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import date

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository

router = APIRouter(prefix="/api/supplements", tags=["Supplements"])

class SupplementInput(BaseModel):
    name: str
    dosage: str
    category: Optional[str] = "Suplemento"
    frequency: Optional[str] = "Diário"
    timing: Optional[str] = "Manhã"
    start_date: Optional[str] = None
    notes: Optional[str] = None

class SupplementUpdateInput(BaseModel):
    supplement_id: int
    name: Optional[str] = None
    dosage: Optional[str] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    timing: Optional[str] = None
    notes: Optional[str] = None

class ToggleLogInput(BaseModel):
    supplement_id: int
    date_ref: Optional[str] = None

class DeleteSupplementInput(BaseModel):
    supplement_id: int

@router.get("", response_model=List[Dict[str, Any]])
def get_supplements():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_supplements(only_active=True)

@router.post("")
def add_supplement(input_data: SupplementInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    data = input_data.model_dump()
    if not data.get("start_date"):
        data["start_date"] = date.today().isoformat()
    supp_id = repo.add_supplement(data)
    return {"status": "ok", "id": supp_id, "message": "Suplemento cadastrado com sucesso"}

@router.post("/update")
def update_supplement(input_data: SupplementUpdateInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    data = input_data.model_dump(exclude_unset=True)
    supp_id = data.pop("supplement_id")
    repo.update_supplement(supp_id, data)
    return {"status": "ok", "message": "Suplemento/Hormônio atualizado com sucesso"}

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_audit_logs(limit: int = 50):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_supplement_audit_logs(limit=limit)

@router.get("/logs/{date_str}", response_model=List[int])
def get_logs_for_date(date_str: str):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_supplement_logs_for_date(date_str)

@router.post("/toggle")
def toggle_supplement_log(input_data: ToggleLogInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    target_date = input_data.date_ref or date.today().isoformat()
    repo.toggle_supplement_log(input_data.supplement_id, target_date)
    return {"status": "ok", "message": "Status do suplemento alterado"}

@router.delete("/{supplement_id}")
def delete_supplement(supplement_id: int):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    repo.delete_supplement(supplement_id)
    return {"status": "ok", "message": "Suplemento removido com sucesso"}

@router.post("/delete")
def delete_supplement_post(input_data: DeleteSupplementInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    repo.delete_supplement(input_data.supplement_id)
    return {"status": "ok", "message": "Suplemento removido com sucesso"}
