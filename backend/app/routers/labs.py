import csv
import io
from fastapi import APIRouter, Response, Query, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ingestion.lab_parser import ingest_lab_records, OPTIMAL_LONGEVITY_TARGETS
from longevidade.ingestion.lab_normalization import LAB_MARKER_LABELS, normalize_lab_key
from longevidade.lab_provenance import PATIENT_LAB_ORIGIN
from longevidade.reports.lab_reference import lab_reference_status

router = APIRouter(prefix="/api/labs", tags=["Labs"])


@router.post('/preview')
async def preview_lab_document(response: Response, file: UploadFile = File(...)):
    """Lê um laudo localmente, sem persistir resultados ou documentos."""
    import json
    import subprocess
    import sys
    from starlette.concurrency import run_in_threadpool

    response.headers['Cache-Control'] = 'no-store'
    payload = await file.read(16 * 1024 * 1024 + 1)
    await file.close()
    if not payload or len(payload) > 16 * 1024 * 1024:
        raise HTTPException(413, 'Arquivo vazio ou acima do limite de 16 MB.')
    if not (payload.startswith(b'%PDF-') or payload.startswith(b'\x89PNG\r\n\x1a\n') or payload.startswith(b'\xff\xd8\xff')):
        raise HTTPException(422, 'Envie um PDF, PNG ou JPEG válido.')
    try:
        result = await run_in_threadpool(subprocess.run, [sys.executable, '-m', 'longevidade.ingestion.lab_preview_worker'],
                                         input=payload, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                         timeout=60, check=False)
        data = json.loads(result.stdout.decode('utf-8'))
    except (OSError, subprocess.TimeoutExpired, ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(503, 'Não foi possível processar o arquivo localmente.') from exc
    if result.returncode or 'error' in data:
        raise HTTPException(422, 'Arquivo inválido ou não suportado para prévia.')
    return data

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


class ConfirmLabInput(BatchLabInput):
    confirmed: bool = False
    allow_duplicates: bool = False


@router.post('/validate-preview')
def validate_lab_preview(batch: BatchLabInput, response: Response):
    """Valida uma prévia editada e identifica duplicatas sem gravar no banco."""
    from datetime import date
    from math import isfinite
    from longevidade.ingestion.lab_normalization import parse_numeric_or_censored
    from longevidade.metrics.unit_conversion import normalize_clinical_inputs, validate_clinical_unit

    response.headers['Cache-Control'] = 'no-store'
    if not batch.records or len(batch.records) > 500:
        raise HTTPException(422, 'Informe de 1 a 500 resultados.')
    repo = LongevityRepository(get_db_path())
    try:
        existing = {(str(row['collected_at'])[:10], normalize_lab_key(row['metric_key']))
                    for row in repo.get_lab_results(limit=100000)}
    except FileNotFoundError:
        existing = set()
    seen = set()
    items = []
    for item in batch.records:
        record = item.model_dump()
        key = normalize_lab_key(record['metric_key'])
        identity = (record['collected_at'], key)
        duplicate = identity in existing or identity in seen
        seen.add(identity)
        result = {'metric_key': key, 'duplicate': duplicate, 'normalized_value': None,
                  'normalized_unit': None, 'error': None}
        try:
            date.fromisoformat(record['collected_at'])
            if not key:
                raise ValueError('Informe a chave do marcador.')
            if any(value is not None and not isfinite(value) for value in (record['ref_min'], record['ref_max'])):
                raise ValueError('Referência inválida.')
            if record['ref_min'] is not None and record['ref_max'] is not None and record['ref_min'] > record['ref_max']:
                raise ValueError('Referência mínima maior que a máxima.')
            raw = record['raw_value'] if record['raw_value'] is not None else record['value']
            value, censored, _, _ = parse_numeric_or_censored(raw)
            unit = record['raw_unit'] or record['unit']
            if censored or value is None or not isfinite(value) or not unit:
                raise ValueError('Informe valor exato e unidade original.')
            validate_clinical_unit(key, unit)
            normalized = normalize_clinical_inputs({key: {'value': value, 'unit': unit}})
            observation = next(iter(normalized.values()), None)
            result['normalized_value'] = observation.value if observation else value
            result['normalized_unit'] = observation.canonical_unit if observation else unit
        except ValueError as exc:
            result['error'] = str(exc)
        items.append(result)
    return {'records': items, 'notice': 'Confira os dados no laudo antes de confirmar.'}


@router.post('/confirm')
def confirm_reviewed_labs(batch: ConfirmLabInput, response: Response):
    """Confirma revisão explícita após backup e salva todo o lote em transação."""
    from datetime import date, datetime
    from math import isfinite
    from longevidade.backup import create_backup, verify_backup
    from longevidade.ingestion.lab_normalization import parse_numeric_or_censored
    from longevidade.sync_lock import file_sync_lock, SyncLockTimeoutError

    response.headers['Cache-Control'] = 'no-store'
    if not batch.confirmed or not batch.records or len(batch.records) > 500:
        raise HTTPException(422, 'Confirme a revisão e informe de 1 a 500 resultados.')
    records = [item.model_dump() for item in batch.records]
    for record in records:
        try:
            date.fromisoformat(record['collected_at'])
        except ValueError as exc:
            raise HTTPException(422, 'Data de coleta inválida.') from exc
        raw = record['raw_value'] if record['raw_value'] is not None else record['value']
        if not normalize_lab_key(record['metric_key']):
            raise HTTPException(422, 'Informe a chave do marcador.')
        if any(value is not None and not isfinite(value) for value in (record['ref_min'], record['ref_max'])):
            raise HTTPException(422, 'Referência inválida.')
        if record['ref_min'] is not None and record['ref_max'] is not None and record['ref_min'] > record['ref_max']:
            raise HTTPException(422, 'Referência mínima maior que a máxima.')
        numeric, censored, _, _ = parse_numeric_or_censored(raw)
        if censored or numeric is None or not isfinite(numeric) or not isfinite(record['value']):
            raise HTTPException(422, 'Resultados com limites ou valores inválidos não podem ser salvos como valores exatos.')
        if not (record['raw_unit'] or record['unit']):
            raise HTTPException(422, f"{normalize_lab_key(record['metric_key'])}: informe a unidade original do resultado.")
        if (record['raw_unit'] or record['unit']) == record['unit'] and numeric != record['value']:
            raise HTTPException(422, 'Valor informado diverge do valor original na mesma unidade.')

    db_path = get_db_path()
    if not db_path.is_file():
        raise HTTPException(503, 'Banco de dados indisponível.')
    repo = LongevityRepository(db_path)
    try:
        with file_sync_lock(lock_path=db_path.parent / 'sync.lock', timeout_seconds=0.1):
            with repo._get_connection() as conn:
                conn.execute('BEGIN IMMEDIATE')
                existing = {(str(row['collected_at'])[:10], normalize_lab_key(row['metric_key']))
                            for row in conn.execute('SELECT collected_at, metric_key FROM lab_results')}
                seen = set()
                duplicates = []
                for record in records:
                    key = (record['collected_at'], normalize_lab_key(record['metric_key']))
                    if key in existing or key in seen:
                        duplicates.append({'collected_at': key[0], 'metric_key': key[1]})
                    seen.add(key)
                if duplicates and not batch.allow_duplicates:
                    raise HTTPException(409, detail={'message': 'Possíveis duplicatas; revise antes de confirmar.', 'duplicates': duplicates})
                stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                backup = db_path.parent / 'backups' / f'longevity_backup_{stamp}.zip'
                create_backup(db_path, backup, notes='Backup anterior à importação de exames revisada')
                verify_backup(backup)
                try:
                    result = ingest_lab_records(records, repo, chronological_age=batch.chronological_age,
                                                record_origin=PATIENT_LAB_ORIGIN, connection=conn)
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise
                return result
    except SyncLockTimeoutError as exc:
        raise HTTPException(409, 'Outra sincronização está em andamento.') from exc
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, 'Não foi possível criar ou verificar o backup ou salvar o lote.') from exc

