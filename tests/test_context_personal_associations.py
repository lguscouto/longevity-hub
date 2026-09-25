"""
Testes unitários e de integração para a Fase 3: Associações Pessoais & Shrinkage Bayesiano.
Garante o cálculo correto de tamanho amostral, Cohen's d, correlações, calibração por feedback
e conformidade com as diretrizes do AGENTS.md (fixture client: TestClient).
"""

import json
import sqlite3
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from longevidade.context.associations import compute_context_attribution
from longevidade.context.personal_associations import (
    compute_personal_association,
    get_calibrated_prior_and_evidence,
    get_user_feedback_counts,
    recompute_all_personal_associations,
    save_personal_association,
    load_personal_associations,
)
from longevidade.context.service import get_timeline_service
from longevidade.db.schema import initialize_db


@pytest.fixture
def test_db(tmp_path):
    db_file = tmp_path / "test_personal_assoc.sqlite3"
    initialize_db(db_file)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row

    # Popula histórico prévio em agosto para garantir baseline estável de >= 7 dias
    for day in range(20, 32):
        date_str = f"2026-08-{day:02d}"
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, 60.0, 56.0, 450.0, 75.0);
            """,
            (date_str,),
        )

    # Popula 25 dias de daily_metrics em setembro
    # Dias normais: HRV ~60ms
    # Dias após álcool: HRV ~42ms (queda ~30%)
    alcohol_dates = ["2026-09-05", "2026-09-12", "2026-09-19", "2026-09-24"]
    for day in range(1, 26):
        date_str = f"2026-09-{day:02d}"
        hrv = 42.0 if date_str in alcohol_dates else 60.0
        rhr = 64.0 if date_str in alcohol_dates else 56.0
        conn.execute(
            """
            INSERT INTO daily_metrics (date_ref, hrv_ms, rhr_bpm, sleep_minutes, weight_kg)
            VALUES (?, ?, ?, ?, ?);
            """,
            (date_str, hrv, rhr, 450.0, 75.0),
        )

    # Insere eventos de álcool na noite anterior a cada data de impacto
    alcohol_eve_dates = [
        ("2026-09-04", 2),
        ("2026-09-11", 3),
        ("2026-09-18", 2),
        ("2026-09-23", 4),
    ]
    for d, servings in alcohol_eve_dates:
        meta_json = json.dumps({"servings": servings})
        conn.execute(
            """
            INSERT INTO health_events (
                id, timestamp, date_ref, time_ref, event_type, category,
                title, description, source, source_type, source_key,
                confidence, significance, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                f"ev-alc-{d}",
                f"{d}T22:00:00Z",
                d,
                "22:00",
                "alcohol",
                "lifestyle",
                f"Consumo de álcool: {servings} doses",
                f"Cerveja/Vinho • {servings} doses",
                "manual",
                "manual_entry",
                f"manual:alc:{d}",
                "high",
                "notável",
                meta_json,
            ),
        )
    conn.commit()
    yield conn, db_file
    conn.close()


def test_compute_personal_association_with_exposure_pairs(test_db):
    conn, _ = test_db
    assoc = compute_personal_association(conn, "hrv_ms", "alcohol", window_hours=24)

    assert assoc is not None
    assert assoc.target_metric == "hrv_ms"
    assert assoc.factor == "alcohol"
    # Deve encontrar 4 datas expostas
    assert assoc.sample_size == 4
    assert assoc.mean_delta_pct is not None
    # Como o HRV caiu de 60 para 42, a variação média é de aprox -30%
    assert assoc.mean_delta_pct < -20.0
    assert assoc.shrinkage_factor > 0.0
    assert "Consumo de Álcool" in assoc.headline
    assert "n=4" in assoc.evidence_text


