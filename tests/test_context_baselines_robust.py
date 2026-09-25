"""
Testes unitários para o cálculo de baselines com estatística robusta (Mediana, MAD e Z-score).
"""

import sqlite3
from pathlib import Path

import pytest

from longevidade.context.baselines import (
    calculate_mad,
    calculate_median,
    calculate_robust_z_score,
    evaluate_metric_baseline,
)
from longevidade.db.schema import initialize_db


def test_calculate_median_and_mad():
    vals = [50.0, 52.0, 54.0, 55.0, 56.0, 58.0, 60.0]
    med = calculate_median(vals)
    assert med == 55.0

    # MAD em relação a 55.0: [0, 1, 1, 3, 3, 5, 5] -> mediana é 3.0
    mad = calculate_mad(vals, med)
    assert mad == 3.0

    # Teste lista par
    vals_even = [10.0, 20.0, 30.0, 40.0]
    assert calculate_median(vals_even) == 25.0


def test_robust_z_score():
    # Se valor for igual à mediana, Z-score é 0
    z_zero = calculate_robust_z_score(55.0, 55.0, 4.0)
    assert abs(z_zero) < 1e-4

    # Se valor cair bastante (ex: 38 ms com baseline de 55 e MAD de 4)
    # scale = 1.4826 * 4 = 5.9304
    # (38 - 55) / 5.9304 = -2.86
    z_drop = calculate_robust_z_score(38.0, 55.0, 4.0)
    assert z_drop < -2.0


def test_evaluate_metric_baseline_hrv_significant_drop(tmp_path):
    db_file = tmp_path / "test_baseline.sqlite3"
    initialize_db(db_file)

    conn = sqlite3.connect(db_file)
    # Insere 25 dias prévios com HRV estável em torno de 55 ms
    for day in range(1, 26):
        d_str = f"2026-08-{day:02d}"
        hrv_val = 54.0 + (day % 3)  # 54, 55 ou 56
        conn.execute(
            "INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES (?, ?);",
            (d_str, hrv_val),
        )

    # Insere o dia-alvo com queda drástica (40 ms, delta -27%)
    conn.execute(
        "INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES ('2026-08-26', 40.0);"
    )
    conn.commit()

    res = evaluate_metric_baseline(conn, "hrv_ms", "2026-08-26")
    conn.close()

    assert res.metric == "hrv_ms"
    assert res.observed_value == 40.0
    assert 54.0 <= res.baseline_value <= 56.0
    assert res.robust_z_score < -1.5
    assert res.delta_percent < -15.0
    assert res.significance == "significativa"
    assert res.confidence == "high"
    assert res.direction_relevant is True


def test_evaluate_metric_baseline_insufficient_history(tmp_path):
    db_file = tmp_path / "test_insufficient.sqlite3"
    initialize_db(db_file)

    conn = sqlite3.connect(db_file)
    # Insere apenas 3 dias prévios
    conn.execute("INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES ('2026-09-01', 55.0);")
    conn.execute("INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES ('2026-09-02', 56.0);")
    conn.execute("INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES ('2026-09-03', 54.0);")
    conn.execute("INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES ('2026-09-04', 42.0);")
    conn.commit()

    res = evaluate_metric_baseline(conn, "hrv_ms", "2026-09-04")
    conn.close()

    assert res.confidence == "insufficient_history"
    assert res.significance == "normal"
    assert "Histórico insuficiente" in res.status_message
