import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.config import get_db_path
from longevidade.ai.context_builder import build_patient_clinical_context
from longevidade.ai.prompts import (
    DEFAULT_LONGEVITY_SYSTEM_PROMPT,
    STRUCTURED_INSIGHTS_PROMPT,
    build_structured_insights_prompt,
)
from longevidade.ai.provider_factory import generate_llm_response, validate_provider_connection
from longevidade.ai.secrets_store import (
    AISecretsStore,
    KeyringSecretsStore,
    is_masked_or_blank_secret,
    mask_secret,
)
from longevidade.ai.safety_policy import (
    DETERMINISTIC_SAFETY_MODEL,
    DETERMINISTIC_SAFETY_PROVIDER,
    TrainingSafetyDecision,
    build_restricted_chat_reply,
    build_restricted_insights,
    evaluate_training_safety,
    resolve_today_metric_with_rhr_fallback,
    safe_training_action,
)
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
    selected_model: Optional[str] = "deepseek/deepseek-v4-flash-0731"
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


class GenerateInsightsInput(BaseModel):
    time_window: Optional[str] = "30d"


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


def _current_training_safety(repo: LongevityRepository) -> TrainingSafetyDecision:
    """Avalia a trava antes de montar prompts ou consultar o provedor externo."""

    today_str = date.today().isoformat()
    today_metric = repo.get_daily_metric_by_date(today_str)
    all_60_metrics = repo.get_daily_metrics(days=60)
    history_metrics = [
        metric
        for metric in all_60_metrics
        if metric.get("date_ref") and metric["date_ref"] < today_str
    ]
    resolved_today, _ = resolve_today_metric_with_rhr_fallback(today_metric, history_metrics)
    guidance = generate_daily_guidance(resolved_today, history_metrics)
    energy = calculate_energy_bank(resolved_today)
    return evaluate_training_safety(guidance, energy)


def _save_deterministic_guardrail_insight(
    repo: LongevityRepository,
    *,
    category: str,
    headline: str,
    insight_text: str,
    actionable_steps: str | None,
    audit_prompt: str,
) -> None:
    """Registra somente o texto local seguro, nunca uma resposta bruta bloqueada."""

    repo.save_ai_insight(
        {
            "provider_used": DETERMINISTIC_SAFETY_PROVIDER,
            "model_used": DETERMINISTIC_SAFETY_MODEL,
            "category": category,
            "headline": headline,
            "insight_text": insight_text,
            "actionable_steps": actionable_steps,
            "user_prompt": audit_prompt,
        }
    )


@router.get("/settings")
def get_ai_settings():
    repo = _repo_for_current_db()
    try:
        settings = repo.get_ai_settings()
    except FileNotFoundError:
        settings = {}

    return {
        "active_provider": settings.get("active_provider", "openrouter"),
        "selected_model": settings.get("selected_model", "deepseek/deepseek-v4-flash-0731"),
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

    try:
        repo.upsert_ai_settings(data)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao salvar configurações de IA: {exc}",
        ) from exc

    return {"status": "ok", "message": "Configurações de IA salvas com sucesso"}


@router.post("/test-connection")
def test_connection(input_data: TestConnectionInput):
    repo = _repo_for_current_db()
    api_key = input_data.api_key
    if is_masked_or_blank_secret(api_key):
        api_key = repo.get_ai_secret(input_data.provider) or ""
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"Nenhuma chave de API informada ou salva no cofre para o provedor '{input_data.provider}'.",
        )
    success, msg = validate_provider_connection(
        provider=input_data.provider,
        api_key=api_key,
        model=input_data.model,
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "ok", "message": msg}


