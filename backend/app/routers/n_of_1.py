from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.algorithms.n_of_1 import analyze_n_of_1

router = APIRouter(prefix="/api/n-of-1", tags=["N-of-1 Experiments"])

class NOf1ExperimentInput(BaseModel):
    title: str
    hypothesis: Optional[str] = None
    metric_key: str
    control_start: str
    control_end: str
    treatment_start: str
    treatment_end: str
    status: Optional[str] = "em_andamento"
    notes: Optional[str] = None

@router.get("", response_model=List[Dict[str, Any]])
def get_experiments():
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_n_of_1_experiments()

@router.post("")
def create_experiment(input_data: NOf1ExperimentInput):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Busca métricas diárias no banco para o período de controle e tratamento
    all_metrics = repo.get_daily_metrics(days=365)
    metric_map = {m["date_ref"]: m.get(input_data.metric_key) for m in all_metrics}

    control_vals = [
        val for d, val in metric_map.items()
        if input_data.control_start <= d <= input_data.control_end and val is not None
    ]
    treatment_vals = [
        val for d, val in metric_map.items()
        if input_data.treatment_start <= d <= input_data.treatment_end and val is not None
    ]

    stats_res = analyze_n_of_1(control_vals, treatment_vals)

    data = input_data.model_dump()
    data.update({
        "control_mean": stats_res["control_mean"],
        "treatment_mean": stats_res["treatment_mean"],
        "cohens_d": stats_res["cohens_d"],
        "p_value": stats_res["p_value"],
        "statistically_significant": 1 if stats_res["statistically_significant"] else 0,
    })

    exp_id = repo.add_n_of_1_experiment(data)
    return {"status": "ok", "id": exp_id, "stats": stats_res}
