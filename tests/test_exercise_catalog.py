from __future__ import annotations

import pytest
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.exercises.matcher import (
    build_media_urls,
    match_exercise_title,
    normalize_string,
    translate_pt_to_en,
)


def test_matcher_normalization_and_translation():
    norm = normalize_string("Elevação Lateral (Halter)")
    assert "elevacao lateral halter" == norm

    trans = translate_pt_to_en(norm)
    assert "lateral raise dumbbell" in trans

    # Supino inclinado na máquina
    norm2 = normalize_string("Supino Inclinado (Máquina)")
    trans2 = translate_pt_to_en(norm2)
    assert "incline chest press lever" in trans2


def test_matcher_matching_accuracy():
    catalog_sample = [
        {"id": "0025", "name": "barbell bench press", "equipment": "barbell"},
        {"id": "0334", "name": "dumbbell lateral raise", "equipment": "dumbbell"},
        {"id": "0585", "name": "lever leg extension", "equipment": "lever"},
        {"id": "0590", "name": "lever seated leg curl", "equipment": "lever"},
    ]

    # Test Supino
    matched_id, score = match_exercise_title("Supino Reto (Barra)", catalog_sample)
    assert matched_id == "0025"
    assert score > 0.4

    # Test Elevação Lateral
    matched_id, score = match_exercise_title("Elevação Lateral com Halteres", catalog_sample)
    assert matched_id == "0334"
    assert score > 0.4

    # Test Cadeira Extensora
    matched_id, score = match_exercise_title("Cadeira Extensora (Máquina)", catalog_sample)
    assert matched_id == "0585"
    assert score > 0.4


def test_build_media_urls():
    urls = build_media_urls("images/0025-thumb.jpg", "videos/0025-anim.gif")
    assert "cdn.jsdelivr.net" in urls["image_url"]
    assert "0025-thumb.jpg" in urls["image_url"]
    assert "cdn.jsdelivr.net" in urls["gif_url"]
    assert "0025-anim.gif" in urls["gif_url"]
    assert "raw.githubusercontent.com" in urls["gif_fallback"]


def test_api_catalog_list_and_filters(client):
    res = client.get("/api/workouts/catalog?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] > 0
    assert len(data["items"]) <= 10

    # Search query
    res_search = client.get("/api/workouts/catalog?query=bench%20press")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total"] > 0
    assert any("bench press" in item["name"].lower() for item in search_data["items"])


def test_api_catalog_detail(client):
    # Search for an exercise to get a valid ID
    list_res = client.get("/api/workouts/catalog?limit=1")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    cat_id = items[0]["id"]

    res = client.get(f"/api/workouts/catalog/{cat_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == cat_id
    assert "name" in detail
    assert "gif_url" in detail
    assert "target_pt" in detail

    # 404 for invalid ID
    res_404 = client.get("/api/workouts/catalog/invalid-id-999999")
    assert res_404.status_code == 404


def test_api_link_exercise_and_enrich_workout_details(client, tmp_path, monkeypatch):
    from backend.app.config import get_db_path
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # Insert a synthetic workout with exercises
    workout_id = "test-workout-media-1"
    repo.upsert_hevy_workouts([
        {
            "id": workout_id,
            "workout_date": "2026-09-18",
            "workout_time": "10:00",
            "title": "Treino de Peito e Tríceps",
            "category": "Musculação",
            "activity_type": "strength_training",
            "duration_min": 55.0,
            "calories": 320,
            "volume_kg": 3500.0,
            "sets_count": 6,
            "reps_count": 60,
            "source": "Hevy",
            "exercises": [
                {
                    "id": "ex-1",
                    "exercise_index": 0,
                    "title": "Supino Reto com Barra",
                    "notes": "Pesado",
                    "sets": [
                        {"set_index": 0, "set_type": "normal", "weight_kg": 80.0, "reps": 10},
                        {"set_index": 1, "set_type": "normal", "weight_kg": 85.0, "reps": 8},
                    ],
                },
                {
                    "id": "ex-2",
                    "exercise_index": 1,
                    "title": "Exercício Customizado Desconhecido",
                    "notes": None,
                    "sets": [
                        {"set_index": 0, "set_type": "normal", "weight_kg": 20.0, "reps": 12},
                    ],
                },
            ],
        }
    ])

    # Fetch workout details via API
    res = client.get(f"/api/workouts/{workout_id}")
    assert res.status_code == 200
    w_data = res.json()
    assert len(w_data["exercises"]) == 2

    # First exercise (Supino Reto) should be auto-matched
    ex1 = w_data["exercises"][0]
    assert ex1["title"] == "Supino Reto com Barra"
    assert ex1["media"] is not None
    assert "bench press" in ex1["media"]["name"].lower() or "chest" in ex1["media"]["body_part"].lower()
    assert ex1["media"]["gif_url"] is not None

    # Now manually link second exercise
    # Get a valid catalog item
    cat_items = repo.get_exercise_catalog(limit=1)["items"]
    target_cat_id = cat_items[0]["id"]
    target_cat_name = cat_items[0]["name"]

    link_res = client.post(
        "/api/workouts/exercises/link",
        json={
            "exercise_title": "Exercício Customizado Desconhecido",
            "catalog_id": target_cat_id,
        },
    )
    assert link_res.status_code == 200
    assert link_res.json()["status"] == "ok"

    # Re-fetch workout details; second exercise should now have the newly linked media
    res_after = client.get(f"/api/workouts/{workout_id}")
    assert res_after.status_code == 200
    ex2_after = res_after.json()["exercises"][1]
    assert ex2_after["media"] is not None
    assert ex2_after["media"]["catalog_id"] == target_cat_id
    assert ex2_after["media"]["name"] == target_cat_name
