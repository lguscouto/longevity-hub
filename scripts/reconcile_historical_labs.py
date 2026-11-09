#!/usr/bin/env python3
"""Script de Reconciliação Histórica Controlada de Exames Laboratoriais.

Inspeciona registros na tabela `lab_results`, compara os valores e unidades
persistidos com as regras clínicas de normalização determinística
(`normalize_clinical_inputs`) e, opcionalmente, atualiza `value`, `unit`,
`raw_value` e `raw_unit`.

Uso:
  # Apenas inspeciona e simula (padrão):
  python scripts/reconcile_historical_labs.py --dry-run

  # Aplica alterações após backup:
  python scripts/reconcile_historical_labs.py --apply
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sqlite3
import sys
from typing import Any, Dict, List, Tuple

from longevidade.ingestion.lab_parser import OPTIMAL_LONGEVITY_TARGETS
from longevidade.metrics.unit_conversion import INPUT_KEY_TO_CANONICAL, normalize_clinical_inputs


def inspect_and_reconcile_labs(
    db_path: Path | str,
    apply_changes: bool = False,
    verbose: bool = False,
) -> Dict[str, Any]:
    """Inspeciona e reconcilia exames laboratoriais históricos.

    Args:
        db_path: Caminho para o banco SQLite.
        apply_changes: Se True, grava alterações no banco. Se False, apenas simula.
        verbose: Se True, detalha cada exame avaliado.

    Returns:
        Dicionário com estatísticas e lista de registros reconciliados.
    """
    path = Path(db_path)
    if not path.exists():
        raise FileNotFoundError(f"Banco de dados não encontrado em '{path}'")

    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        # Verifica se as colunas raw_value e raw_unit existem
        cols_info = conn.execute("PRAGMA table_info(lab_results);").fetchall()
        col_names = {row["name"] for row in cols_info}
        if "raw_value" not in col_names or "raw_unit" not in col_names:
            raise RuntimeError("Colunas raw_value e raw_unit não existem em lab_results. Aplique as migrações primeiro.")

        cursor = conn.execute(
            "SELECT id, collected_at, metric_key, metric_name, value, unit, raw_value, raw_unit FROM lab_results ORDER BY collected_at ASC, id ASC;"
        )
        rows = cursor.fetchall()

        total_checked = len(rows)
        needs_update: List[Dict[str, Any]] = []
        already_canonical = 0

        for r in rows:
            rec_id = r["id"]
            dt = r["collected_at"]
            key = r["metric_key"]
            curr_val = r["value"]
            curr_unit = r["unit"]
            raw_v = r["raw_value"] if r["raw_value"] is not None else curr_val
            raw_u = r["raw_unit"] if r["raw_unit"] is not None else curr_unit

            target_info = OPTIMAL_LONGEVITY_TARGETS.get(key, {})

            norm_result = normalize_clinical_inputs(
                {key: {"value": raw_v, "unit": raw_u}},
                measured_at=dt,
            )

            if norm_result:
                canonical_target = INPUT_KEY_TO_CANONICAL.get(key, key)
                norm_item = norm_result.get(canonical_target) or next(iter(norm_result.values()))
                target_val = float(norm_item.value)
                target_unit = norm_item.canonical_unit or target_info.get("unit") or curr_unit
                conv_note = norm_item.conversion_applied
            else:
                target_val = float(curr_val)
                target_unit = curr_unit
                conv_note = None

            # Checa se há divergência no valor, na unidade ou ausência de raw_*
            val_diff = abs(target_val - curr_val) > 1e-4
            unit_diff = (target_unit != curr_unit) and bool(target_unit)
            raw_missing = (r["raw_value"] is None) or (r["raw_unit"] is None)

            if val_diff or unit_diff or raw_missing:
                item_info = {
                    "id": rec_id,
                    "collected_at": dt,
                    "metric_key": key,
                    "old_value": curr_val,
                    "new_value": target_val,
                    "old_unit": curr_unit,
                    "new_unit": target_unit,
                    "raw_value": raw_v,
                    "raw_unit": raw_u,
                    "conversion_applied": conv_note,
                    "reasons": [],
                }
                if val_diff:
                    item_info["reasons"].append(f"valor ({curr_val} -> {target_val})")
                if unit_diff:
                    item_info["reasons"].append(f"unidade ('{curr_unit}' -> '{target_unit}')")
                if raw_missing:
                    item_info["reasons"].append("preenchimento de raw_value/raw_unit")

                needs_update.append(item_info)
            else:
                already_canonical += 1

        print(f"Total de exames inspecionados: {total_checked}")
        print(f"Exames já conformes / canônicos: {already_canonical}")
        print(f"Exames com necessidade de reconciliação: {len(needs_update)}")

        if needs_update:
            print("\n--- Detalhes dos Exames com Divergências ---")
            for item in needs_update[:50]:
                reasons_str = ", ".join(item["reasons"])
                print(
                    f"  [ID {item['id']}] {item['collected_at']} | {item['metric_key']}: "
                    f"{item['old_value']} {item['old_unit']} -> {item['new_value']} {item['new_unit']} "
                    f"| Motivo: {reasons_str}"
                )
            if len(needs_update) > 50:
                print(f"  ... e mais {len(needs_update) - 50} exames omitidos do log resumido.")

        if apply_changes and needs_update:
            print(f"\nAplicando reconciliação em {len(needs_update)} exames no banco...")
            with conn:
                for item in needs_update:
                    conn.execute(
                        """
                        UPDATE lab_results
                        SET value = ?, unit = ?, raw_value = ?, raw_unit = ?
                        WHERE id = ?;
                        """,
                        (item["new_value"], item["new_unit"], item["raw_value"], item["raw_unit"], item["id"]),
                    )
            print("Alterações persistidas com sucesso!")
        elif not apply_changes and needs_update:
            print("\n[MODO SIMULAÇÃO --dry-run]: Nenhuma alteração foi realizada no banco de dados.")
            print("Para aplicar as mudanças, execute com a flag '--apply' após criar backup.")

        return {
            "total_checked": total_checked,
            "already_canonical": already_canonical,
            "reconciled_count": len(needs_update),
            "applied": apply_changes,
            "details": needs_update,
        }
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconciliação Histórica Controlada de Exames Laboratoriais")
    parser.add_argument(
        "--db",
        default="data/longevity.sqlite3",
        help="Caminho do banco SQLite (padrão: data/longevity.sqlite3)",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Executa apenas simulação sem alterar o banco de dados (padrão)",
    )
    group.add_argument(
        "--apply",
        action="store_true",
        help="Aplica as correções no banco de dados de forma atômica",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Exibe logs detalhados de cada exame inspecionado",
    )

    args = parser.parse_args()
    apply_mode = args.apply

    try:
        inspect_and_reconcile_labs(args.db, apply_changes=apply_mode, verbose=args.verbose)
    except Exception as exc:
        print(f"[ERRO] {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
