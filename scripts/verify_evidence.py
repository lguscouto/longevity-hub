"""
Script de Validação e Telemetria de Evidências (UX_UI_15).
Executa as suites de testes configuradas, captura métricas, hash do commit e ambiente,
gerando a tabela de evidências canônica exigida pelo CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.
"""

import datetime
import os
import platform
import subprocess
import sys


def get_git_commit() -> str:
    try:
        res = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except Exception:
        return "unknown"


def run_check(name: str, cmd: list[str], cwd: str | None = None) -> dict:
    timestamp = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    start_time = datetime.datetime.now()
    is_windows = platform.system() == "Windows"
    try:
        res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False, shell=is_windows)
        duration = (datetime.datetime.now() - start_time).total_seconds()
        status = "PASS" if res.returncode == 0 else "FAIL"
        output_sample = (res.stdout.strip() or res.stderr.strip()).splitlines()
        last_line = output_sample[-1] if output_sample else f"Exit code {res.returncode}"
        return {
            "name": name,
            "cmd": " ".join(cmd),
            "timestamp": timestamp,
            "status": status,
            "duration": f"{duration:.2f}s",
            "detail": last_line,
        }
    except Exception as e:
        return {
            "name": name,
            "cmd": " ".join(cmd),
            "timestamp": timestamp,
            "status": "FAIL",
            "duration": "0s",
            "detail": str(e),
        }


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(root, "frontend")
    commit_hash = get_git_commit()
    env_info = f"{platform.system()} {platform.release()} | Python {platform.python_version()}"

    print(f"=== TELEMETRIA DE EVIDÊNCIAS — LONGEVIDADE HUB v2.0.0 ===")
    print(f"Commit: {commit_hash} | Ambiente: {env_info}")
    print("=" * 60)

    checks = [
        ("Vite Production Build", ["npm", "run", "build"], frontend_dir),
        ("Vitest Unit & Component Suite", ["npm", "run", "test:run"], frontend_dir),
        ("Playwright Visual QA Multi-Viewport", ["npx", "playwright", "test", "-c", "e2e/playwright.config.ts", "e2e/visual-qa.spec.ts"], frontend_dir),
        ("Backend Pytest Suite", [sys.executable, "-m", "pytest", "-q"], root),
    ]

    results = []
    for name, cmd, cwd in checks:
        print(f"Executando {name}...")
        result = run_check(name, cmd, cwd)
        results.append(result)
        print(f" -> [{result['status']}] em {result['duration']}: {result['detail']}")

    print("\n| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |")
    print("|---|---|---|---|---|---|")
    for r in results:
        print(f"| {r['name']} | `{r['cmd']}` | {r['timestamp']} | {env_info} (Commit {commit_hash}) | {r['status']} | {r['detail']} ({r['duration']}) |")


if __name__ == "__main__":
    main()
