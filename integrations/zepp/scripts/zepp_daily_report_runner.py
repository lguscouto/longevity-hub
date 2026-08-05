#!/usr/bin/env python3
"""
Zepp → Blueprint Pipeline Runner
1. Coleta dados do Zepp (peso, sono, passos, HRV, etc.)
2. Importa para o banco SQLite do Longevity Blueprint
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ZEPP_SCRIPT = BASE_DIR / "scripts" / "zepp_cron.py"
ZEPP_DATA_DIR = BASE_DIR / "data"
WORKOUT_XLSX_SCRIPT = BASE_DIR / "scripts" / "update_workout_history_xlsx.py"
LEGACY_LONGEVIDADE_DIR = Path("E:/projetos/longevidade")


def _candidate_longevidade_dirs() -> list[Path]:
    candidates: list[Path] = []
    for raw in (
        os.environ.get("LONGEVIDADE_DIR"),
        os.environ.get("ZEPP_BLUEPRINT_DIR"),
        str(BASE_DIR.parent / "longevidade"),
        str(LEGACY_LONGEVIDADE_DIR),
    ):
        if not raw:
            continue
        candidate = Path(raw).expanduser()
        if candidate not in candidates:
            candidates.append(candidate)
    return candidates


def resolve_longevidade_dir() -> Path:
    for candidate in _candidate_longevidade_dirs():
        if (candidate / "scripts" / "run_daily_pipeline.py").is_file():
            return candidate
    return _candidate_longevidade_dirs()[0]


def build_longevidade_command(longevidade_dir: Path, *args: str) -> list[str]:
    longevidade_python = longevidade_dir / ".venv" / "Scripts" / "python.exe"
    if longevidade_python.is_file():
        return [str(longevidade_python), *(str(arg) for arg in args)]
    uv = shutil.which("uv")
    if uv:
        return [uv, "run", "python", *(str(arg) for arg in args)]
    raise FileNotFoundError(
        f"Não encontrei nem {longevidade_python} nem o executável uv no PATH."
    )


def _python_has_zepp_dependencies(candidate: Path) -> bool:
    try:
        result = subprocess.run(
            [
                str(candidate),
                "-c",
                "import openpyxl, requests; from zoneinfo import ZoneInfo; ZoneInfo('America/Sao_Paulo')",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0


def resolve_zepp_python() -> Path:
    candidates: list[Path] = []
    configured = os.environ.get("ZEPP_PYTHON")
    if configured:
        candidates.append(Path(configured).expanduser())

    candidates.append(BASE_DIR / ".venv" / "Scripts" / "python.exe")
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        candidates.append(
            Path(local_app_data) / "Programs" / "Python" / "Python312" / "python.exe"
        )
    candidates.extend(
        [
            Path(r"C:/Python314/python.exe"),
            Path(sys.executable),
        ]
    )

    seen: set[Path] = set()
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_file() and _python_has_zepp_dependencies(candidate):
            return candidate

    raise FileNotFoundError(
        "Não encontrei um Python com as dependências do Zepp "
        "(openpyxl e requests). Configure ZEPP_PYTHON ou instale-as "
        "em um Python do projeto."
    )


def run_longevidade_pipeline(
    longevidade_dir: Path, blueprint_script: Path, db_path: Path
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)
    env.pop("PYTHONHOME", None)
    command = build_longevidade_command(
        longevidade_dir,
        str(blueprint_script),
        "--zepp-data-dir",
        str(ZEPP_DATA_DIR),
        "--db",
        str(db_path),
    )
    return subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=120,
        cwd=longevidade_dir,
        env=env,
    )


def print_weight_history() -> None:
    weight_path = ZEPP_DATA_DIR / "weight.json"
    if not weight_path.is_file():
        return
    try:
        payload = json.loads(weight_path.read_text(encoding="utf-8"))
        items = payload.get("items", [])
        if not items:
            return
        weights: list[tuple[int, float]] = []
        for item in items:
            ts = item.get("generatedTime", item.get("timestamp", 0))
            weight = (item.get("summary", {}) or {}).get("weight")
            if ts and weight:
                weights.append((int(ts), float(weight)))
        weights.sort()
        if not weights:
            return
        print()
        print("⚖️  WEIGHT HISTORY")
        for ts, weight in weights:
            dt = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m/%Y")
            print(f"  {dt}: {weight} kg")
    except Exception as exc:  # pragma: no cover - best effort logging only
        print(f"⚠️  Could not parse weight data: {exc}")


def main() -> int:
    longevidade_dir = resolve_longevidade_dir()
    blueprint_script = longevidade_dir / "scripts" / "run_daily_pipeline.py"
    db_path = longevidade_dir / "data" / "longevity.sqlite3"
    errors: list[str] = []
    collection_ok = False
    try:
        zepp_python = resolve_zepp_python()
    except FileNotFoundError as exc:
        print(f"⚠️  Zepp runtime error: {exc}", file=sys.stderr)
        return 1

    print("=" * 60)
    print("📡 ZEPP COLLECTION")
    print("=" * 60)
    result = subprocess.run(
        [str(zepp_python), str(ZEPP_SCRIPT)],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=BASE_DIR,
    )
    print(result.stdout)
    if result.returncode != 0:
        errors.append(
            f"Zepp collection failed (exit {result.returncode}): {result.stderr.strip()}"
        )
        print(f"⚠️  Zepp collection error: {result.stderr.strip()}", file=sys.stderr)
    else:
        collection_ok = True
        print("✅ Zepp collection complete")

    print()
    print("=" * 60)
    print("📊 WORKOUT HISTORY WORKBOOK")
    print("=" * 60)
    if not collection_ok:
        errors.append("Workbook update skipped because Zepp collection failed")
        print("⚠️  Workbook update skipped: Zepp collection failed", file=sys.stderr)
    elif not WORKOUT_XLSX_SCRIPT.is_file():
        errors.append(f"Workbook script not found: {WORKOUT_XLSX_SCRIPT}")
        print(f"⚠️  Workbook script not found: {WORKOUT_XLSX_SCRIPT}", file=sys.stderr)
    else:
        result = subprocess.run(
            [str(zepp_python), str(WORKOUT_XLSX_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=BASE_DIR,
        )
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(f"  Stderr: {result.stderr.strip()}", file=sys.stderr)
        if result.returncode != 0:
            errors.append(f"Workbook update failed (exit {result.returncode})")
            print(
                f"⚠️  Workbook update error (exit {result.returncode})",
                file=sys.stderr,
            )
        else:
            print("✅ Workout workbook synchronized")

    print()
    print("=" * 60)
    print("🗄️  BLUEPRINT IMPORT")
    print("=" * 60)
    print(f"  Longevidade dir: {longevidade_dir}")

    if not blueprint_script.is_file():
        errors.append(f"Blueprint script not found: {blueprint_script}")
        print(f"⚠️  Blueprint script not found: {blueprint_script}", file=sys.stderr)
    elif not ZEPP_DATA_DIR.is_dir():
        errors.append(f"Zepp data dir not found: {ZEPP_DATA_DIR}")
        print(f"⚠️  Zepp data dir not found: {ZEPP_DATA_DIR}", file=sys.stderr)
    else:
        result = run_longevidade_pipeline(longevidade_dir, blueprint_script, db_path)
        if result.stdout.strip():
            try:
                summary = json.loads(result.stdout)
                print(f"  Status: {summary['status']}")
                print(f"  Snapshot: {summary['snapshot_id']}")
                print(f"  Observations inserted: {summary['observations_inserted']}")
                print(f"  Daily metrics: {summary['daily_metrics']}")
                print(f"  Legacy CSV: {summary['legacy_inserted'].get('csv', 0)}")
                print(
                    f"  Legacy workbook: {summary['legacy_inserted'].get('workbook', 0)}"
                )
                print(
                    f"  Calorie JSONL: {summary['legacy_inserted'].get('calorie_jsonl', 0)}"
                )
                print(
                    f"  Interventions: {summary['legacy_inserted'].get('interventions', 0)}"
                )
                print(f"  Report: {summary['report_path']}")
                if summary.get("warnings"):
                    for warning in summary["warnings"]:
                        print(f"  ⚠️  {warning}")
            except json.JSONDecodeError:
                print(f"  Output: {result.stdout.strip()}")
        if result.stderr.strip():
            print(f"  Stderr: {result.stderr.strip()}")
        if result.returncode != 0:
            errors.append(f"Blueprint import failed (exit {result.returncode})")
            print(
                f"⚠️  Blueprint import error (exit {result.returncode})",
                file=sys.stderr,
            )
        else:
            print("✅ Blueprint import complete")

    print_weight_history()

    print()
    print("=" * 60)
    if errors:
        print(f"⚠️  Completed with {len(errors)} error(s):")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("✅ Pipeline complete — Zepp → Blueprint sync OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())