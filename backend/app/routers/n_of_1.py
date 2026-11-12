from datetime import date
import json
import math
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.algorithms.n_of_1 import analyze_n_of_1

router = APIRouter(prefix="/api/n-of-1", tags=["N-of-1 Experiments"])

class NOf1ExperimentInput(BaseModel):
    title: str
    hypothesis: Optional[str] = None
    metric_key: str
    control_start: date
    control_end: date
    treatment_start: date
    treatment_end: date
    status: Optional[str] = "em_andamento"
    notes: Optional[str] = None
    adherence: Optional[str] = None
    simultaneous_changes: Optional[str] = None
    save_incomplete: bool = False


def _observations(repo, experiment):
    start = min(experiment['control_start'], experiment['treatment_start'])
    end = max(experiment['control_end'], experiment['treatment_end'])
    metrics = repo.get_daily_metrics_between(start, end)
    def values(first, last):
        result = []
        for row in metrics:
            value = row.get(experiment['metric_key'])
            if first <= row['date_ref'] <= min(last, date.today().isoformat()) and isinstance(value, (float, int)) and math.isfinite(value):
                result.append(value)
        return result
    control = values(experiment['control_start'], experiment['control_end'])
    treatment = values(experiment['treatment_start'], experiment['treatment_end'])
    def count_days(first, last):
        first_date = date.fromisoformat(first)
        last_date = min(date.fromisoformat(last), date.today())
        return max(0, (last_date - first_date).days + 1)
    return control, treatment, {
        'control_observations': len(control), 'treatment_observations': len(treatment),
        'control_missing': count_days(experiment['control_start'], experiment['control_end']) - len(control),
        'treatment_missing': count_days(experiment['treatment_start'], experiment['treatment_end']) - len(treatment),
    }

@router.get("", response_model=List[Dict[str, Any]])
def get_experiments():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        experiments = repo.get_n_of_1_experiments()
        for experiment in experiments:
            notes = experiment.get('notes') or ''
            if notes.startswith('n_of_1_details_v1:'):
                try:
                    details = json.loads(notes.removeprefix('n_of_1_details_v1:'))
                    experiment.update({key: details.get(key) for key in ('notes', 'adherence', 'simultaneous_changes')})
                except (ValueError, AttributeError):
                    pass
            control, treatment, counts = _observations(repo, experiment)
            experiment.update(counts)
            if len(control) >= 3 and len(treatment) >= 3:
                experiment.update(analyze_n_of_1(control, treatment))
            else:
                experiment.update({key: None for key in ('control_mean', 'treatment_mean', 'cohens_d', 'p_value', 'statistically_significant')})
        return experiments
    except FileNotFoundError:
        return []

@router.post("")
def create_experiment(input_data: NOf1ExperimentInput):
    if input_data.control_start > input_data.control_end:
        raise HTTPException(status_code=400, detail="Data de início do controle deve ser anterior ou igual à data de fim.")
    if input_data.treatment_start > input_data.treatment_end:
        raise HTTPException(status_code=400, detail="Data de início do tratamento deve ser anterior ou igual à data de fim.")
    if max(input_data.control_start, input_data.treatment_start) <= min(input_data.control_end, input_data.treatment_end):
        raise HTTPException(status_code=400, detail="Períodos de controle e tratamento não podem se sobrepor.")

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Busca métricas diárias no banco para o período de controle e tratamento
    c_start_str = input_data.control_start.isoformat()
    c_end_str = input_data.control_end.isoformat()
    t_start_str = input_data.treatment_start.isoformat()
    t_end_str = input_data.treatment_end.isoformat()

    control_vals, treatment_vals, counts = _observations(repo, {'control_start': c_start_str, 'control_end': c_end_str,
        'treatment_start': t_start_str, 'treatment_end': t_end_str, 'metric_key': input_data.metric_key})

    stats_res = analyze_n_of_1(control_vals, treatment_vals)

    insufficient = len(control_vals) < 3 or len(treatment_vals) < 3
    if insufficient and not input_data.save_incomplete:
        return {
            "status": "insufficient_data",
            "id": None,
            "saved": False,
            "message": "Amostras insuficientes (< 3 observações por período). O experimento não foi salvo.",
            "stats": stats_res,
        }

    data = input_data.model_dump()
    if input_data.adherence or input_data.simultaneous_changes:
        data['notes'] = 'n_of_1_details_v1:' + json.dumps({'notes': input_data.notes, 'adherence': input_data.adherence,
            'simultaneous_changes': input_data.simultaneous_changes}, ensure_ascii=False)
    data.update({
        "control_start": c_start_str,
        "control_end": c_end_str,
        "treatment_start": t_start_str,
        "treatment_end": t_end_str,
        "control_mean": None if insufficient else stats_res["control_mean"],
        "treatment_mean": None if insufficient else stats_res["treatment_mean"],
        "cohens_d": None if insufficient else stats_res["cohens_d"],
        "p_value": None if insufficient else stats_res["p_value"],
        "statistically_significant": None if insufficient else int(stats_res["statistically_significant"]),
    })

    exp_id = repo.add_n_of_1_experiment(data)
    return {"status": "insufficient_data" if insufficient else "ok", "id": exp_id, "saved": True,
            "stats": None if insufficient else stats_res, **counts}
