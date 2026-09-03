from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query

from backend.app.config import get_db_path, ZEPP_DATA_DIR
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.zepp_importer import parse_zepp_workouts

router = APIRouter(prefix="/api/workouts", tags=["Workouts"])


@router.get("", response_model=List[Dict[str, Any]])
def get_workouts(
    limit: int = Query(50, ge=1, le=500),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Retorna lista de treinos individuais com filtros e lazy-load automático."""
    db_path = get_db_path()
    try:
        initialize_db(db_path)
        repo = LongevityRepository(db_path)

        # Lazy-load fallback: se a tabela de treinos estiver vazia mas workout_history.json existir no disco
        if repo.count_workouts() == 0 and ZEPP_DATA_DIR.exists() and (ZEPP_DATA_DIR / "workout_history.json").is_file():
            parsed = parse_zepp_workouts(ZEPP_DATA_DIR)
            if parsed:
                repo.upsert_workouts(parsed)

        return repo.get_workouts(
            limit=limit,
            category=category,
            start_date=start_date,
            end_date=end_date,
        )
    except FileNotFoundError:
        return []
