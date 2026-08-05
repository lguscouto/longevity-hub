import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.prompts import DEFAULT_LONGEVITY_SYSTEM_PROMPT, STRUCTURED_INSIGHTS_PROMPT
from longevidade.ai.provider_factory import generate_llm_response, validate_provider_connection
from longevidade.ai.secrets_store import AISecretsStore, KeyringSecretsStore, mask_secret
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.algorithms.daily_guidance import generate_daily_guidance
from longevidade.calculators.energy_and_stress import calculate_energy_bank

router = APIRouter(prefix="/api/ai", tags=["AI Copilot"])

_AI_SECRETS_STORE = KeyringSecretsStore()


def get_ai_secrets_store() -> AISecretsStore:
    return _AI_SECRETS_STORE


def _normalize_privacy_mode(value: Optional[str]) -> str:
    return "full" if value == "full" else "minimal"


class AISettingsInput(BaseModel):
    active_provider: Optional[str] = "openrouter"
    selected_model: Optional[str] = "deepseek/deepseek-v4-pro"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    privacy_mode: Optional[str] = "minimal"
    system_prompt_custom: Optional[str] = None


class TestConnectionInput(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None


class AIChatInput(BaseModel):
    prompt: str


def _repo_for_current_db() -> LongevityRepository:
    db_path = get_db_path()
    return LongevityRepository(db_path, secrets_store=get_ai_secrets_store())


def _require_provider_secret(repo: LongevityRepository, provider: str, detail_hint: str) -> str:
    api_key = repo.get_ai_secret(provider)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"Nenhuma chave de API configurada para o provedor '{provider}'. {detail_hint}",
        )
    return api_key


@router.get("/settings")
def get_ai_settings():
    repo = _repo_for_current_db()
    try:
        settings = repo.get_ai_settings()
    except FileNotFoundError:
        settings = {}

    return {
        "active_provider": settings.get("active_provider", "openrouter"),
        "selected_model": settings.get("selected_model", "deepseek/deepseek-v4-pro"),
        "privacy_mode": _normalize_privacy_mode(settings.get("privacy_mode")),
        "has_openai_key": bool(settings.get("has_openai_key")),
        "has_anthropic_key": bool(settings.get("has_anthropic_key")),
        "has_openrouter_key": bool(settings.get("has_openrouter_key")),
        "openai_api_key_masked": mask_secret(repo.get_ai_secret("openai")),
        "anthropic_api_key_masked": mask_secret(repo.get_ai_secret("anthropic")),
        "openrouter_api_key_masked": mask_secret(repo.get_ai_secret("openrouter")),
        "system_prompt_custom": settings.get("system_prompt_custom"),
    }


@router.post("/settings")
def update_ai_settings(input_data: AISettingsInput):
    repo = _repo_for_current_db()
    data = input_data.model_dump(exclude_unset=True)
    if "privacy_mode" in data:
        data["privacy_mode"] = _normalize_privacy_mode(data.get("privacy_mode"))

    repo.upsert_ai_settings(data)
    return {"status": "ok", "message": "Configurações de IA salvas com sucesso"}


@router.post("/test-connection")
def test_connection(input_data: TestConnectionInput):
    success, msg = validate_provider_connection(
        provider=input_data.provider,
        api_key=input_data.api_key,
        model=input_data.model,
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "ok", "message": msg}


@router.post("/generate-insights")
def generate_insights():
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-pro")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    api_key = _require_provider_secret(
        repo,
        provider,
        "Configure sua API Key em Configurações de IA.",
    )

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    user_prompt = f"{context_text}\n\n{STRUCTURED_INSIGHTS_PROMPT}"

    raw_response, err = generate_llm_response(
        provider=provider,
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    if err or not raw_response:
        raise HTTPException(status_code=500, detail=f"Erro na geração do LLM ({provider}): {err}")

    parsed_json = None
    try:
        clean_text = raw_response.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
        parsed_json = json.loads(clean_text)
    except Exception:
        parsed_json = {
            "summary": "Análise gerada pelo Copiloto de IA",
            "insights": [
                {
                    "category": "geral",
                    "headline": "Análise de Saúde Integrada",
                    "insight_text": raw_response,
                    "actionable_steps": "Revise seus biomarcadores e mantenha a rotina de sono e exercícios.",
                }
            ],
        }

    # P1: Validação determinística de guardrails no pós-processamento do LLM
    today_str = date.today().isoformat()
    today_metric = repo.get_daily_metric_by_date(today_str)
    all_60_metrics = repo.get_daily_metrics(days=60)
    history_metrics = [m for m in all_60_metrics if m.get("date_ref") and m["date_ref"] < today_str]
    guidance_res = generate_daily_guidance(today_metric, history_metrics)
    energy_res = calculate_energy_bank(today_metric)

    is_restricted = guidance_res.get("state") == "insufficient_data" or guidance_res.get("confidence") in ("low", "unavailable") or energy_res.get("status") == "not_verifiable"

    if is_restricted:
        parsed_json["guardrail_applied"] = True
        for insight in parsed_json.get("insights", []):
            txt = (insight.get("insight_text", "") + " " + insight.get("actionable_steps", "")).lower()
            if any(term in txt for term in ["intenso", "intensa", "vo2 max", "exigente", "ignorar", "força", "alta intensidade"]):
                insight["actionable_steps"] = (
                    "⚠️ [GUARDRAIL ATIVO]: Dados fisiológicos/atividade ausentes ou incompletos hoje. "
                    "Treino intenso e atividades exigentes foram bloqueados. "
                    + (guidance_res.get("primary_action") or "Sincronize seu dispositivo.")
                )

    audit_prompt = f"Análise geral automatizada de 30 dias (privacy_mode={privacy_mode})"
    for item in parsed_json.get("insights", []):
        repo.save_ai_insight(
            {
                "provider_used": provider,
                "model_used": model,
                "category": item.get("category", "geral"),
                "headline": item.get("headline", "Insight de Longevidade"),
                "insight_text": item.get("insight_text", ""),
                "actionable_steps": item.get("actionable_steps", ""),
                "user_prompt": audit_prompt,
            }
        )

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "privacy_mode": privacy_mode,
        "result": parsed_json,
    }


