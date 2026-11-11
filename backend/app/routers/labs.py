import csv
import io
from fastapi import APIRouter, Response, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.lab_parser import ingest_lab_records, OPTIMAL_LONGEVITY_TARGETS
from longevidade.ingestion.lab_normalization import LAB_MARKER_LABELS, normalize_lab_key
from longevidade.lab_provenance import PATIENT_LAB_ORIGIN

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
    raw_value: Optional[Any] = None
    raw_unit: Optional[str] = None

class BatchLabInput(BaseModel):
    chronological_age: Optional[float] = None
    records: List[LabRecordInput]

class DeleteLabByDateInput(BaseModel):
    collected_at: str

@router.get("", response_model=List[Dict[str, Any]])
def get_labs():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return repo.get_lab_results()
    except FileNotFoundError:
        return []

@router.get("/latest", response_model=Dict[str, Dict[str, Any]])
def get_latest_labs():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return repo.get_latest_labs_by_key()
    except FileNotFoundError:
        return {}

@router.get("/targets")
def get_optimal_targets():
    return OPTIMAL_LONGEVITY_TARGETS

@router.post("/batch")
def add_batch_labs(batch: BatchLabInput):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    recs = [r.model_dump() for r in batch.records]
    try:
        result = ingest_lab_records(
            recs,
            repo,
            chronological_age=batch.chronological_age,
            record_origin=PATIENT_LAB_ORIGIN,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return result

@router.delete("/date/{collected_at}")
def delete_labs_by_date(collected_at: str):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    deleted_count = repo.delete_lab_results_by_date(collected_at)
    return {"status": "ok", "deleted": deleted_count, "message": f"Removidos {deleted_count} registros do laudo de {collected_at}"}

@router.post("/delete")
def delete_labs_by_date_post(input_data: DeleteLabByDateInput):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    deleted_count = repo.delete_lab_results_by_date(input_data.collected_at)
    return {"status": "ok", "deleted": deleted_count, "message": f"Removidos {deleted_count} registros do laudo de {input_data.collected_at}"}


@router.get("/export")
def export_labs(
    target_date: Optional[str] = Query(None, alias="date"),
    export_format: str = Query("csv", alias="format", pattern="^(csv|json)$"),
):
    """Exporta exames laboratoriais em formato CSV estruturado ou JSON.

    Permite filtrar por data específica ou exportar todo o histórico.
    O CSV utiliza delimitador ';' e BOM UTF-8 para abertura direta perfeita no Excel/Google Sheets.
    """
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        labs = repo.get_lab_results(limit=10000, collected_at=target_date)
    except FileNotFoundError:
        labs = []

    def _clean_str(val: Any) -> str:
        if val is None:
            return ""
        return str(val).strip()

    enriched_records = []
    for row in labs:
        key = row.get("metric_key", "")
        norm_key = normalize_lab_key(key)
        target = OPTIMAL_LONGEVITY_TARGETS.get(key) or OPTIMAL_LONGEVITY_TARGETS.get(norm_key) or {}
        name = row.get("metric_name") or LAB_MARKER_LABELS.get(key) or target.get("name") or key
        category = row.get("category") or target.get("category") or "Outros"
        val = row.get("value")
        ref_min = row.get("ref_min") if row.get("ref_min") is not None else target.get("ref_min")
        ref_max = row.get("ref_max") if row.get("ref_max") is not None else target.get("ref_max")
        optimal = row.get("optimal_target") if row.get("optimal_target") is not None else target.get("optimal")

        # Classificação clínica básica para a planilha
        status = "Registrado"
        if val is not None and isinstance(val, (int, float)):
            if ref_min is not None and ref_max is not None:
                if val < ref_min or val > ref_max:
                    status = "Atenção clínica"
                elif optimal is not None and abs(val - optimal) / max(1.0, optimal) < 0.15:
                    status = "Ótimo"
                else:
                    status = "Na referência"
            elif optimal is not None:
                status = "Ótimo" if abs(val - optimal) / max(1.0, optimal) < 0.15 else "Registrado"

        origin_label = "Exame do Paciente (Laudo)"
        raw_origin = row.get("record_origin") or ""
        if raw_origin == "unverified":
            origin_label = "Não verificado"
        elif raw_origin and raw_origin != "patient_lab":
            origin_label = raw_origin

        enriched_records.append({
            "data_coleta": _clean_str(row.get("collected_at")),
            "categoria": _clean_str(category),
            "exame": _clean_str(name),
            "chave_metrica": _clean_str(key),
            "resultado": val if val is not None else "",
            "unidade": _clean_str(row.get("unit") or target.get("unit")),
            "ref_minima": ref_min if ref_min is not None else "",
            "ref_maxima": ref_max if ref_max is not None else "",
            "meta_otima": optimal if optimal is not None else "",
            "status_clinico": status,
            "origem": origin_label,
            "observacoes": _clean_str(row.get("notes")),
        })

    if export_format.lower() == "json":
        return {
            "total_records": len(enriched_records),
            "collected_at_filter": target_date,
            "records": enriched_records,
        }

    # Gerar CSV com delimitador ';' e BOM UTF-8
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    headers = [
        "Data Coleta",
        "Categoria",
        "Exame",
        "Chave Métrica",
        "Resultado",
        "Unidade",
        "Ref Mínima",
        "Ref Máxima",
        "Meta Ótima",
        "Status Clínico",
        "Origem",
        "Observações",
    ]
    writer.writerow(headers)

    for r in enriched_records:
        writer.writerow([
            r["data_coleta"],
            r["categoria"],
            r["exame"],
            r["chave_metrica"],
            r["resultado"],
            r["unidade"],
            r["ref_minima"],
            r["ref_maxima"],
            r["meta_otima"],
            r["status_clinico"],
            r["origem"],
            r["observacoes"],
        ])

    csv_data = output.getvalue()
    filename_date = target_date if target_date else "historico_completo"
    filename = f"exames_longevidade_{filename_date}.csv"

    return Response(
        content=csv_data.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