@router.post("/generate-insights")
def generate_insights(input_data: Optional[GenerateInsightsInput] = None):
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    time_window = "30d"
    if input_data and input_data.time_window and input_data.time_window in ("today", "7d", "30d"):
        time_window = input_data.time_window

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-flash-0731")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    safety = _current_training_safety(repo)
    if safety.restricted and safety.reason_code == "guidance_insufficient_data":
        parsed_json = build_restricted_insights(safety)
        insight = parsed_json["insights"][0]
        _save_deterministic_guardrail_insight(
            repo,
            category=str(insight["category"]),
            headline=str(insight["headline"]),
            insight_text=str(insight["insight_text"]),
            actionable_steps=str(insight["actionable_steps"]),
            audit_prompt=f"Análise local limitada pela política de segurança ({time_window}) (privacy_mode={privacy_mode})",
        )
        report_id = repo.save_ai_report(
            {
                "provider": DETERMINISTIC_SAFETY_PROVIDER,
                "model": DETERMINISTIC_SAFETY_MODEL,
                "privacy_mode": privacy_mode,
                "time_window": time_window,
                "summary": parsed_json.get("summary", ""),
                "report_json": parsed_json,
                "guardrail_applied": True,
                "safety_reason": safety.reason_code,
            }
        )
        return {
            "status": "ok",
            "id": report_id,
            "provider": DETERMINISTIC_SAFETY_PROVIDER,
            "model": DETERMINISTIC_SAFETY_MODEL,
            "privacy_mode": privacy_mode,
            "time_window": time_window,
            "guardrail_applied": True,
            "safety_reason": safety.reason_code,
            "result": parsed_json,
        }

    api_key = _require_provider_secret(
        repo,
        provider,
        "Configure sua API Key em Configurações de IA.",
    )

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode, time_window=time_window)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    structured_prompt = build_structured_insights_prompt(time_window=time_window)

    if safety.restricted:
        safety_notice = (
            f"\n\n[DIRETRIZ DE SEGURANÇA DETERMINÍSTICA ATIVA]:\n"
            f"Atenção: Os dados fisiológicos de hoje possuem limitações de cobertura ({safety.reason_code}). "
            f"Você deve sintetizar e analisar o histórico ({time_window}) normalmente, "
            f"porém é TERMINANTEMENTE PROIBIDO prescrever aumento de intensidade ou treinos extenuantes para o dia de hoje. "
            f"Em relação ao treino de hoje, oriente explicitamente foco em recuperação ativa e aguardar a consolidação dos dados."
        )
        user_prompt = f"{context_text}{safety_notice}\n\n{structured_prompt}"
    else:
        user_prompt = f"{context_text}\n\n{structured_prompt}"

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
            "summary": f"Análise ({time_window}) gerada pelo Copiloto de IA",
            "insights": [
                {
                    "category": "geral",
                    "headline": "Análise de Saúde Integrada",
                    "insight_text": raw_response,
                    "actionable_steps": "Revise seus biomarcadores e mantenha a rotina de sono e exercícios.",
                }
            ],
        }

    # Se a política do dia estiver restrita, injeta um card prioritário de segurança no relatório
    if safety.restricted and parsed_json and isinstance(parsed_json.get("insights"), list):
        safety_card = {
            "category": "segurança",
            "headline": "Atenção ao Treino de Hoje: Dados de Recuperação Incompletos",
            "insight_text": f"Seu relatório ({time_window}) foi gerado com sucesso, porém os sinais fisiológicos de recuperação de hoje estão parciais. Priorize moderação na atividade física de hoje.",
            "actionable_steps": safe_training_action(safety),
        }
        parsed_json["insights"].insert(0, safety_card)

    report_id = repo.save_ai_report(
        {
            "provider": provider,
            "model": model,
            "privacy_mode": privacy_mode,
            "time_window": time_window,
            "summary": parsed_json.get("summary", ""),
            "report_json": parsed_json,
            "guardrail_applied": safety.restricted,
            "safety_reason": safety.reason_code if safety.restricted else None,
        }
    )

    audit_prompt = f"Análise automatizada ({time_window}) (privacy_mode={privacy_mode})"
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
        "id": report_id,
        "provider": provider,
        "model": model,
        "privacy_mode": privacy_mode,
        "time_window": time_window,
        "guardrail_applied": safety.restricted,
        "safety_reason": safety.reason_code if safety.restricted else None,
        "result": parsed_json,
    }


@router.post("/chat")
def chat_copilot(input_data: AIChatInput):
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-flash-0731")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    safety = _current_training_safety(repo)
    if safety.restricted:
        prompt_lower = input_data.prompt.lower()
        is_training_inquiry = any(
            kw in prompt_lower
            for kw in (
                "trein", "exerc", "corr", "malh", "carga", "intens",
                "workout", "vo2", "academia", "força", "esforço", "muscul",
                "máxim", "sprint"
            )
        )
        if is_training_inquiry or safety.reason_code == "guidance_insufficient_data":
            reply = build_restricted_chat_reply(safety)
            audit_prompt = input_data.prompt if privacy_mode == "full" else "[prompt omitido por privacy_mode=minimal]"
            _save_deterministic_guardrail_insight(
                repo,
                category="chat",
                headline="Resposta limitada pela política de segurança",
                insight_text=reply,
                actionable_steps=None,
                audit_prompt=audit_prompt,
            )
            return {
                "status": "ok",
                "provider": DETERMINISTIC_SAFETY_PROVIDER,
                "model": DETERMINISTIC_SAFETY_MODEL,
                "privacy_mode": privacy_mode,
                "guardrail_applied": True,
                "safety_reason": safety.reason_code,
                "reply": reply,
            }

    api_key = _require_provider_secret(
        repo,
        provider,
        "Configure sua API Key no ícone de engrenagem.",
    )

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    if safety.restricted:
        system_prompt += (
            f"\n\n[AVISO CLÍNICO]: Os dados fisiológicos de hoje possuem limitações ({safety.reason_code}). "
            "Se o paciente perguntar sobre atividade física ou intensidade hoje, oriente moderação e descanso."
        )
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


@router.get("/reports/latest")
def get_latest_report():
    try:
        repo = _repo_for_current_db()
        report = repo.get_latest_ai_report()
        return report or {"status": "empty", "result": None}
    except Exception:
        return {"status": "empty", "result": None}


@router.get("/reports")
def list_reports(limit: int = 20):
    try:
        repo = _repo_for_current_db()
        return repo.get_ai_reports(limit=limit)
    except Exception:
        return []


@router.get("/reports/{report_id}")
def get_report(report_id: int):
    repo = _repo_for_current_db()
    report = repo.get_ai_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return report


class AnalyzeSupplementsInput(BaseModel):
    date_ref: Optional[str] = None


@router.post("/analyze-supplements")
def analyze_supplements(payload: Optional[AnalyzeSupplementsInput] = None):
    db_path = get_db_path()
    repo = LongevityRepository(db_path, secrets_store=get_ai_secrets_store())

    settings = repo.get_ai_settings()
    provider = settings.get("active_provider", "openrouter")
    model = settings.get("selected_model", "deepseek/deepseek-v4-flash-0731")
    privacy_mode = _normalize_privacy_mode(settings.get("privacy_mode"))

    api_key = _require_provider_secret(repo, provider, "Configure uma chave antes de usar a análise de suplementos.")

    context_text = build_patient_clinical_context(db_path, privacy_mode=privacy_mode)
    system_prompt = settings.get("system_prompt_custom") or DEFAULT_LONGEVITY_SYSTEM_PROMPT
    ref_note = f"\nData de referência ativa: {payload.date_ref}" if (payload and payload.date_ref) else ""
    prompt = (
        f"DADOS DO PACIENTE:{ref_note}\n{context_text}\n\n"
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