@router.post("/chat")
def chat_copilot(input_data: AIChatInput):
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-pro")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    api_key = _require_provider_secret(
        repo,
        provider,
        "Configure sua API Key no ícone de engrenagem.",
    )

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    user_prompt = f"DADOS DO PACIENTE:\n{context_text}\n\nPERGUNTA DO PACIENTE:\n{input_data.prompt}"

    reply, err = generate_llm_response(
        provider=provider,
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    if err or not reply:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar o Copiloto ({provider}): {err}")

    # P1: Validação determinística de guardrails no pós-processamento do Chat LLM
    today_str = date.today().isoformat()
    today_metric = repo.get_daily_metric_by_date(today_str)
    all_60_metrics = repo.get_daily_metrics(days=60)
    history_metrics = [m for m in all_60_metrics if m.get("date_ref") and m["date_ref"] < today_str]
    guidance_res = generate_daily_guidance(today_metric, history_metrics)
    energy_res = calculate_energy_bank(today_metric)

    is_restricted = guidance_res.get("state") == "insufficient_data" or guidance_res.get("confidence") in ("low", "unavailable") or energy_res.get("status") == "not_verifiable"

    if is_restricted:
        reply_lower = reply.lower()
        if any(term in reply_lower for term in ["intenso", "intensa", "vo2 max", "exigente", "ignorar", "alta intensidade"]):
            reply += (
                "\n\n---\n⚠️ **[TRAVA DE SEGURANÇA ALGORÍTMICA ATIVA]**: "
                "Apesar da sugestão do modelo, a cobertura de dados fisiológicos/atividade do dia é insuficiente ou parcial. "
                "Treinos intensos estão BLOQUEADOS deterministicamente pelo sistema até a sincronização completa."
            )

    audit_prompt = input_data.prompt if privacy_mode == "full" else "[prompt omitido por privacy_mode=minimal]"
    repo.save_ai_insight(
        {
            "provider_used": provider,
            "model_used": model,
            "category": "chat",
            "headline": f"Pergunta: {input_data.prompt[:50]}...",
            "insight_text": reply,
            "actionable_steps": None,
            "user_prompt": audit_prompt,
        }
    )

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "privacy_mode": privacy_mode,
        "reply": reply,
    }


@router.get("/history")
def get_ai_history():
    try:
        repo = _repo_for_current_db()
        return repo.get_ai_insights_history(limit=30)
    except FileNotFoundError:
        return []


@router.post("/analyze-supplements")
def analyze_supplements():
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-pro")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    api_key = _require_provider_secret(repo, provider, "Configure uma chave antes de usar a análise de suplementos.")

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    prompt = (
        f"DADOS DO PACIENTE:\n{context_text}\n\n"
        "TAREFA:\n"
        "Faça uma análise profunda e detalhada da pilha de suplementação ativa do paciente. "
        "Avalie a cronobiologia dos horários de tomada (Manhã, Almoço, Jantar, Noite), sinergias entre os compostos, "
        "potenciais concorrências de absorção e o impacto previsto sobre os biomarcadores laboratoriais e HRV. "
        "Responda em formato Markdown estruturado com tabela se conveniente."
    )

    reply, err = generate_llm_response(
        provider=provider,
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=prompt,
    )

    if err or not reply:
        raise HTTPException(status_code=500, detail=f"Erro ao analisar suplementos ({provider}): {err}")

    repo.save_ai_insight(
        {
            "provider_used": provider,
            "model_used": model,
            "category": "suplementos",
            "headline": "Otimização de Pilha de Suplementos por IA",
            "insight_text": reply,
            "actionable_steps": "Ajuste os horários e doses conforme indicado no relatório.",
            "user_prompt": f"Análise da Pilha de Suplementação Ativa (privacy_mode={privacy_mode})",
        }
    )

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "privacy_mode": privacy_mode,
        "analysis": reply,
    }
