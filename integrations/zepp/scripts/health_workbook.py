"""Create the idempotent Zepp health-tracking workbook schema."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
import os
import shutil
import tempfile

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT_DIR = Path(__file__).resolve().parent.parent
WORKBOOK_PATH = Path(
    os.environ.get(
        "ZEPP_WORKBOOK_PATH",
        str(ROOT_DIR / "acompanhamento" / "acompanhamento_saude.xlsx"),
    )
)
SHEET_NAME = "Acompanhamento"
HEADER_ROW = 8
FIRST_DATA_ROW = HEADER_ROW + 1
PROFILE = {
    "nome": "Gustavo Couto",
    "idade": 33,
    "altura_m": 1.70,
}

DAILY_HEADERS = [
    "Data referência",
    "Coletado em (America/Sao_Paulo)",
    "Passos",
    "Sono (h:mm)",
    "Peso (kg)",
    "Data da pesagem",
    "IMC",
    "FC repouso (bpm)",
    "FC média (bpm)",
    "HRV do sono (ms)",
    "HRV RMSSD médio (ms)",
    "Amostras HRV RMSSD",
    "RHR do sono (bpm)",
    "SpO₂ média (%)",
    "SpO₂ mínima (%)",
    "SpO₂ máxima (%)",
    "Amostras SpO₂",
    "ODI SpO₂",
    "Queda SpO₂ em OSA (%)",
    "Frequência respiratória (rpm)",
    "Pressão sistólica (mmHg)",
    "Pressão diastólica (mmHg)",
    "PAI",
    "Readiness",
    "Carga diária",
    "Carga acumulada",
    "Faixa ideal de carga (min)",
    "Faixa ideal de carga (max)",
    "Treinos Zepp (qtd.)",
    "Duração de treinos (min)",
    "Amostras de estresse",
    "Amostras de temperatura",
    "Temperatura (°C)",
    "Body Battery inicial",
    "Body Battery final",
    "VO2 máx",
    "Status dos dados",
]

_DARK_HEADER_FILL = PatternFill(fill_type="solid", fgColor="1F4E78")
_HEADER_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
_BODY_FONT = Font(name="Arial", size=10)
_TITLE_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")
_LABEL_FONT = Font(name="Arial", size=10, bold=True)


def ensure_workbook(
    workbook_path: str | Path, profile: Mapping[str, object] = PROFILE
) -> Path:
    """Create a health workbook when absent without altering an existing sheet."""
    path = Path(workbook_path)
    if path.exists() and path.is_dir():
        raise IsADirectoryError(f"Workbook path is a directory: {path}")

    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = SHEET_NAME
        _initialize_sheet(sheet, profile)
        workbook.save(path)
        workbook.close()
        return path

    workbook = load_workbook(path)
    if SHEET_NAME not in workbook.sheetnames:
        sheet = workbook.create_sheet(SHEET_NAME)
        _initialize_sheet(sheet, profile)
    else:
        _ensure_daily_columns(workbook[SHEET_NAME])
    workbook.save(path)
    workbook.close()

    return path


def _ensure_daily_columns(sheet) -> None:
    """Append new columns to existing production workbooks without deleting data."""
    existing = {
        sheet.cell(HEADER_ROW, column).value: column
        for column in range(1, sheet.max_column + 1)
        if sheet.cell(HEADER_ROW, column).value
    }
    last_column = max(existing.values(), default=0)
    for header in DAILY_HEADERS:
        column = existing.get(header)
        if column is None:
            last_column += 1
            column = last_column
            existing[header] = column
            cell = sheet.cell(HEADER_ROW, column)
            cell.value = header
            cell.font = _HEADER_FONT
            cell.fill = _DARK_HEADER_FILL
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            sheet.column_dimensions[get_column_letter(column)].width = _column_width(header)
    last_letter = get_column_letter(last_column)
    for merged in list(sheet.merged_cells.ranges):
        if merged.min_row == 1 and merged.max_row == 1:
            sheet.unmerge_cells(str(merged))
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_column)
    sheet.auto_filter.ref = f"A{HEADER_ROW}:{last_letter}{HEADER_ROW}"
    sheet.row_dimensions[HEADER_ROW].height = 32


def _initialize_sheet(sheet, profile: Mapping[str, object]) -> None:
    """Apply the schema only to a newly created tracking sheet."""
    title_end_column = len(DAILY_HEADERS)
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=title_end_column)
    title = sheet["A1"]
    title.value = "ACOMPANHAMENTO DE SAÚDE"
    title.font = _TITLE_FONT
    title.fill = _DARK_HEADER_FILL
    title.alignment = Alignment(horizontal="center", vertical="center")
    sheet.row_dimensions[1].height = 22

    profile_rows = (
        (3, "Nome", profile.get("nome", "")),
        (4, "Idade", profile.get("idade", "")),
        (5, "Altura (m)", profile.get("altura_m", "")),
    )
    for row, label, value in profile_rows:
        sheet.cell(row, 1).value = label
        sheet.cell(row, 1).font = _LABEL_FONT
        sheet.cell(row, 2).value = value
        sheet.cell(row, 2).font = _BODY_FONT

    sheet["B5"].number_format = "0.00"
    sheet["A6"] = "Peso mais recente (kg)"
    sheet["A6"].font = _LABEL_FONT
    sheet["B6"] = _latest_value_formula("Peso (kg)")
    sheet["B6"].font = _BODY_FONT
    sheet["B6"].number_format = "0.0"
    sheet["C6"] = "Data da pesagem"
    sheet["C6"].font = _LABEL_FONT
    sheet["D6"] = _latest_value_formula("Data da pesagem")
    sheet["D6"].font = _BODY_FONT
    sheet["D6"].number_format = "yyyy-mm-dd"

    for column, header in enumerate(DAILY_HEADERS, start=1):
        cell = sheet.cell(HEADER_ROW, column)
        cell.value = header
        cell.font = _HEADER_FONT
        cell.fill = _DARK_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        sheet.column_dimensions[get_column_letter(column)].width = _column_width(header)

    _apply_daily_number_formats(sheet)
    last_column = get_column_letter(len(DAILY_HEADERS))
    sheet.auto_filter.ref = f"A{HEADER_ROW}:{last_column}{HEADER_ROW}"
    sheet.freeze_panes = f"A{FIRST_DATA_ROW}"
    sheet.row_dimensions[HEADER_ROW].height = 32


def _latest_value_formula(header: str) -> str:
    column = get_column_letter(DAILY_HEADERS.index(header) + 1)
    return (
        f'=IFERROR(LOOKUP(2,1/(${column}${FIRST_DATA_ROW}:${column}$1048576<>""),'
        f'${column}${FIRST_DATA_ROW}:${column}$1048576),"")'
    )


def _apply_daily_number_formats(sheet) -> None:
    formats = {
        "Data referência": "yyyy-mm-dd",
        "Coletado em (America/Sao_Paulo)": "yyyy-mm-dd hh:mm",
        "Peso (kg)": "0.0",
        "Data da pesagem": "yyyy-mm-dd",
        "IMC": "0.0",
        "Duração de treinos (min)": "0",
        "Temperatura (°C)": "0.0",
        "VO2 máx": "0.0",
    }
    for column, header in enumerate(DAILY_HEADERS, start=1):
        cell = sheet.cell(FIRST_DATA_ROW, column)
        cell.font = _BODY_FONT
        if header in formats:
            cell.number_format = formats[header]
        elif header not in {"Sono (h:mm)", "Status dos dados"}:
            cell.number_format = "0"


def _column_width(header: str) -> float:
    return min(max(len(header) + 2, 12), 22)


_RECORD_KEYS_BY_HEADER = {
    "Data referência": "data_referencia",
    "Coletado em (America/Sao_Paulo)": "coletado_em",
    "Passos": "passos_zepp",
    "Sono (h:mm)": "sono_zepp_hhmm",
    "Peso (kg)": "peso_kg",
    "Data da pesagem": "data_pesagem",
    "IMC": "imc",
    "FC repouso (bpm)": "fc_repouso_bpm",
    "FC média (bpm)": "fc_media_bpm",
    "HRV do sono (ms)": "hrv_sono_ms",
    "HRV RMSSD médio (ms)": "hrv_rmssd_media_ms",
    "Amostras HRV RMSSD": "amostras_hrv_rmssd",
    "RHR do sono (bpm)": "rhr_sono_bpm",
    "SpO₂ média (%)": "spo2_media_pct",
    "SpO₂ mínima (%)": "spo2_min_pct",
    "SpO₂ máxima (%)": "spo2_max_pct",
    "Amostras SpO₂": "amostras_spo2",
    "ODI SpO₂": "spo2_odi_index",
    "Queda SpO₂ em OSA (%)": "spo2_osa_decrease_pct",
    "Frequência respiratória (rpm)": "frequencia_respiratoria_rpm",
    "Pressão sistólica (mmHg)": "pressao_sistolica_mmhg",
    "Pressão diastólica (mmHg)": "pressao_diastolica_mmhg",
    "PAI": "pai",
    "Readiness": "readiness",
    "Carga diária": "carga_diaria",
    "Carga acumulada": "carga_acumulada",
    "Faixa ideal de carga (min)": "faixa_carga_min",
    "Faixa ideal de carga (max)": "faixa_carga_max",
    "Treinos Zepp (qtd.)": "treinos_zepp_qtd",
    "Duração de treinos (min)": "duracao_treinos_min",
    "Amostras de estresse": "amostras_estresse",
    "Amostras de temperatura": "amostras_temperatura",
    "Temperatura (°C)": "temperatura_c",
    "Body Battery inicial": "body_battery_inicial",
    "Body Battery final": "body_battery_final",
    "VO2 máx": "vo2_max",
    "Status dos dados": "status_dados",
}


def _as_date_key(value: object) -> str:
    if hasattr(value, "isoformat"):
        return str(value.isoformat())[:10]
    return str(value)[:10]


def _format_minutes_hhmm(value: object) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        total_minutes = int(value)
    except (TypeError, ValueError):
        return None
    if total_minutes < 0:
        return None
    hours, minutes = divmod(total_minutes, 60)
    return f"{hours:02d}:{minutes:02d}"


def upsert_daily_record(workbook_path: str | Path, record: Mapping[str, object]) -> int:
    """Append or update exactly one daily health row, preserving history."""
    path = ensure_workbook(workbook_path)
    if not record.get("data_referencia"):
        raise ValueError("data_referencia is required")
    reference = _as_date_key(record["data_referencia"])
    workbook = load_workbook(path)
    sheet = workbook[SHEET_NAME]
    row = next((r for r in range(FIRST_DATA_ROW, sheet.max_row + 1)
                if sheet.cell(r, 1).value and _as_date_key(sheet.cell(r, 1).value) == reference), None)
    if row is None:
        row = FIRST_DATA_ROW if sheet.cell(FIRST_DATA_ROW, 1).value is None else sheet.max_row + 1
    values = dict(record)
    values.setdefault("coletado_em", datetime.now().astimezone().replace(tzinfo=None))
    values.setdefault("sono_zepp_hhmm", _format_minutes_hhmm(values.get("sono_zepp_min")))
    header_columns = {
        sheet.cell(HEADER_ROW, column).value: column
        for column in range(1, sheet.max_column + 1)
        if sheet.cell(HEADER_ROW, column).value
    }
    for header in DAILY_HEADERS:
        column = header_columns[header]
        key = _RECORD_KEYS_BY_HEADER[header]
        sheet.cell(row, column).value = values.get(key)
        sheet.cell(row, column).font = _BODY_FONT
    original = path.read_bytes() if path.exists() else b""
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".xlsx", delete=False) as temporary:
        temp_path = Path(temporary.name)
    try:
        workbook.save(temp_path)
        workbook.close()
        updated = temp_path.read_bytes()
        if updated != original and original:
            backups = path.parent / "backups"
            backups.mkdir(exist_ok=True)
            backup = backups / f"acompanhamento_saude-{datetime.now():%Y%m%d-%H%M%S}.xlsx"
            shutil.copy2(path, backup)
            for old in sorted(backups.glob("*.xlsx"))[:-7]:
                old.unlink()
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()
    return row
