"""
Testes para validação da sincronização automática do peso atual (current_weight_kg)
e recálculo dinâmico do IMC no perfil do usuário.
Garante:
1. Atualização automática do user_profile a partir da medição mais recente (Google Health API / Raw / Daily).
2. Não propagação indevida de pesagens antigas pelo Zepp (sem forward-fill).
3. Preservação de dados entre provedores com COALESCE em upsert_daily_metric.
4. Extração fiel do timestamp de pesagem em _build_raw_point.
"""

from __future__ import annotations

import datetime
import sys
from pathlib import Path
import pytest
from starlette.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
ZEPP_SCRIPTS_DIR = BASE_DIR / "integrations" / "zepp" / "scripts"
if str(ZEPP_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(ZEPP_SCRIPTS_DIR))

from backend.app.config import get_db_path
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.integrations.google_health.client import _build_raw_point
from health_metrics import _select_weight


@pytest.fixture
def repo(client):
    db_path = get_db_path()
    initialize_db(db_path)
    return LongevityRepository(db_path)


def test_build_raw_point_extracts_sample_time():
    """Valida que _build_raw_point extrai sampleTime.physicalTime para start_time e recorded_at."""
    pt = {
        "name": "users/123/dataTypes/weight/dataPoints/456",
        "dataSource": {"platform": "FITBIT_WEB_API"},
        "weight": {
            "sampleTime": {
                "physicalTime": "2026-09-20T15:26:34Z",
                "civilTime": {
                    "date": {"year": 2026, "month": 9, "day": 20},
                    "time": {"hours": 12, "minutes": 26, "seconds": 34},
                },
            },
            "weightGrams": 87000,
        },
    }
    raw = _build_raw_point("weight", pt)
    assert raw["data_type"] == "weight"
    assert raw["value"] == 87.0
    assert raw["start_time"] == "2026-09-20T15:26:34+00:00"
    assert raw["recorded_at"] == "2026-09-20T15:26:34+00:00"


def test_zepp_select_weight_only_on_measurement_day():
    """Valida que pesagem do Zepp só é selecionada no dia exato da pesagem (sem forward-fill)."""
    # Item medido em 2026-09-04
    ts_sept4 = int(datetime.datetime(2026, 9, 4, 10, 0, tzinfo=datetime.timezone.utc).timestamp())
    payload = {
        "items": [
            {
                "generatedTime": ts_sept4,
                "summary": {"weight": 89.2, "bmi": 30.9},
            }
        ]
    }

    # No dia da pesagem, retorna os valores
    weight, dt_str, bmi = _select_weight(payload, datetime.date(2026, 9, 4))
    assert weight == 89.2
    assert dt_str == "2026-09-04"
    assert bmi == 30.9

    # Em dias posteriores, não preenche artificialmente
    weight_later, dt_later, bmi_later = _select_weight(payload, datetime.date(2026, 9, 25))
    assert weight_later is None
    assert dt_later is None
    assert bmi_later is None


def test_upsert_daily_metric_coalesce_preserves_existing_weight(repo: LongevityRepository):
    """Valida que upsert_daily_metric com peso None não sobrescreve medição já gravada."""
    # 1. Google Health grava peso de 87.0 kg para o dia 2026-09-20
    repo.upsert_daily_metric({
        "date_ref": "2026-09-20",
        "weight_kg": 87.0,
        "source": "GoogleHealthAPI",
    })
    metric = repo.get_daily_metric_by_date("2026-09-20")
    assert metric is not None
    assert metric["weight_kg"] == 87.0

    # 2. Zepp sincroniza passos para o mesmo dia sem registrar peso
    repo.upsert_daily_metric({
        "date_ref": "2026-09-20",
        "steps": 10500,
        "weight_kg": None,
        "source": "Zepp",
    })
    updated = repo.get_daily_metric_by_date("2026-09-20")
    assert updated is not None
    assert updated["steps"] == 10500
    assert updated["weight_kg"] == 87.0  # Preservado via COALESCE!


def test_profile_weight_sync_from_latest_data(client: TestClient, repo: LongevityRepository):
    """Valida que GET /api/profile sincroniza e reflete o peso mais recente e recalcula o IMC."""
    # Configura perfil com altura
    repo.upsert_user_profile({
        "name": "Gustavo",
        "height_cm": 170.0,
        "target_weight_kg": 75.0,
    })

    # Insere ponto de pesagem bruta mais recente (87.0 kg em 2026-09-20)
    repo.insert_health_data_points([
        {
            "id": "point_weight_1",
            "provider": "google_health",
            "data_type": "weight",
            "source": "FITBIT_WEB_API",
            "start_time": "2026-09-20T15:26:34+00:00",
            "recorded_at": "2026-09-20T15:26:34+00:00",
            "value": 87.0,
            "unit": "kg",
        }
    ])

    resp = client.get("/api/profile")
    assert resp.status_code == 200
    data = resp.json()

    assert data["current_weight_kg"] == 87.0
    # IMC: 87.0 / (1.70 * 1.70) = 87 / 2.89 = 30.103... -> 30.1
    assert data["bmi"] == 30.1

    # Verifica se o perfil persistiu no banco
    db_profile = repo.get_user_profile()
    assert db_profile["current_weight_kg"] == 87.0


def test_profile_manual_update_weight(client: TestClient, repo: LongevityRepository):
    """Valida que a atualização manual do peso via POST /api/profile funciona corretamente."""
    repo.upsert_user_profile({
        "name": "Gustavo",
        "height_cm": 170.0,
    })

    resp = client.post("/api/profile", json={"current_weight_kg": 85.5})
    assert resp.status_code == 200

    profile_resp = client.get("/api/profile")
    assert profile_resp.status_code == 200
    data = profile_resp.json()
    assert data["current_weight_kg"] == 85.5
    # IMC: 85.5 / 2.89 = 29.584... -> 29.6
    assert data["bmi"] == 29.6
