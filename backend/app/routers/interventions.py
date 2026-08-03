from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import date

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])


class InterventionInput(BaseModel):
    name: str
    category: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    dosage: Optional[str] = None
    target_metric: Optional[str] = None
    is_active: Optional[int] = 1
    notes: Optional[str] = None


class InterventionUpdateInput(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    dosage: Optional[str] = None
    target_metric: Optional[str] = None
    is_active: Optional[int] = None
    notes: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
def list_interventions(only_active: bool = False):
    """Retorna todas as intervenções cadastradas."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_interventions(only_active=only_active)


@router.post("")
def create_intervention(input_data: InterventionInput):
    """Cria uma nova intervenção."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    data = input_data.model_dump()
    if not data.get("start_date"):
        data["start_date"] = date.today().isoformat()
    intervention_id = repo.add_intervention(data)
    return {
        "status": "ok",
        "id": intervention_id,
        "message": "Intervenção cadastrada com sucesso",
    }


@router.put("/{intervention_id}")
def update_intervention(intervention_id: int, input_data: InterventionUpdateInput):
    """Atualiza uma intervenção existente."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    data = input_data.model_dump(exclude_unset=True)
    updated = repo.update_intervention(intervention_id, data)
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail=f"Intervenção com id {intervention_id} não encontrada",
        )
    return {
        "status": "ok",
        "intervention": updated,
        "message": "Intervenção atualizada com sucesso",
    }


@router.delete("/{intervention_id}")
def delete_intervention(intervention_id: int):
    """Remove uma intervenção."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    deleted = repo.delete_intervention(intervention_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Intervenção com id {intervention_id} não encontrada",
        )
    return {"status": "ok", "message": "Intervenção removida com sucesso"}