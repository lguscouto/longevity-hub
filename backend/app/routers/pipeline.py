"""Router para histórico de execuções do pipeline de importação (Fase 4 / Task 4.1)."""

from fastapi import APIRouter, Query
from typing import Dict, Any, List

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository

router = APIRouter(prefix="/api/pipeline-runs", tags=["Pipeline"])


@router.get("", response_model=List[Dict[str, Any]])
def list_pipeline_runs(limit: int = Query(20, ge=1, le=100)):
    """Retorna o histórico sanitizado de execuções do pipeline de importação.

    Cada entrada contém source, run_at, records_inserted, status e
    um resumo sanitizado do log (log_summary).
    """
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_pipeline_runs(limit=limit)
