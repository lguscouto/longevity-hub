"""Testes para o CRUD de intervenções (Task 6.4).

Usa fixtures sintéticas — nunca toca o banco operacional.
Respeita estritamente o AGENTS.md injetando o fixture client: TestClient.
"""

from fastapi.testclient import TestClient


class TestInterventionsRouter:
    """Testa CRUD /api/interventions com dados sintéticos."""

    def test_returns_empty_list_when_no_interventions(self, client: TestClient):
        """Sem intervenções cadastradas, GET retorna lista vazia."""
        response = client.get("/api/interventions")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_and_list_intervention(self, client: TestClient):
        """Cria uma intervenção via POST e confirma que aparece no GET."""
        payload = {
            "name": "Creatina 5g",
            "category": "Suplemento",
            "start_date": "2026-07-01",
            "dosage": "5 g/dia",
            "target_metric": "força muscular",
            "notes": "Teste de creatina",
        }
        res = client.post("/api/interventions", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "ok"
        assert body["id"] is not None

        res_list = client.get("/api/interventions")
        assert res_list.status_code == 200
        data = res_list.json()
        assert len(data) == 1
        entry = data[0]
        assert entry["name"] == "Creatina 5g"
        assert entry["category"] == "Suplemento"
        assert entry["start_date"] == "2026-07-01"
        assert entry["dosage"] == "5 g/dia"
        assert entry["is_active"] == 1

    def test_create_intervention_defaults_start_date(self, client: TestClient):
        """Sem start_date, a intervenção recebe a data atual."""
        payload = {
            "name": "NMN",
            "category": "Suplemento",
        }
        res = client.post("/api/interventions", json=payload)
        assert res.status_code == 200
        intervention_id = res.json()["id"]

        res_get = client.get("/api/interventions")
        data = res_get.json()
        entry = next(i for i in data if i["id"] == intervention_id)
        assert entry["start_date"] is not None

    def test_update_intervention(self, client: TestClient):
        """Atualiza dosagem e target_metric de uma intervenção."""
        payload = {
            "name": "Berberina",
            "category": "Suplemento",
            "start_date": "2026-07-01",
            "dosage": "500 mg",
            "target_metric": "glicemia",
        }
        res = client.post("/api/interventions", json=payload)
        intervention_id = res.json()["id"]

        update = {
            "dosage": "1000 mg",
            "target_metric": "glicemia & inflamação",
        }
        res_put = client.put(f"/api/interventions/{intervention_id}", json=update)
        assert res_put.status_code == 200
        put_body = res_put.json()
        assert put_body["status"] == "ok"
        updated = put_body["intervention"]
        assert updated["dosage"] == "1000 mg"
        assert updated["target_metric"] == "glicemia & inflamação"
        assert updated["name"] == "Berberina"

    def test_update_intervention_not_found(self, client: TestClient):
        """PUT em id inexistente retorna 404."""
        res = client.put("/api/interventions/99999", json={"dosage": "10 mg"})
        assert res.status_code == 404

    def test_delete_intervention(self, client: TestClient):
        """Remove uma intervenção e ela some da listagem."""
        payload = {
            "name": "Ômega-3",
            "category": "Suplemento",
            "start_date": "2026-06-01",
        }
        res = client.post("/api/interventions", json=payload)
        intervention_id = res.json()["id"]

        res_del = client.delete(f"/api/interventions/{intervention_id}")
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "ok"

        res_list = client.get("/api/interventions")
        assert len(res_list.json()) == 0

    def test_delete_intervention_not_found(self, client: TestClient):
        """DELETE em id inexistente retorna 404."""
        res = client.delete("/api/interventions/99999")
        assert res.status_code == 404

    def test_list_only_active(self, client: TestClient):
        """Filtro only_active=true retorna apenas intervenções ativas."""
        client.post("/api/interventions", json={
            "name": "Ativa",
            "category": "Suplemento",
            "start_date": "2026-07-01",
            "is_active": 1,
        })
        client.post("/api/interventions", json={
            "name": "Inativa",
            "category": "Hormônio",
            "start_date": "2026-06-01",
            "is_active": 0,
        })

        res_all = client.get("/api/interventions")
        assert len(res_all.json()) == 2

        res_active = client.get("/api/interventions?only_active=true")
        active_list = res_active.json()
        assert len(active_list) == 1
        assert active_list[0]["name"] == "Ativa"
        assert active_list[0]["is_active"] == 1

    def test_intervention_contract(self, client: TestClient):
        """Verifica que todos os campos esperados estão presentes na resposta."""
        client.post("/api/interventions", json={
            "name": "Magnésio Glicinato",
            "category": "Suplemento",
            "start_date": "2026-07-15",
            "end_date": "2026-12-31",
            "dosage": "400 mg",
            "target_metric": "sono profundo",
            "is_active": 1,
            "notes": "Tomar antes de dormir",
        })

        res = client.get("/api/interventions")
        entry = res.json()[0]

        expected_fields = {
            "id", "name", "category", "start_date", "end_date",
            "dosage", "target_metric", "is_active", "notes", "created_at",
        }
        assert set(entry.keys()) == expected_fields
