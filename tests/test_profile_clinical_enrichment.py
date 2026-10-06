"""
Testes de conformidade para o enriquecimento clínico e de estilo de vida do Perfil (Fase 1).
Verifica a persistência de novos campos, agregações dinâmicas de biomarcadores padrão-ouro,
cálculo de WHtR, idade biológica e respeito estrito ao Princípio P0.5 (zero defaults fictícios).
"""

import sqlite3
from starlette.testclient import TestClient
from backend.app.config import get_db_path


def test_profile_empty_returns_clean_nulls_and_safe_structures(client: TestClient):
    """P0.5: Perfil não preenchido deve retornar estruturas seguras com valores None/vazios."""
    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    # Campos cadastrais básicos
    assert data["chronological_age"] is None
    assert data["birthdate"] is None
    assert data["height_cm"] is None
    assert data["current_weight_kg"] is None
    assert data["target_weight_kg"] is None
    assert data["bmi"] is None
    assert data["gender"] is None

    # Ficha Médica
    assert data["blood_type"] is None
    assert data["allergies"] is None
    assert data["family_history"] is None
    assert data["chronic_conditions"] is None
    assert data["emergency_contact_name"] is None
    assert data["primary_physician"] is None
    assert data["medical_id"]["blood_type"] is None
    assert data["medical_id"]["allergies"] is None
    assert data["medical_id"]["emergency_contact"] is None

    # Idade Biológica (sem exames cadastrados)
    assert data["biological_age"] is None

    # Biomarcadores de ouro (sem registros diários)
    assert data["golden_metrics"]["vo2_max"] is None
    assert data["golden_metrics"]["whtr"] is None
    assert data["golden_metrics"]["hrv_ms"] is None


def test_profile_update_and_persistence(client: TestClient):
    """Garante que novos atributos de ficha médica e estilo de vida são persistidos via POST."""
    payload = {
        "name": "Gustavo Longevidade",
        "birthdate": "1994-03-22",
        "height_cm": 170.0,
        "blood_type": "O+",
        "allergies": "Penicilina, Glúten (leve)",
        "family_history": "Cardiovascular paterno precoce",
        "chronic_conditions": "Nenhuma",
        "emergency_contact_name": "Juliana",
        "emergency_contact_phone": "+55 (11) 98765-4321",
        "primary_physician": "Dr. Roberto Santos",
        "longevity_goals": ["cardiovascular", "hypertrophy", "phenoage"],
        "protocol_start_date": "2026-01-01",
        "fasting_window": "16:8 (12:00 - 20:00)",
        "chronotype": "Intermediário Matutino",
        "daily_water_target_ml": 3200,
        "target_sleep_hours": 8.0,
        "target_body_fat_pct": 15.0,
    }

    res_post = client.post("/api/profile", json=payload)
    assert res_post.status_code == 200
    assert res_post.json()["status"] == "ok"

    res_get = client.get("/api/profile")
    assert res_get.status_code == 200
    data = res_get.json()

    # Validação nos campos diretos
    assert data["name"] == "Gustavo Longevidade"
    assert data["blood_type"] == "O+"
    assert data["allergies"] == "Penicilina, Glúten (leve)"
    assert data["emergency_contact_name"] == "Juliana"
    assert data["emergency_contact_phone"] == "+55 (11) 98765-4321"
    assert data["primary_physician"] == "Dr. Roberto Santos"
    assert data["longevity_goals"] == ["cardiovascular", "hypertrophy", "phenoage"]
    assert data["fasting_window"] == "16:8 (12:00 - 20:00)"
    assert data["chronotype"] == "Intermediário Matutino"
    assert data["daily_water_target_ml"] == 3200
    assert data["target_sleep_hours"] == 8.0
    assert data["target_body_fat_pct"] == 15.0

    # Validação nos blocos aninhados
    assert data["medical_id"]["blood_type"] == "O+"
    assert data["medical_id"]["allergies"] == "Penicilina, Glúten (leve)"
    assert data["medical_id"]["emergency_contact"]["name"] == "Juliana"
    assert data["medical_id"]["emergency_contact"]["phone"] == "+55 (11) 98765-4321"

    assert data["protocol"]["streak_days"] is not None
    assert data["protocol"]["streak_days"] > 0
    assert "cardiovascular" in data["protocol"]["longevity_goals"]

    assert data["lifestyle"]["fasting_window"] == "16:8 (12:00 - 20:00)"
    assert data["lifestyle"]["daily_water_target_ml"] == 3200


def test_profile_biological_age_aggregation(client: TestClient):
    """Valida a agregação automática do PhenoAge mais recente no perfil."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO phenoage_records (
                calculated_at, chronological_age, pheno_age, age_delta, record_origin
            ) VALUES ('2026-10-01T12:00:00', 32.0, 29.4, -2.6, 'verified');
            """
        )
        conn.commit()
    finally:
        conn.close()

    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    assert data["biological_age"] is not None
    assert data["biological_age"]["biological_age"] == 29.4
    assert data["biological_age"]["chronological_age"] == 32.0
    assert data["biological_age"]["age_delta"] == -2.6
    assert data["biological_age"]["pace_of_aging"] == 0.92
    assert data["biological_age"]["status"] == "Otimização Celular Favorável"


def test_profile_golden_metrics_and_whtr_calculation(client: TestClient):
    """Garante que biomarcadores de ouro são agregados e que WHtR é calculado com exatidão."""
    client.post("/api/profile", json={"height_cm": 170.0, "target_body_fat_pct": 15.0})

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO daily_metrics (
                date_ref, vo2_max, rhr_bpm, hrv_ms, body_fat_pct, waist_cm, grip_strength_kg, spo2_avg_pct
            ) VALUES ('2026-10-04', 45.0, 53.0, 62.0, 21.0, 85.0, 49.0, 98.5);
            """
        )
        conn.commit()
    finally:
        conn.close()

    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    golden = data["golden_metrics"]
    assert golden["date_ref"] == "2026-10-04"
    assert golden["vo2_max"] == 45.0
    assert golden["vo2_max_percentile"] == "Top 20%"
    assert golden["rhr_bpm"] == 53.0
    assert golden["hrv_ms"] == 62.0
    assert golden["body_fat_pct"] == 21.0
    assert golden["target_body_fat_pct"] == 15.0
    assert golden["waist_cm"] == 85.0
    # WHtR: 85.0 / 170.0 = 0.50
    assert golden["whtr"] == 0.50
    assert golden["grip_strength_kg"] == 49.0
    assert golden["spo2_avg_pct"] == 98.5


def test_profile_active_supplements_count(client: TestClient):
    """Valida a contagem de compostos ativos exibidos no resumo de estilo de vida."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM supplement_stack;")
        conn.execute("INSERT INTO supplement_stack (name, dosage, is_active, start_date) VALUES ('NMN', '500mg', 1, '2026-06-01');")
        conn.execute("INSERT INTO supplement_stack (name, dosage, is_active, start_date) VALUES ('Creatina', '5g', 1, '2026-06-01');")
        conn.execute("INSERT INTO supplement_stack (name, dosage, is_active, start_date) VALUES ('Antigo', '100mg', 0, '2026-01-01');")
        conn.commit()
    finally:
        conn.close()

    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    assert data["lifestyle"]["active_supplements_count"] == 2
