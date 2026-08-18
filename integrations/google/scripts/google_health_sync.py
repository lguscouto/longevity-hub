#!/usr/bin/env python3
"""
Script CLI para sincronização automatizada da Google Health API v4 com o banco Longevidade.

Uso:
    python google_health_sync.py [--days 30] [--token-path caminho] [--save-json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Adiciona caminhos do projeto ao sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.google_health_client import GoogleHealthClient, get_default_token_path
from longevidade.ingestion.google_importer import sync_google_health_api


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincronizador Google Health API v4")
    parser.add_argument("--days", type=int, default=30, help="Quantidade de dias retroativos (padrão: 30)")
    parser.add_argument("--token-path", type=str, default=None, help="Caminho do arquivo google_health_token.json")
    parser.add_argument("--db-path", type=str, default=None, help="Caminho do banco SQLite do Longevidade")
    parser.add_argument("--save-json", action="store_true", help="Salva os dados coletados em google_health_daily.json")
    args = parser.parse_args()

    token_path = Path(args.token_path) if args.token_path else get_default_token_path()
    client = GoogleHealthClient(token_path=token_path)

    if not client.is_authenticated():
        print(f"[ERRO] Credenciais não encontradas em: {token_path}")
        print("Execute o script de autenticação OAuth: python integrations/google/scripts/auth_google_health.py")
        return 1

    print(f"[*] Iniciando sincronização Google Health API ({args.days} dias)...")
    
    db_path = Path(args.db_path) if args.db_path else PROJECT_ROOT / "data" / "longevity.sqlite3"
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    if args.save_json:
        records, errors = client.fetch_daily_metrics_summary(days=args.days)
        out_file = PROJECT_ROOT / "integrations" / "google" / "data" / "google_health_daily.json"
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[+] Dados salvos em {out_file}")

    result = sync_google_health_api(repo=repo, days=args.days, client=client)

    print(f"[{result['status']}] {result['summary']}")
    if result.get("exception_message"):
        print(f"[AVISO] Detalhes: {result['exception_message']}")

    return 0 if result["status"] in ("SUCESSO", "AVISO") else 1


if __name__ == "__main__":
    sys.exit(main())
