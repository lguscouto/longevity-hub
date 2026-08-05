#!/usr/bin/env python3
"""
Hermes ↔ Amazfit — Setup para nova instalação

Executa a configuração inicial do projeto Amazfit/Zepp em uma nova
instalação do Hermes. Detecta automaticamente os paths e valida tudo.

Uso:
    python setup_zepp.py              # setup interativo
    python setup_zepp.py --cron       # também registra o cron job
"""

import json
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SCRIPTS = BASE_DIR / "scripts"
ZEPP_CLI = BASE_DIR / "zepp-health-cli" / "zepp_health.py"
CONFIG = BASE_DIR / "zepp-health-cli" / "config.json"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"

def ok(msg): print(f"  {GREEN}✅{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}⚠️{RESET} {msg}")
def err(msg): print(f"  {RED}❌{RESET} {msg}")
def info(msg): print(f"  {BOLD}📌{RESET} {msg}")


def check_python():
    """Check Python and install required packages when they are absent."""
    print(f"\n{BOLD}── Python Environment ──{RESET}")
    print(f"  Python: {sys.version.split()[0]} ({sys.executable})")

    missing_packages = []
    for package in ("requests", "openpyxl"):
        try:
            __import__(package)
            ok(f"{package} package installed")
        except ImportError:
            missing_packages.append(package)

    if missing_packages:
        warn(f"Missing packages: {', '.join(missing_packages)} — installing...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", *missing_packages],
            check=True,
        )
        for package in missing_packages:
            ok(f"{package} installed")


def check_config():
    """Validate the Zepp config."""
    print(f"\n{BOLD}── Zepp Configuration ──{RESET}")
    if not CONFIG.is_file():
        err(f"config.json not found at {CONFIG}")
        info("You need to capture the token from the Zepp app first.")
        info(f"See: {BASE_DIR / 'INSTRUCOES_TOKEN.md'}")
        return False

    try:
        cfg = json.loads(CONFIG.read_text())
    except json.JSONDecodeError:
        err("config.json is corrupted")
        return False

    token = cfg.get("app_token", "")
    user_id = cfg.get("user_id", "")
    host = cfg.get("host", "")

    if token and user_id:
        masked = token[:8] + "…" + token[-6:] if len(token) > 14 else token
        ok(f"app_token: {masked}")
        ok(f"user_id: {user_id}")
        ok(f"host: {host}")
        return True
    else:
        err("config.json is missing app_token or user_id")
        return False


def test_api():
    """Quick API test to verify connectivity."""
    print(f"\n{BOLD}── API Connectivity ──{RESET}")
    try:
        import requests, uuid
        cfg = json.loads(CONFIG.read_text())
        host = cfg.get("host", "api-mifit-us3.zepp.com")
        token = cfg.get("app_token", "")

        url = f"https://{host}/huami.health.getUserInfo.json?r={uuid.uuid4().hex.upper()}"
        r = requests.get(url, headers={
            "apptoken": token,
            "appname": "com.huami.midong",
            "appplatform": "ios_phone",
            "user-agent": "Zepp/10.2.5",
        }, timeout=15)

        if r.status_code == 200:
            data = r.json()
            nick = data.get("data", {}).get("nick_name", "unknown")
            height = data.get("data", {}).get("height", "?")
            weight = data.get("data", {}).get("weight", "?")
            ok(f"Connected to Zepp API — account: {nick}")
            ok(f"Profile: {height}cm, {weight}kg")
            return True
        else:
            err(f"API returned {r.status_code}: {r.text[:100]}")
            return False
    except Exception as e:
        err(f"API test failed: {e}")
        return False


def test_fetch():
    """Run a quick data fetch test."""
    print(f"\n{BOLD}── Test Data Fetch ──{RESET}")
    cmd = [sys.executable, str(SCRIPTS / "fetch_zepp_data.py"), "--check"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15, cwd=str(BASE_DIR))
    if "Config OK" in r.stdout:
        ok("Config check passed")
    else:
        err(f"Config check failed: {r.stdout.strip()}")
        return False
    return True


def print_cron_instructions():
    """Print instructions for setting up the Hermes cron job."""
    print(f"\n{BOLD}── Cron Job Setup ──{RESET}")
    print(f"""
  Para configurar o cron job automático na nova instalação do Hermes,
  peça ao Hermes para criar um cron job com este prompt:

  ┌─────────────────────────────────────────────────────────┐
  │ Crie um cron job chamado "Amazfit Daily Report" que    │
  │ execute diariamente às 9h:                              │
  │                                                         │
  │   cd {BASE_DIR}                                         │
  │   python scripts/zepp_cron.py                           │
  │                                                         │
  │ O script coleta dados do relógio Amazfit via API Zepp   │
  │ e gera um resumo diário.                                │
  │                                                         │
  │ IMPORTANTE: configure deliver='origin' e                │
  │ attach_to_session=true para receber os relatórios.      │
  └─────────────────────────────────────────────────────────┘
""")


def main():
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  Hermes ↔ Amazfit — Setup Wizard{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"  Project: {BASE_DIR}")

    check_python()
    cfg_ok = check_config()
    if cfg_ok:
        test_api()

    if cfg_ok:
        test_fetch()

    print_cron_instructions()

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"  Setup concluído!")
    print(f"\n  Comandos úteis:")
    print(f"    python scripts/fetch_zepp_data.py --days 7 --all")
    print(f"    python scripts/fetch_zepp_data.py --summary")
    print(f"    python scripts/analyze_zepp_data.py --all")
    print(f"{BOLD}{'='*60}{RESET}\n")


if __name__ == "__main__":
    main()
