from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db
from longevidade.db.repository import LongevityRepository
from longevidade.ai.provider_factory import generate_llm_response, validate_provider_connection
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.prompts import DEFAULT_LONGEVITY_SYSTEM_PROMPT, STRUCTURED_INSIGHTS_PROMPT

router = APIRouter(prefix="/api/ai", tags=["AI Copilot"])


class AISettingsInput(BaseModel):
    active_provider: Optional[str] = "openrouter"
    selected_model: Optional[str] = "deepseek/deepseek-v4-pro"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    system_prompt_custom: Optional[str] = None


class TestConnectionInput(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None


class AIChatInput(BaseModel):
    prompt: str


@router.get("/settings")
def get_ai_settings():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    settings = repo.get_ai_settings()

    # Oculta as chaves reais com asteriscos ao enviar para a UI por segurança
    def obfuscate(k):
        if not k or len(k) < 8:
            return None
        return k[:4] + "*" * (len(k) - 8) + k[-4:]

    return {
        "active_provider": settings.get("active_provider", "openrouter"),
        "selected_model": settings.get("selected_model", "deepseek/deepseek-v4-pro"),
        "has_openai_key": bool(settings.get("openai_api_key")),
        "has_anthropic_key": bool(settings.get("anthropic_api_key")),
        "has_openrouter_key": bool(settings.get("openrouter_api_key")),
        "openai_api_key_masked": obfuscate(settings.get("openai_api_key")),
        "anthropic_api_key_masked": obfuscate(settings.get("anthropic_api_key")),
        "openrouter_api_key_masked": obfuscate(settings.get("openrouter_api_key")),
        "system_prompt_custom": settings.get("system_prompt_custom")
    }


@router.post("/settings")
def update_ai_settings(input_data: AISettingsInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    current = repo.get_ai_settings()
    data = input_data.model_dump(exclude_unset=True)

    # Preserva chaves existentes se a UI enviar string vazia/mascarada com *
    for key_name in ["openai_api_key", "anthropic_api_key", "openrouter_api_key"]:
        if key_name in data:
            val = data[key_name]
            if not val or "*" in str(val):
                data[key_name] = current.get(key_name)

    repo.upsert_ai_settings(data)
    return {"status": "ok", "message": "Configurações de IA salvas com sucesso"}


@router.post("/test-connection")
def test_connection(input_data: TestConnectionInput):
    success, msg = validate_provider_connection(
        provider=input_data.provider,
        api_key=input_data.api_key,
        model=input_data.model
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "ok", "message": msg}


@router.post("/generate-insights")
def generate_insights():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-pro")

    api_key_field = f"{provider}_api_key"
    api_key = settings.get(api_key_field)

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"Nenhuma chave de API configurada para o provedor '{provider}'. Configure sua API Key em Configurações de IA."
        )

    context_text = build_patient_clinical_context(DB_PATH)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    user_prompt = f"{context_text}\n\n{STRUCTURED_INSIGHTS_PROMPT}"

    raw_response, err = generate_llm_response(
        provider=provider,
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt
    )

    if err or not raw_response:
        raise HTTPException(status_code=500, detail=f"Erro na geração do LLM ({provider}): {err}")

    # Tenta extrair JSON limpo
    parsed_json = None
    try:
        clean_text = raw_response.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
        parsed_json = json.loads(clean_text)
    except Exception:
        # Fallback se a resposta vier em texto livre
        parsed_json = {
            "summary": "Análise gerada pelo Copiloto de IA",
            "insights": [
                {
                    "category": "geral",
                    "headline": "Análise de Saúde Integrada",
                    "insight_text": raw_response,
                    "actionable_steps": "Revise seus biomarcadores e mantenha a rotina de sono e exercícios."
                }
            ]
        }

    # Salva no histórico do banco de dados
    for item in parsed_json.get("insights", []):
        repo.save_ai_insight({
            "provider_used": provider,
            "model_used": model,
            "category": item.get("category", "geral"),
            "headline": item.get("headline", "Insight de Longevidade"),
            "insight_text": item.get("insight_text", ""),
            "actionable_steps": item.get("actionable_steps", ""),
            "user_prompt": "Análise geral automatizada de 30 dias"
        })

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "result": parsed_json
    }


@router.post("/chat")
def chat_copilot(input_data: AIChatInput):
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-pro")

    api_key_field = f"{provider}_api_key"
    api_key = settings.get(api_key_field)

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"Nenhuma chave de API configurada para o provedor '{provider}'. Configure sua API Key no ícone de engrenagem."
        )

    context_text = build_patient_clinical_context(DB_PATH)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    user_prompt = f"DADOS DO PACIENTE:\n{context_text}\n\nPERGUNTA DO PACIENTE:\n{input_data.prompt}"

    reply, err = generate_llm_response(
        provider=provider,
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt
    )

    if err or not reply:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Copiloto ({provider}): {err}")

    repo.save_ai_insight({
        "provider_used": provider,
        "model_used": model,
        "category": "chat",
        "headline": f"Pergunta: {input_data.prompt[:50]}...",
        "insight_text": reply,
        "actionable_steps": None,
        "user_prompt": input_data.prompt
    })

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "reply": reply
    }


@router.get("/history")
def get_ai_history():
    initialize_db(DB_PATH)
    repo = LongevityRepository(DB_PATH)
    return repo.get_ai_insights_history(limit=30)
