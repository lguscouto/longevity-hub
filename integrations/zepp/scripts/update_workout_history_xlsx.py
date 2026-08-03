#!/usr/bin/env python3
"""Build an idempotent Excel history from the Zepp workout export.

The script does not call the Zepp API. It consumes data/workout_history.json,
which must have been refreshed first by fetch_zepp_data.py / zepp_cron.py.
It rebuilds the workbook atomically from the authoritative Zepp export so
reruns never duplicate activities and API-side corrections are propagated.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
import zipfile
from collections import Counter
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = BASE_DIR / "data" / "workout_history.json"
DEFAULT_OUTPUT = Path(
    os.environ.get(
        "ZEPP_WORKOUT_XLSX",
        str(BASE_DIR.parent / "historico_treinos_zepp.xlsx"),
    )
)
LOCAL_TIMEZONE = ZoneInfo("America/Sao_Paulo")

TYPE_NAMES: dict[int, str] = {
    1: "Corrida",
    6: "Caminhada",
    8: "Esteira",
    9: "Ciclismo",
    10: "Ciclismo Indoor",
    12: "Natação",
    16: "Elíptico",
    40: "Outro",
    52: "Treino Força",
    54: "Alongamento",
}

CATEGORY_COLORS = {
    "Corrida": "DCE6F1",
    "Ciclismo": "E2EFDA",
    "Treino Força": "FCE4D6",
    "Outros": "F2F2F2",
}

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
TITLE_FONT = Font(name="Arial", size=14, bold=True, color="1F4E79")
BOLD_FONT = Font(name="Arial", size=10, bold=True)
NORMAL_FONT = Font(name="Arial", size=10)
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")
THIN_BORDER = Border(
    left=Side(style="thin", color="D9E2F3"),
    right=Side(style="thin", color="D9E2F3"),
    top=Side(style="thin", color="D9E2F3"),
    bottom=Side(style="thin", color="D9E2F3"),
)

HEADERS = [
    "Data",
    "Hora",
    "Categoria",
    "Tipo",
    "Duração (min)",
    "Calorias",
    "Distância (km)",
    "FC Média",
    "FC Máx",
    "TE (carga)",
    "Passos",
    "Cidade",
    "Dispositivo",
    "ID Zepp",
]


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _integer(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _category(activity_type: int) -> str:
    if activity_type in (1, 8):
        return "Corrida"
    if activity_type in (9, 10):
        return "Ciclismo"
    if activity_type == 52:
        return "Treino Força"
    return "Outros"


def _parse_workouts(source: Path) -> list[dict[str, Any]]:
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"não foi possível ler o export do Zepp: {source}") from exc

    summaries = ((payload.get("data") or {}).get("summary") or [])
    if not isinstance(summaries, list):
        raise RuntimeError("workout_history.json não contém data.summary como lista")

    activities: dict[str, dict[str, Any]] = {}
    for item in summaries:
        if not isinstance(item, dict):
            continue
        track_id = str(item.get("trackid", "")).strip()
        timestamp = _integer(track_id)
        if not track_id or timestamp <= 0:
            continue

        local_dt = datetime.fromtimestamp(timestamp, timezone.utc).astimezone(LOCAL_TIMEZONE)
        activity_type = _integer(item.get("type"))
        distance_m = _number(item.get("dis"))
        source_name = str(item.get("source", "")).replace(".huami.com", "")
        source_name = source_name.replace("run.", "")
        activities[track_id] = {
            "Data": local_dt.date(),
            "Hora": local_dt.time().replace(second=0, microsecond=0),
            "Categoria": _category(activity_type),
            "Tipo": TYPE_NAMES.get(activity_type, f"Tipo Zepp {activity_type}"),
            "Duração (min)": round(_number(item.get("run_time")) / 60, 1),
            "Calorias": round(_number(item.get("calorie"))),
            "Distância (km)": round(distance_m / 1000, 2) if distance_m > 0 else 0,
            "FC Média": round(_number(item.get("avg_heart_rate"))) or None,
            "FC Máx": _integer(item.get("max_heart_rate")) or None,
            "TE (carga)": _integer(item.get("te")) or None,
            "Passos": _integer(item.get("total_step")) or None,
            "Cidade": str(item.get("city") or ""),
            "Dispositivo": source_name,
            "ID Zepp": track_id,
        }

    return sorted(activities.values(), key=lambda activity: (activity["Data"], activity["Hora"], activity["ID Zepp"]), reverse=True)


def _existing_activities(workbook_path: Path) -> dict[str, dict[str, Any]]:
    """Read the workbook itself as the durable archive of previously seen IDs."""
    if not workbook_path.is_file():
        return {}
    try:
        workbook = load_workbook(workbook_path, read_only=True, data_only=True)
        if "Histórico de Treinos" not in workbook.sheetnames:
            return {}
        sheet = workbook["Histórico de Treinos"]
        headers = [cell.value for cell in next(sheet.iter_rows(min_row=1, max_row=1))]
        if any(header not in headers for header in HEADERS):
            return {}
        index = {header: headers.index(header) for header in HEADERS}
        archive: dict[str, dict[str, Any]] = {}
        for row in sheet.iter_rows(min_row=2, values_only=True):
            track_id = str(row[index["ID Zepp"]] or "").strip()
            activity_date = row[index["Data"]]
            activity_time = row[index["Hora"]]
            if not track_id or not isinstance(activity_date, (datetime, date)):
                continue
            archive[track_id] = {
                "Data": activity_date.date() if isinstance(activity_date, datetime) else activity_date,
                "Hora": activity_time.time().replace(second=0, microsecond=0) if isinstance(activity_time, datetime) else activity_time if isinstance(activity_time, time) else time.min,
                "Categoria": str(row[index["Categoria"]] or "Outros"),
                "Tipo": str(row[index["Tipo"]] or ""),
                "Duração (min)": _number(row[index["Duração (min)"]]),
                "Calorias": round(_number(row[index["Calorias"]])),
                "Distância (km)": _number(row[index["Distância (km)"]]),
                "FC Média": _integer(row[index["FC Média"]]) or None,
                "FC Máx": _integer(row[index["FC Máx"]]) or None,
                "TE (carga)": _integer(row[index["TE (carga)"]]) or None,
                "Passos": _integer(row[index["Passos"]]) or None,
                "Cidade": str(row[index["Cidade"]] or ""),
                "Dispositivo": str(row[index["Dispositivo"]] or ""),
                "ID Zepp": track_id,
            }
        workbook.close()
        return archive
    except Exception:
        return {}


def _write_header(sheet, headers: list[str]) -> None:
    for column, header in enumerate(headers, 1):
        cell = sheet.cell(row=1, column=column, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = CENTER
        cell.border = THIN_BORDER
    sheet.row_dimensions[1].height = 28


def _write_history_sheet(workbook: Workbook, activities: list[dict[str, Any]]) -> None:
    sheet = workbook.active
    sheet.title = "Histórico de Treinos"
    _write_header(sheet, HEADERS)

    for row_number, activity in enumerate(activities, 2):
        category_fill = PatternFill("solid", fgColor=CATEGORY_COLORS[activity["Categoria"]])
        for column, header in enumerate(HEADERS, 1):
            cell = sheet.cell(row=row_number, column=column, value=activity[header])
            cell.font = BOLD_FONT if header == "Categoria" else NORMAL_FONT
            cell.alignment = CENTER if column <= 11 else LEFT
            cell.border = THIN_BORDER
            if header == "Categoria":
                cell.fill = category_fill
            if header == "Data":
                cell.number_format = "dd/mm/yyyy"
            elif header == "Hora":
                cell.number_format = "hh:mm"
            elif header == "Duração (min)":
                cell.number_format = "0.0"
            elif header == "Distância (km)":
                cell.number_format = "0.00"
            elif header in {"Calorias", "FC Média", "FC Máx", "TE (carga)", "Passos"}:
                cell.number_format = "#,##0"

    if activities:
        table = Table(displayName="HistoricoTreinos", ref=f"A1:N{len(activities) + 1}")
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2", showFirstColumn=False, showLastColumn=False,
            showRowStripes=False, showColumnStripes=False,
        )
        sheet.add_table(table)

    widths = [13, 9, 18, 20, 14, 12, 15, 11, 10, 12, 12, 22, 23, 15]
    for column, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(column)].width = width
    sheet.column_dimensions["N"].hidden = True
    sheet.freeze_panes = "A2"


def _write_summary_sheet(workbook: Workbook, activities: list[dict[str, Any]], source_hash: str) -> None:
    sheet = workbook.create_sheet("Resumo")
    sheet.merge_cells("A1:D1")
    title = sheet["A1"]
    title.value = "RESUMO DE ATIVIDADES ZEPP"
    title.font = TITLE_FONT

    dates = [activity["Data"] for activity in activities]
    sheet["A3"] = "Total de atividades:"
    sheet["A4"] = "Período:"
    sheet["B3"] = len(activities)
    sheet["B4"] = f"{min(dates).strftime('%d/%m/%Y')} a {max(dates).strftime('%d/%m/%Y')}" if dates else "Sem dados"
    for address in ("A3", "A4"):
        sheet[address].font = BOLD_FONT
    sheet["B3"].font = Font(name="Arial", size=12, bold=True)

    summary_headers = ["Categoria", "Atividades", "Minutos", "Calorias"]
    start_row = 7
    sheet.cell(start_row, 1, "Por Categoria").font = Font(name="Arial", size=11, bold=True, color="1F4E79")
    for column, header in enumerate(summary_headers, 1):
        cell = sheet.cell(start_row + 1, column, header)
        cell.font = BOLD_FONT
        cell.fill = PatternFill("solid", fgColor="D9EAF7")
        cell.alignment = CENTER
        cell.border = THIN_BORDER

    categories = ["Corrida", "Ciclismo", "Treino Força", "Outros"]
    for row_number, category in enumerate(categories, start_row + 2):
        matching = [activity for activity in activities if activity["Categoria"] == category]
        values = [
            category,
            len(matching),
            round(sum(activity["Duração (min)"] for activity in matching)),
            round(sum(activity["Calorias"] for activity in matching)),
        ]
        for column, value in enumerate(values, 1):
            cell = sheet.cell(row_number, column, value)
            cell.font = BOLD_FONT if column == 1 else NORMAL_FONT
            cell.alignment = LEFT if column == 1 else CENTER
            cell.border = THIN_BORDER
            if column == 1:
                cell.fill = PatternFill("solid", fgColor=CATEGORY_COLORS[category])

    type_start = start_row + len(categories) + 5
    sheet.cell(type_start, 1, "Por Tipo de Exercício").font = Font(name="Arial", size=11, bold=True, color="1F4E79")
    for column, header in enumerate(["Tipo", "Atividades", "Minutos", "Calorias"], 1):
        cell = sheet.cell(type_start + 1, column, header)
        cell.font = BOLD_FONT
        cell.fill = PatternFill("solid", fgColor="D9EAF7")
        cell.alignment = CENTER
        cell.border = THIN_BORDER

    types = sorted({activity["Tipo"] for activity in activities})
    for row_number, activity_type in enumerate(types, type_start + 2):
        matching = [activity for activity in activities if activity["Tipo"] == activity_type]
        values = [
            activity_type,
            len(matching),
            round(sum(activity["Duração (min)"] for activity in matching)),
            round(sum(activity["Calorias"] for activity in matching)),
        ]
        for column, value in enumerate(values, 1):
            cell = sheet.cell(row_number, column, value)
            cell.font = BOLD_FONT if column == 1 else NORMAL_FONT
            cell.alignment = LEFT if column == 1 else CENTER
            cell.border = THIN_BORDER

    source_row = type_start + len(types) + 4
    sheet.cell(source_row, 1, "Fonte:").font = BOLD_FONT
    sheet.cell(source_row, 2, "Zepp API — data/workout_history.json")
    sheet.cell(source_row + 1, 1, "Atualizado em:").font = BOLD_FONT
    sheet.cell(source_row + 1, 2, datetime.now(LOCAL_TIMEZONE).strftime("%d/%m/%Y %H:%M BRT"))
    sheet.cell(source_row + 2, 1, "Hash da fonte:").font = BOLD_FONT
    sheet.cell(source_row + 2, 2, source_hash)
    sheet.column_dimensions["A"].width = 24
    sheet.column_dimensions["B"].width = 42
    sheet.column_dimensions["C"].width = 14
    sheet.column_dimensions["D"].width = 15


def _atomic_save(workbook: Workbook, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary_name = tempfile.mkstemp(prefix=f".{output.stem}-", suffix=".xlsx", dir=output.parent)
    os.close(file_descriptor)
    temporary = Path(temporary_name)
    try:
        workbook.save(temporary)
        # Validate the written archive before replacing the current workbook.
        check = load_workbook(temporary, read_only=True, data_only=False)
        if {"Histórico de Treinos", "Resumo"} - set(check.sheetnames):
            raise RuntimeError("validação da planilha temporária falhou")
        check.close()
        os.replace(temporary, output)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _has_legacy_worksheet_filter(workbook_path: Path) -> bool:
    """The table owns its filter; old files also had a duplicate sheet filter."""
    if not workbook_path.is_file():
        return False
    try:
        with zipfile.ZipFile(workbook_path) as archive:
            worksheet_xml = archive.read("xl/worksheets/sheet1.xml")
        return b"<autoFilter" in worksheet_xml
    except (OSError, KeyError, zipfile.BadZipFile):
        return True


def update_workbook(
    source: Path,
    output: Path,
    *,
    seed_sources: tuple[Path, ...] = (),
    force: bool = False,
) -> dict[str, Any]:
    """Merge the latest Zepp page into the workbook's durable ID archive."""
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    existing = _existing_activities(output)
    current = {activity["ID Zepp"]: activity for activity in _parse_workouts(source)}
    recovered: dict[str, dict[str, Any]] = {}
    for seed_source in seed_sources:
        recovered.update({activity["ID Zepp"]: activity for activity in _parse_workouts(seed_source)})

    new_ids = set(current) - set(existing)
    recovered_ids = set(recovered) - set(existing)
    synchronized = bool(existing) and not new_ids and not recovered_ids and not _has_legacy_worksheet_filter(output)
    if synchronized and not force:
        return {
            "status": "unchanged",
            "activities_total": len(existing),
            "activities_new": 0,
            "output": str(output),
        }

    merged = existing.copy()
    merged.update(recovered)
    merged.update(current)  # The current API export is authoritative when IDs overlap.
    activities = sorted(
        merged.values(),
        key=lambda activity: (activity["Data"], activity["Hora"], activity["ID Zepp"]),
        reverse=True,
    )

    workbook = Workbook()
    _write_history_sheet(workbook, activities)
    _write_summary_sheet(workbook, activities, source_hash)
    _atomic_save(workbook, output)
    return {
        "status": "updated",
        "activities_total": len(activities),
        "activities_new": len(new_ids),
        "activities_recovered": len(recovered_ids),
        "reindexed": not bool(existing),
        "output": str(output),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Atualiza a planilha de atividades do Zepp.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--seed-source", type=Path, action="append", default=[],
        help="Export Zepp histórico adicional para recuperar atividades fora da página atual da API.",
    )
    parser.add_argument("--force", action="store_true", help="Recria a planilha mesmo sem novas atividades.")
    args = parser.parse_args()

    missing_sources = [path for path in [args.source, *args.seed_source] if not path.is_file()]
    if missing_sources:
        print(json.dumps({"status": "error", "error": f"fonte ausente: {missing_sources[0]}"}, ensure_ascii=False))
        return 1

    try:
        result = update_workbook(
            args.source, args.output, seed_sources=tuple(args.seed_source), force=args.force,
        )
    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 1

    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
