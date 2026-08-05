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
