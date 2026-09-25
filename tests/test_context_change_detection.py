"""
Testes unitários e de integração para a Fase 4: Change Point Detection & CUSUM.
Verifica o descarte correto de spikes efêmeros de 1 dia, a confirmação estatística de quebras
persistentes de patamar, a projeção na Timeline e conformidade com AGENTS.md (fixture client: TestClient).
"""

import json
import sqlite3
import pytest
from fastapi.testclient import TestClient

from longevidade.context.change_detection import (
    detect_change_points_for_metric,
    load_change_points,
    project_change_points_to_timeline,
    run_full_change_point_pipeline,
)
from longevidade.db.schema import initialize_db


@pytest.fixture
def baseline_db(tmp_path):
    db_file = tmp_path / "test_change_points.sqlite3"
    initialize_db(db_file)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row

    # Popula 20 dias com HRV estável (~60ms) e RHR estável (~56bpm)
    for day in range(1, 21):
        d_str = f"2026-09-{day:02d}"
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, 60.0, 56.0, 450.0, 75.0);
            """,
            (d_str,),
        )
    conn.commit()
    yield conn, db_file
    conn.close()


def test_ephemeral_single_day_spike_is_ignored(baseline_db):
    """Garante que uma anomalia de 1 única noite NÃO é rotulada como quebra de patamar."""
    conn, _ = baseline_db

    # Dia 21: spike isolado de HRV para 38ms (queda de 36%)
    conn.execute(
        """
        INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
        VALUES ('2026-09-21', 38.0, 68.0, 420.0, 75.0);
        """
    )
    # Dias 22 e 23: retorno imediato ao baseline de 60ms
    for d in ('2026-09-22', '2026-09-23', '2026-09-24'):
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, 60.0, 56.0, 450.0, 75.0);
            """,
            (d,),
        )
    conn.commit()

    # Executa detecção
    cps = detect_change_points_for_metric(conn, "hrv_ms", min_persisted_days=3)
    # Não deve detectar mudança de patamar para spike efêmero
    assert len(cps) == 0


def test_persistent_level_shift_is_detected_by_cusum(baseline_db):
    """Detecta quando a métrica muda de patamar e permanece no novo nível por dias seguidos."""
    conn, _ = baseline_db

    # A partir do dia 21 até dia 26 (6 dias consecutivos), HRV cai para 42ms
    for day in range(21, 27):
        d_str = f"2026-09-{day:02d}"
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, 42.0, 64.0, 420.0, 75.0);
            """,
            (d_str,),
        )
    conn.commit()

    cps = detect_change_points_for_metric(conn, "hrv_ms", min_persisted_days=3)
    assert len(cps) == 1
    cp = cps[0]
    assert cp.metric == "hrv_ms"
    assert cp.date_ref == "2026-09-21"
    assert cp.persisted_days >= 4
    assert cp.baseline_value == 60.0
    assert cp.observed_value == 42.0
    assert cp.delta_percent <= -25.0
    assert cp.detection_method == "cusum_confirmed"
    assert cp.significance == "significativa"
    assert "Mudança de Patamar: HRV reduziu" in cp.headline


def test_change_points_project_to_health_events_timeline(baseline_db):
    """Verifica se quebras de patamar geram eventos na Timeline com source_key idempotente."""
    conn, _ = baseline_db

    # Insere 5 dias consecutivos de FC repouso elevada (+8 bpm)
    for day in range(21, 26):
        d_str = f"2026-09-{day:02d}"
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, 60.0, 65.0, 450.0, 75.0);
            """,
            (d_str,),
        )
    conn.commit()

    all_cps, projected = run_full_change_point_pipeline(conn, "rhr_bpm")
    assert len(all_cps) == 1
    assert projected == 1

    # Verifica se evento correspondente foi gravado em health_events
    cur = conn.cursor()
    cur.execute(
        """
        SELECT event_type, source_type, source_key, title, confidence, significance
        FROM health_events
        WHERE source_key = 'change_point:2026-09-21:rhr_bpm';
        """
    )
    ev_row = cur.fetchone()
    assert ev_row is not None
    assert ev_row[0] == "metric_change"
    assert ev_row[1] == "change_point"
    assert "FC de Repouso elevou" in ev_row[3]
    assert ev_row[4] in ("high", "moderate")


def test_change_points_api_endpoints(client: TestClient, monkeypatch, tmp_path):
    """Testa rotas de API injetando client: TestClient conforme AGENTS.md."""
    test_db_path = tmp_path / "api_change_points.sqlite3"
    initialize_db(test_db_path)

    conn = sqlite3.connect(test_db_path)
    # Popula 20 dias normais
    for day in range(1, 21):
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm)
            VALUES (?, 60.0, 56.0);
            """,
            (f"2026-09-{day:02d}",),
        )
    # Popula 5 dias de queda persistente de HRV
    for day in range(21, 26):
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm)
            VALUES (?, 40.0, 56.0);
            """,
            (f"2026-09-{day:02d}",),
        )
    conn.commit()
    conn.close()

    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(test_db_path))

    # 1. POST /api/context/change-points/detect
    detect_resp = client.post("/api/context/change-points/detect?metric=hrv_ms")
    assert detect_resp.status_code == 200
    res_data = detect_resp.json()
    assert res_data["status"] == "ok"
    assert res_data["detected_count"] == 1
    assert res_data["projected_to_timeline"] == 1

    # 2. GET /api/context/change-points
    get_resp = client.get("/api/context/change-points?metric=hrv_ms")
    assert get_resp.status_code == 200
    cps_data = get_resp.json()
    assert cps_data["total"] == 1
    item = cps_data["items"][0]
    assert item["metric"] == "hrv_ms"
    assert item["date_ref"] == "2026-09-21"
    assert item["persisted_days"] >= 4
    assert item["baseline_value"] == 60.0
    assert item["observed_value"] == 40.0
