from fastapi import APIRouter, UploadFile, File, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import csv
import io
from datetime import datetime

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.algorithms.cgm_metrics import calculate_cgm_summary

router = APIRouter(prefix="/api/cgm", tags=["CGM"])


class CGMDailyBatchInput(BaseModel):
    date_ref: str
    glucose_readings: List[float]


class CGMReadingInput(BaseModel):
    timestamp: str
    glucose_mgdl: float
    device_id: Optional[str] = "manual"


@router.get("/summary", response_model=List[Dict[str, Any]])
def get_cgm_summaries():
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_cgm_summaries()


@router.post("/batch")
def add_cgm_batch(input_data: CGMDailyBatchInput):
    """Recebe leituras do dia, salva brutas em cgm_readings e deriva o sumário."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Gera timestamps ISO 8601 (intervalos de 15 min começando 08:00)
    readings = []
    for i, val in enumerate(input_data.glucose_readings):
        horas = (8 + i // 4) % 24
        minutos = (i % 4) * 15
        readings.append({
            "timestamp": f"{input_data.date_ref}T{horas:02d}:{minutos:02d}:00",
            "glucose_mgdl": val,
            "device_id": "manual",
        })

    inserted = repo.batch_insert_cgm_readings(readings)
    stats = repo.recalculate_cgm_summary_from_readings(input_data.date_ref)

    return {
        "status": "ok",
        "summary": stats,
        "readings_received": len(readings),
        "readings_inserted": inserted,
    }


@router.post("/readings")
def add_cgm_reading(input_data: CGMReadingInput):
    """Recebe uma leitura CGM individual, salva bruta e atualiza o sumário diário."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    repo.batch_insert_cgm_readings([{
        "timestamp": input_data.timestamp,
        "glucose_mgdl": input_data.glucose_mgdl,
        "device_id": input_data.device_id,
    }])

    date_ref = input_data.timestamp[:10]
    stats = repo.recalculate_cgm_summary_from_readings(date_ref)

    return {"status": "ok", "summary": stats}


@router.post("/upload-csv")
async def upload_cgm_csv(file: UploadFile = File(...)):
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")

    # Suporta separador vírgula ou ponto-e-vírgula (FreeStyle Libre costuma usar ;)
    delimiter = ";" if ";" in text[:500] else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)

    # daily_readings: dict[date_str, list[float]]
    daily_readings: Dict[str, List[float]] = {}
    rows_processed = 0

    for row in reader:
        if not row or len(row) < 3:
            continue
        date_str = None
        val_float = None

        for item in row:
            item_str = item.strip()
            if not date_str:
                if len(item_str) >= 10 and ("-" in item_str or "/" in item_str):
                    try:
                        if "-" in item_str:
                            date_str = item_str[:10]
                        elif "/" in item_str:
                            parts = item_str[:10].split("/")
                            if len(parts) == 3 and len(parts[2]) == 4:
                                date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    except Exception:
                        pass

            try:
                val = float(item_str.replace(",", "."))
                if 40.0 <= val <= 400.0:
                    val_float = val
            except Exception:
                pass

        if date_str and val_float:
            if date_str not in daily_readings:
                daily_readings[date_str] = []
            daily_readings[date_str].append(val_float)
            rows_processed += 1

    summaries_added = 0
    raw_readings_inserted = 0
    for dt_str, readings in daily_readings.items():
        if len(readings) >= 3:
            # Salva leituras brutas com timestamps ISO 8601
            raw_readings = []
            for i, val in enumerate(readings):
                horas = (8 + i // 4) % 24
                minutos = (i % 4) * 15
                raw_readings.append({
                    "timestamp": f"{dt_str}T{horas:02d}:{minutos:02d}:00",
                    "glucose_mgdl": val,
                    "device_id": "csv_import",
                })
            inserted = repo.batch_insert_cgm_readings(raw_readings)
            raw_readings_inserted += inserted

            stats = repo.recalculate_cgm_summary_from_readings(dt_str)
            summaries_added += 1

    return {
        "status": "ok",
        "rows_processed": rows_processed,
        "days_imported": summaries_added,
        "raw_readings_inserted": raw_readings_inserted,
        "message": f"Sucesso: {summaries_added} dias de leitura CGM importados!",
    }


@router.get("/export-csv")
def export_cgm_csv():
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    summaries = repo.get_cgm_summaries()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Data Referência", "Glicemia Média (mg/dL)", "Desvio Padrão",
        "Variabilidade CV %", "Time in Range %", "Time Above Range %",
        "Time Below Range %", "Total de Leituras"
    ])

    for s in summaries:
        writer.writerow([
            s.get("date_ref"),
            s.get("mean_glucose"),
            s.get("glucose_sd"),
            s.get("cv_pct"),
            s.get("time_in_range_pct"),
            s.get("time_above_range_pct"),
            s.get("time_below_range_pct"),
            s.get("total_readings"),
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cgm_longevidade_export.csv"}
    )