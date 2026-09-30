"""Política determinística para limitar recomendações de treino da IA."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


DETERMINISTIC_SAFETY_PROVIDER = "deterministic_safety_policy"
DETERMINISTIC_SAFETY_MODEL = "v1"


@dataclass(frozen=True)
class TrainingSafetyDecision:
    """Decisão independente do texto produzido por qualquer provedor de LLM."""

    restricted: bool
    reason_code: str | None
    guidance: Mapping[str, Any]
    energy: Mapping[str, Any]


def resolve_today_metric_with_rhr_fallback(
    today_metric: Mapping[str, Any] | None,
    history_metrics: list[Mapping[str, Any]],
) -> tuple[dict[str, Any] | None, bool]:
    """Se a noite foi monitorada (VFC e Sono presentes) mas o RHR ainda não consolidou na nuvem,

    utiliza como projeção transitória o RHR mais recente verificado no histórico.
    Retorna uma tupla (métrica_resolvida, foi_projetado).
    """
    if not today_metric:
        return None, False

    if today_metric.get("rhr_bpm") is not None:
        return dict(today_metric), False

    has_night_monitoring = (
        today_metric.get("hrv_ms") is not None
        and today_metric.get("sleep_minutes") is not None
    )
    if not has_night_monitoring:
        return dict(today_metric), False

    recent_rhr = next(
        (m.get("rhr_bpm") for m in history_metrics if m.get("rhr_bpm") is not None),
        None,
    )
    if recent_rhr is not None:
        cloned = dict(today_metric)
        cloned["rhr_bpm"] = float(recent_rhr)
        cloned["rhr_is_projected"] = True
        return cloned, True

    return dict(today_metric), False


def evaluate_training_safety(
    guidance: Mapping[str, Any], energy: Mapping[str, Any]
) -> TrainingSafetyDecision:
    """Libera geração por LLM apenas com orientação de alta confiança e energia verificável."""

    if guidance.get("state") == "insufficient_data":
        return TrainingSafetyDecision(True, "guidance_insufficient_data", guidance, energy)

    confidence = guidance.get("confidence")
    if confidence != "high":
        return TrainingSafetyDecision(
            True,
            f"guidance_confidence_{confidence or 'unavailable'}",
            guidance,
            energy,
        )

    energy_status = energy.get("status")
    if energy_status != "ok":
        return TrainingSafetyDecision(
            True,
            f"energy_{energy_status or 'unavailable'}",
            guidance,
            energy,
        )

    return TrainingSafetyDecision(False, None, guidance, energy)


def safe_training_action(_decision: TrainingSafetyDecision) -> str:
    """Retorna uma orientação fixa; não reutiliza uma ação potencialmente intensa."""

    return (
        "Priorize recuperação e a coleta dos dados do dia; não aumente a intensidade "
        "de treino até que a cobertura esteja verificável."
    )


def build_restricted_insights(decision: TrainingSafetyDecision) -> dict[str, Any]:
    """Monta a resposta estruturada segura sem consultar o provedor externo."""

    return {
        "summary": "A análise por IA foi limitada pela política determinística de segurança devido à cobertura insuficiente para recomendações de treino.",
        "guardrail_applied": True,
        "safety_reason": decision.reason_code,
        "insights": [
            {
                "category": "segurança",
                "headline": "Recomendação de treino limitada por dados incompletos",
                "insight_text": "O sistema não tem evidência determinística suficiente para emitir uma recomendação de treino personalizada hoje.",
                "actionable_steps": safe_training_action(decision),
            }
        ],
    }


def build_restricted_chat_reply(decision: TrainingSafetyDecision) -> str:
    """Monta uma resposta segura para o chat sem incluir conteúdo de LLM."""

    return (
        "Não vou gerar uma recomendação personalizada de treino agora porque a política "
        "determinística identificou cobertura insuficiente para uma decisão segura. "
        f"{safe_training_action(decision)}"
    )