class DeleteLabByDateInput(BaseModel):
    collected_at: str

@router.get("", response_model=List[Dict[str, Any]])
def get_labs():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return [{**row, "reference_status": lab_reference_status(row)} for row in repo.get_lab_results()]
    except FileNotFoundError:
        return []

@router.get("/latest", response_model=Dict[str, Dict[str, Any]])
def get_latest_labs():
    db_path = get_db_path()
    try:
        repo = LongevityRepository(db_path)
        return {key: {**row, "reference_status": lab_reference_status(row)} for key, row in repo.get_latest_labs_by_key().items()}
    except FileNotFoundError:
        return {}

@router.get("/targets")
def get_optimal_targets():
    return OPTIMAL_LONGEVITY_TARGETS

@router.post("/batch")
def add_batch_labs(batch: BatchLabInput, response: Response):
    # Preserva o contrato da integração existente e protege a gravação com backup e transação.
    return confirm_reviewed_labs(ConfirmLabInput(**batch.model_dump(), confirmed=True, allow_duplicates=True), response)

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
        ref_min = row.get("ref_min")
        ref_max = row.get("ref_max")
        optimal = row.get("optimal_target")

        # Classificação clínica básica para a planilha
        status = {"in_clinical_range": "Na referência", "out_of_range": "Fora da referência",
                  "no_reference": "Sem classificação", "noncanonical_unit": "Unidade não normalizada; sem classificação",
                  "not_eligible": "Origem não verificada"}[lab_reference_status(row)]

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
            "unidade": _clean_str(row.get("unit")),
            "ref_minima": ref_min if ref_min is not None else "",
            "ref_maxima": ref_max if ref_max is not None else "",
            "meta_otima": optimal if optimal is not None else "",
            "status_clinico": status,
            "origem": origin_label,
            "observacoes": _clean_str(row.get("notes")),
            "valor_bruto": row.get("raw_value") if row.get("raw_value") is not None else "",
            "unidade_bruta": _clean_str(row.get("raw_unit")),
            "origem_registro": raw_origin,
            "criado_em": _clean_str(row.get("created_at")),
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
        "Meta histórica (não validada)",
        "Status Clínico",
        "Origem",
        "Observações",
        "Valor Bruto",
        "Unidade Bruta",
        "Origem Registrada",
        "Criado Em",
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
            r["valor_bruto"],
            r["unidade_bruta"],
            r["origem_registro"],
            r["criado_em"],
        ])

    csv_data = output.getvalue()
    filename_date = target_date if target_date else "historico_completo"
    filename = f"exames_longevidade_{filename_date}.csv"

    return Response(
        content=csv_data.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
