from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.app.config import get_db_path, ZEPP_DATA_DIR
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.hevy_client import (
    HevyClient,
    HevyCredentials,
    sync_hevy_workouts,
)
from longevidade.ingestion.zepp_importer import parse_zepp_workouts

router = APIRouter(prefix="/api/workouts", tags=["Workouts"])


class HevyCredentialsInput(BaseModel):
    api_key: str


class HevySyncRequest(BaseModel):
    max_pages: Optional[int] = 100


@router.get("", response_model=List[Dict[str, Any]])
def get_workouts(
    limit: int = Query(500, ge=1, le=2000),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    days: Optional[int] = Query(None),
):
    """Retorna lista de treinos individuais com filtros por fonte (Hevy/Zepp), categoria, busca textual e lazy-load."""
    db_path = get_db_path()
    try:
        initialize_db(db_path)
        repo = LongevityRepository(db_path)

        # Lazy-load fallback: se a tabela de treinos estiver vazia mas workout_history.json existir no disco
        if repo.count_workouts() == 0 and ZEPP_DATA_DIR.exists() and (ZEPP_DATA_DIR / "workout_history.json").is_file():
            parsed = parse_zepp_workouts(ZEPP_DATA_DIR)
            if parsed:
                repo.upsert_workouts(parsed)

        if days is not None and days > 0 and not start_date:
            from datetime import date, timedelta
            start_date = (date.today() - timedelta(days=days)).isoformat()

        return repo.get_workouts(
            limit=limit,
            category=category,
            start_date=start_date,
            end_date=end_date,
            source=source,
            search=search,
        )
    except FileNotFoundError:
        return []


@router.get("/summary")
def get_workouts_summary(
    days: Optional[int] = Query(None),
    source: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Retorna os KPIs agregados de treinos (volume total em kg, sessões, calorias, duração e FC média)."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_workouts_summary(
        days=days,
        source=source,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/hevy/status")
def get_hevy_status() -> Dict[str, Any]:
    """Retorna o status da conexão da API Hevy e informações do perfil autenticado."""
    client = HevyClient()
    key = client.api_key
    has_key = client.is_configured()

    masked_key = None
    if has_key and key:
        masked_key = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "***"

    if not has_key:
        return {
            "connected": False,
            "has_api_key": False,
            "masked_api_key": None,
            "user": None,
            "error": "Chave da API do Hevy não configurada.",
        }

    user_info, err = client.get_user_info()
    if err:
        return {
            "connected": False,
            "has_api_key": True,
            "masked_api_key": masked_key,
            "user": None,
            "error": err,
        }

    user_data = user_info.get("data") if isinstance(user_info, dict) else None
    return {
        "connected": True,
        "has_api_key": True,
        "masked_api_key": masked_key,
        "user": user_data,
        "error": None,
    }


@router.post("/hevy/credentials")
def save_hevy_credentials(data: HevyCredentialsInput) -> Dict[str, Any]:
    """Salva a chave de API do Hevy e testa a conexão imediatamente."""
    clean_key = data.api_key.strip()
    if not clean_key:
        raise HTTPException(status_code=400, detail="A chave de API não pode estar vazia.")

    # Testa chave diretamente
    test_client = HevyClient(api_key=clean_key)
    user_info, err = test_client.get_user_info()
    if err:
        raise HTTPException(status_code=400, detail=f"Chave da API inválida ou erro no Hevy: {err}")

    # Salva no cofre
    HevyCredentials.save_api_key(clean_key)
    masked_key = f"{clean_key[:6]}...{clean_key[-4:]}" if len(clean_key) > 10 else "***"

    return {
        "status": "ok",
        "message": "Chave da API do Hevy validada e salva com sucesso.",
        "masked_api_key": masked_key,
        "user": user_info.get("data") if isinstance(user_info, dict) else None,
    }


class ExerciseLinkInput(BaseModel):
    exercise_title: str
    catalog_id: str


@router.post("/hevy/sync")
def sync_hevy(req: HevySyncRequest = HevySyncRequest()) -> Dict[str, Any]:
    """Dispara a sincronização de treinos do Hevy para o repositório SQLite."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    client = HevyClient()

    result = sync_hevy_workouts(repo=repo, client=client, max_pages=req.max_pages or 100)
    return result


@router.get("/catalog", response_model=Dict[str, Any])
def get_exercise_catalog(
    query: Optional[str] = Query(None),
    muscle_group: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    body_part: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Dict[str, Any]:
    """Retorna itens paginados do catálogo de exercícios físicos com filtros."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    return repo.get_exercise_catalog(
        query=query,
        muscle_group=muscle_group,
        equipment=equipment,
        body_part=body_part,
        limit=limit,
        offset=offset,
    )


@router.get("/catalog/{catalog_id}", response_model=Dict[str, Any])
def get_catalog_exercise_detail(catalog_id: str) -> Dict[str, Any]:
    """Retorna os detalhes completos de um exercício do catálogo por ID."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)
    item = repo.get_exercise_catalog_by_id(catalog_id)
    if not item:
        raise HTTPException(status_code=404, detail="Exercício não encontrado no catálogo.")
    return item


@router.post("/exercises/link")
def link_exercise_to_catalog(data: ExerciseLinkInput) -> Dict[str, Any]:
    """Vincula manualmente um título de exercício do treino a um item do catálogo."""
    title = data.exercise_title.strip()
    catalog_id = data.catalog_id.strip()
    if not title:
        raise HTTPException(status_code=400, detail="O título do exercício não pode estar vazio.")
    if not catalog_id:
        raise HTTPException(status_code=400, detail="O ID do catálogo não pode estar vazio.")

    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    cat_item = repo.get_exercise_catalog_by_id(catalog_id)
    if not cat_item:
        raise HTTPException(status_code=404, detail="Exercício de catálogo informado não existe.")

    repo.set_exercise_mapping(title, catalog_id, is_manual=1, confidence=1.0)
    return {
        "status": "ok",
        "message": f"Exercício '{title}' vinculado com sucesso ao item #{catalog_id} ({cat_item['name']}).",
        "linked_exercise": cat_item,
    }


@router.get("/{workout_id}")
def get_workout_details(workout_id: str) -> Dict[str, Any]:
    """Retorna os detalhes completos de uma sessão de treino incluindo exercícios e séries estruturados."""
    db_path = get_db_path()
    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    workout = repo.get_workout_details(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Sessão de treino não encontrada.")
    return workout