def test_user_feedback_calibrates_shrinkage_factor(test_db):
    conn, _ = test_db
    # Associação inicial
    assoc_before = compute_personal_association(conn, "hrv_ms", "alcohol", window_hours=24)
    assert assoc_before is not None
    shrink_before = assoc_before.shrinkage_factor

    # Insere feedback positivo: usuário confirma que o insight é relevante
    conn.execute(
        """
        INSERT INTO insight_feedback (
            id, target_metric, date_ref, factor_key, is_helpful, user_rating
        ) VALUES ('fb-1', 'hrv_ms', '2026-09-24', 'alcohol', 1, 'relevant');
        """
    )
    conn.commit()

    assoc_after_pos = compute_personal_association(conn, "hrv_ms", "alcohol", window_hours=24)
    assert assoc_after_pos.user_feedback_balance == 1
    # Shrinkage factor deve ter aumentado pela multiplicação positiva
    assert assoc_after_pos.shrinkage_factor >= shrink_before

    # Agora insere múltiplos feedbacks negativos (usuário discorda)
    conn.execute(
        """
        INSERT INTO insight_feedback (
            id, target_metric, date_ref, factor_key, is_helpful, user_rating
        ) VALUES
            ('fb-2', 'hrv_ms', '2026-09-24', 'alcohol', 0, 'irrelevant'),
            ('fb-3', 'hrv_ms', '2026-09-24', 'alcohol', 0, 'irrelevant'),
            ('fb-4', 'hrv_ms', '2026-09-24', 'alcohol', 0, 'irrelevant');
        """
    )
    conn.commit()

    assoc_after_neg = compute_personal_association(conn, "hrv_ms", "alcohol", window_hours=24)
    assert assoc_after_neg.user_feedback_balance < 0
    # Deve amortecer o shrinkage factor
    assert assoc_after_neg.shrinkage_factor < shrink_before
    assert "Atenuado" in assoc_after_neg.evidence_text


def test_context_attribution_uses_calibrated_prior_and_evidence(test_db):
    conn, _ = test_db
    # Recalcula e persiste as associações
    recompute_all_personal_associations(conn, "hrv_ms")

    # Executa a atribuição contextual em uma data onde houve álcool
    res = compute_context_attribution(conn, "hrv_ms", "2026-09-24")

    assert res.target_date == "2026-09-24"
    assert len(res.factors) >= 1
    alcohol_factor = next((f for f in res.factors if f.factor_key == "alcohol"), None)
    assert alcohol_factor is not None
    assert alcohol_factor.personal_evidence is not None
    assert "Histórico pessoal" in alcohol_factor.personal_evidence
    assert alcohol_factor.details.get("personal_calibration") is True


def test_personal_associations_endpoints(client: TestClient, monkeypatch, tmp_path):
    """Testa endpoints da API injetando client: TestClient conforme AGENTS.md."""
    test_db_path = tmp_path / "api_personal_assoc.sqlite3"
    initialize_db(test_db_path)

    # Popula dados mínimos
    conn = sqlite3.connect(test_db_path)
    for d in range(1, 25):
        date_str = f"2026-09-{d:02d}"
        hrv = 40.0 if d in (10, 15, 20) else 58.0
        conn.execute(
            "INSERT INTO daily_metrics (date_ref, hrv_ms) VALUES (?, ?);",
            (date_str, hrv),
        )
    for d in (9, 14, 19):
        conn.execute(
            """
            INSERT INTO health_events (
                id, timestamp, date_ref, event_type, category, title, source, source_type, confidence, significance
            ) VALUES (?, ?, ?, 'alcohol', 'lifestyle', 'Vinho', 'manual', 'manual_entry', 'high', 'notável');
            """,
            (f"alc-{d}", f"2026-09-{d:02d}T21:00:00Z", f"2026-09-{d:02d}"),
        )
    conn.commit()
    conn.close()

    monkeypatch.setenv("LONGEVIDADE_DB_PATH", str(test_db_path))

    # 1. POST /api/context/associations/recompute
    recompute_resp = client.post("/api/context/associations/recompute")
    assert recompute_resp.status_code == 200
    data = recompute_resp.json()
    assert data["status"] == "ok"
    assert data["computed_count"] >= 1

    # 2. GET /api/context/associations
    get_resp = client.get("/api/context/associations?metric=hrv_ms")
    assert get_resp.status_code == 200
    assoc_data = get_resp.json()
    assert assoc_data["total"] >= 1
    alcohol_items = [it for it in assoc_data["items"] if it["factor"] == "alcohol"]
    assert len(alcohol_items) >= 1
    alcohol_24h = next((it for it in alcohol_items if it["window_hours"] == 24), None)
    assert alcohol_24h is not None
    assert alcohol_24h["sample_size"] == 3

    # 3. POST /api/context/feedback recalibra dinamicamente
    fb_resp = client.post(
        "/api/context/feedback",
        json={
            "metric": "hrv_ms",
            "date_ref": "2026-09-20",
            "is_helpful": True,
            "factor_key": "alcohol",
            "user_rating": "relevant",
        },
    )
    assert fb_resp.status_code == 201
    assert "feedback_id" in fb_resp.json()
