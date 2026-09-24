"""
Testes de conformidade P0.5: Remoção de defaults clínicos fictícios (Longevidade Hub).
Garante que usuários sem dados não recebem idade=32/40, peso=75, altura=170, nem e-mails/gêneros inventados.
"""

from pathlib import Path
from starlette.testclient import TestClient

from longevidade.algorithms.phenoage import calculate_phenoage
from longevidade.calculators.kdm_age import calculate_kdm_biological_age


def test_profile_empty_returns_none_for_clinical_fields(client: TestClient):
    """P0.5: Usuário sem cadastro não deve receber idade=32.0, altura=170.0, peso=75.0 ou email falso."""
    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    assert data["chronological_age"] is None
    assert data["birthdate"] is None
    assert data["height_cm"] is None
    assert data["current_weight_kg"] is None
    assert data["target_weight_kg"] is None
    assert data["bmi"] is None
    assert data["gender"] is None
    assert data["email"] is None


def test_profile_bmi_only_when_both_weight_and_height_present(client: TestClient):
    """P0.5: IMC não é inventado se faltar altura ou peso."""
    # Apenas altura informada
    client.post("/api/profile", json={"height_cm": 180.0})
    resp1 = client.get("/api/profile")
    assert resp1.json()["height_cm"] == 180.0
    assert resp1.json()["current_weight_kg"] is None
    assert resp1.json()["bmi"] is None

    # Altura e peso informados
    client.post("/api/profile", json={"height_cm": 180.0, "target_weight_kg": 78.0})
    # IMC depende do peso atual (current_weight_kg)
    client.post("/api/profile", json={"height_cm": 180.0})
    resp2 = client.get("/api/profile")
    assert resp2.json()["bmi"] is None


def test_phenoage_missing_chronological_age_returns_incomplete():
    """P0.5: PhenoAge sem idade cronológica é estritamente incompleto (não assume 40.0)."""
    full_labs_no_age = {
        "glucose_mgdl": 85.0,
        "creatinine_mgdl": 0.85,
        "albumin_gdl": 4.7,
        "hscrp_mgl": 0.3,
        "lymphocyte_pct": 32.0,
        "mcv_fl": 88.0,
        "rdw_pct": 12.0,
        "alk_phos_ul": 55.0,
        "wbc_1000ul": 5.2,
    }
    res = calculate_phenoage(full_labs_no_age)
    assert res["status"] == "incomplete"
    assert res["pheno_age"] is None
    assert res["chronological_age"] is None
    assert "chronological_age" in res["missing_biomarkers"]


def test_kdm_missing_chronological_age_returns_incomplete():
    """P0.5: KDM Age sem idade cronológica é estritamente incompleto (não assume 40.0)."""
    labs = {"glucose_mgdl": 88.0, "creatinine_mgdl": 0.85}
    res = calculate_kdm_biological_age(None, labs)
    assert res["status"] == "incomplete"
    assert res["kdm_age"] is None
    assert res["chronological_age"] is None
    assert "chronological_age" in res["missing_biomarkers"]
