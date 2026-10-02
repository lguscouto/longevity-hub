"""
Script de Validação e Telemetria de Evidências (UX_UI_15).
Executa as suites de testes configuradas, captura métricas, hash do commit e ambiente,
gerando a tabela de evidências canônica exigida pelo CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.
"""

import argparse
import datetime
import os
import platform
import subprocess
import sys

import threading

# Garante flushing imediato em pipes, redirecionamentos e logs de tarefas
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

# Força CI=1 para o Playwright não manter o webServer Vite rodando em segundo plano
os.environ["CI"] = "1"
os.environ["PYTHONUNBUFFERED"] = "1"


def get_git_commit() -> str:
    try:
        res = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except Exception:
        return "unknown"


def run_check(name: str, cmd: list[str], cwd: str | None = None, stream_output: bool = True, timeout: int = 240) -> dict:
    timestamp = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    start_time = datetime.datetime.now()
    is_windows = platform.system() == "Windows"
    lines: list[str] = []

    print(f"\n--- [{name}] Início: {timestamp} ---", flush=True)
    print(f"Comando: {' '.join(cmd)}", flush=True)

    try:
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=is_windows,
            bufsize=1,
            env=os.environ.copy(),
        )

        def stream_reader():
            if process.stdout:
                for line in iter(process.stdout.readline, ""):
                    cleaned = line.rstrip()
                    if cleaned:
                        lines.append(cleaned)
                        if stream_output:
                            print(f"  | {cleaned}", flush=True)
                process.stdout.close()

        t = threading.Thread(target=stream_reader, daemon=True)
        t.start()

        try:
            process.wait(timeout=timeout)
            t.join(timeout=3)
        except subprocess.TimeoutExpired:
            print(f"  | [TIMEOUT] Processo excedeu {timeout}s. Encerrando...", flush=True)
            process.kill()
            t.join(timeout=2)
            raise TimeoutError(f"Comando excedeu o limite de {timeout} segundos.")

        duration = (datetime.datetime.now() - start_time).total_seconds()
        status = "PASS" if process.returncode == 0 else "FAIL"
        last_line = lines[-1] if lines else f"Exit code {process.returncode}"

        print(f"--- [{name}] Conclusão: {status} ({duration:.2f}s) ---", flush=True)

        return {
            "name": name,
            "cmd": " ".join(cmd),
            "timestamp": timestamp,
            "status": status,
            "duration": f"{duration:.2f}s",
            "detail": last_line,
        }
    except Exception as e:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        print(f"--- [{name}] Erro: {e} ---", flush=True)
        return {
            "name": name,
            "cmd": " ".join(cmd),
            "timestamp": timestamp,
            "status": "FAIL",
            "duration": f"{duration:.2f}s",
            "detail": str(e),
        }


def main():
    parser = argparse.ArgumentParser(description="Validação de evidências e telemetria v2.0.0")
    parser.add_argument("--skip-backend", action="store_true", help="Pular testes lentos do backend (pytest) para ciclos rápidos de UX")
    parser.add_argument("--quick", action="store_true", help="Executar apenas build e testes unitários do frontend")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(root, "frontend")
    commit_hash = get_git_commit()
    env_info = f"{platform.system()} {platform.release()} | Python {platform.python_version()}"

    print(f"=== TELEMETRIA DE EVIDÊNCIAS — LONGEVIDADE HUB v2.1.0 ===", flush=True)
    print(f"Commit: {commit_hash} | Ambiente: {env_info}", flush=True)
    print("=" * 60, flush=True)

    checks = [
        ("Vite Production Build", ["npm", "run", "build"], frontend_dir),
        ("Vitest Unit & Component Suite", ["npm", "run", "test:run"], frontend_dir),
    ]

    if not args.quick:
        checks.append(
            ("Playwright Visual QA Multi-Viewport", ["npx", "playwright", "test", "-c", "e2e/playwright.config.ts", "e2e/visual-qa.spec.ts"], frontend_dir)
        )

    if not args.skip_backend and not args.quick:
        checks.append(
            ("Backend Pytest Suite", [sys.executable, "-m", "pytest", "-q"], root)
        )

    results = []
    for name, cmd, cwd in checks:
        result = run_check(name, cmd, cwd, stream_output=True)
        results.append(result)

    print("\n\n| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |", flush=True)
    print("|---|---|---|---|---|---|", flush=True)
    for r in results:
        print(f"| {r['name']} | `{r['cmd']}` | {r['timestamp']} | {env_info} (Commit {commit_hash}) | {r['status']} | {r['detail']} ({r['duration']}) |", flush=True)


if __name__ == "__main__":
    main()
