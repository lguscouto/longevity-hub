#!/usr/bin/env python3
"""
Script de sincronização histórica completa do Zepp (Amazfit) desde 01/01/2026.

1. Executa coleta completa da nuvem Zepp cobrindo todos os dias de 2026.
2. Salva snapshots normalizados em integrations/zepp/data/.
3. Importa e enriquece os registros diários no banco SQLite (data/longevity.sqlite3).
4. Emite relatório de cobertura mensal de sono.
"""

from __future__ import annotations

import os
import sys
from datetime import date, datetime
from pathlib import Path

# Configura caminhos
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))
sys.path.insert(0, str(PROJECT_ROOT / "integrations" / "zepp" / "scripts"))

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.zepp_importer import import_zepp_data, run_zepp_cloud_fetch

ZEPP_DATA_DIR = PROJECT_ROOT / "integrations" / "zepp" / "data"
ZEPP_SCRIPTS_DIR = PROJECT_ROOT / "integrations" / "zepp" / "scripts"
DB_PATH = PROJECT_ROOT / "data" / "longevity.sqlite3"


def main():
    today = date.today()
    start_date = date(2026, 1, 1)
    days = max(270, (today - start_date).days + 1)

    print(f"=== Sincronização Histórica Zepp ===")
    print(f"Data inicial: {start_date.isoformat()}")
    print(f"Data final:   {today.isoformat()}")
    print(f"Total de dias: {days}")
    print()

    # 1. Coleta da nuvem Zepp
    print("1. Coletando dados da nuvem Zepp...")
    try:
        run_zepp_cloud_fetch(ZEPP_SCRIPTS_DIR, timeout_seconds=600, days=days, full=True)
        print("   -> Coleta da nuvem concluída com sucesso.")
    except Exception as exc:
        print(f"   [AVISO] Falha ao coletar da nuvem ({exc}). Tentando importar snapshots locais existentes.")

    # 2. Importação no SQLite
    print("\n2. Importando dados no banco de dados SQLite...")
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    result = import_zepp_data(ZEPP_DATA_DIR, repo, days=days, full=False)
    print(f"   Status:            {result.get('status')}")
    print(f"   Registros lidos:   {result.get('records_read')}")
    print(f"   Registros upsert:  {result.get('records_inserted')}")
    print(f"   Resumo:            {result.get('summary')}")

    # 3. Auditoria mensal de sono
    print("\n3. Auditoria de registros de sono em 2026:")
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT strftime('%Y-%m', date_ref) as mes,
               COUNT(*) as total_dias,
               COUNT(sleep_minutes) as dias_com_sono,
               ROUND(AVG(sleep_minutes), 1) as media_sono_min,
               ROUND(AVG(sleep_deep_min), 1) as media_profundo_min,
               ROUND(AVG(sleep_rem_min), 1) as media_rem_min
        FROM daily_metrics
        WHERE date_ref >= '2026-01-01'
        GROUP BY strftime('%Y-%m', date_ref)
        ORDER BY mes
        """
    )
    rows = cur.fetchall()
    conn.close()

    print(f"   {'Mês':<8} | {'Total Dias':<10} | {'Com Sono':<9} | {'Média Sono':<12} | {'Profundo':<10} | {'REM':<8}")
    print("   " + "-" * 65)
    for row in rows:
        mes, total, com_sono, avg_s, avg_dp, avg_rem = row
        print(f"   {mes:<8} | {total:<10} | {com_sono:<9} | {str(avg_s) + ' min':<12} | {str(avg_dp) + ' min':<10} | {str(avg_rem) + ' min':<8}")

    print("\nSincronização histórica finalizada com sucesso!")


if __name__ == "__main__":
    main()
