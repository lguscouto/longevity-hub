from fastapi import APIRouter, UploadFile, File, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import csv
import io
from datetime import datetime

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.algorithms.cgm_metrics import calculate_cgm_summary

router = APIRouter(prefix="/api/cgm", tags=["CGM"])

class CGMDailyBatchInput(BaseModel):
    date_ref: str
    glucose_readings: List[float]

@router.get("/summary", response_model=List[Dict[str, Any]])
def get_cgm_summaries():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_cgm_summaries()

@router.post("/batch")
def add_cgm_batch(input_data: CGMDailyBatchInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    stats = calculate_cgm_summary(input_data.glucose_readings)
    stats["date_ref"] = input_data.date_ref
    repo.add_cgm_summary(stats)
    return {"status": "ok", "summary": stats}

@router.post("/upload-csv")
async def upload_cgm_csv(file: UploadFile = File(...)):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")
    
    # Suporta separador vírgula ou ponto-e-vírgula (FreeStyle Libre costuma usar ;)
    delimiter = ";" if ";" in text[:500] else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    
    daily_readings: Dict[str, List[float]] = {}
    rows_processed = 0

    for row in reader:
        if not row or len(row) < 3:
            continue
        # Procura coluna de data e valor de glicose
        date_str = None
        val_float = None

        for item in row:
            item_str = item.strip()
            # Tenta extrair data YYYY-MM-DD ou DD/MM/YYYY
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
            
            # Tenta extrair valor numérico de glicose (ex: 85-250)
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
    for dt_str, readings in daily_readings.items():
        if len(readings) >= 3:
            stats = calculate_cgm_summary(readings)
            stats["date_ref"] = dt_str
            repo.add_cgm_summary(stats)
            summaries_added += 1

    return {
        "status": "ok",
        "rows_processed": rows_processed,
        "days_imported": summaries_added,
        "message": f"Sucesso: {summaries_added} dias de leitura CGM importados!"
    }

@router.get("/export-csv")
def export_cgm_csv():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
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
            s.get("total_readings")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cgm_longevidade_export.csv"}
    )
