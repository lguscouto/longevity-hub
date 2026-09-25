"""
Gerador de explicações textuais e síntese para o Contextual Insight Engine.
Fornece formatação determinística offline e enriquecimento opcional subordinado a LLMs.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from typing import Any, Dict, Optional

from longevidade.ai.provider_factory import generate_llm_response
from longevidade.context.associations import ContextExplanation


def format_deterministic_explanation(exp: ContextExplanation) -> str:
    """Gera um resumo textual estruturado e seguro sem acionamento de IA."""
    lines = [
        f"### {exp.summary_headline}",
        "",
        f"**Medição:** {exp.observed_value} {exp.unit} (Baseline 30d: {exp.baseline_value} {exp.unit}, Z-Score: {exp.robust_z_score:+.2f})",
        f"**Confiança da Análise:** {exp.analysis_confidence.capitalize()} ({exp.data_coverage_days}/30 dias de dados considerados)",
        "",
    ]

    if exp.factors:
        lines.append("**Fatores Associados Identificados:**")
        for f in exp.factors:
            strength_badge = f"[{f.strength.upper()}]"
            lines.append(f"- **{f.factor_name}** {strength_badge}: {f.summary}")
        lines.append("")
    else:
        lines.append("Nenhum evento registrado (álcool, treino intenso ou sintomas) foi detectado na janela prévia a esta alteração.")
        lines.append("")

    lines.append(f"_{exp.disclaimer}_")
    return "\n".join(lines)


def synthesize_explanation_with_ai(
    exp: ContextExplanation,
    conn: sqlite3.Connection,
) -> Dict[str, Any]:
    """Sintetiza a explicação contextual utilizando o provedor de IA configurado.

    O LLM recebe APENAS o JSON estruturado fechado, sem inventar fatos novos.
    Se a IA estiver indisponível ou desconfigurada, recorre suavemente ao template determinístico.
    """
    # 1. Busca configurações ativas de IA
    try:
        cur = conn.execute(
            """
            SELECT active_provider, selected_model, openai_api_key, anthropic_api_key, openrouter_api_key
            FROM ai_settings WHERE id = 1 LIMIT 1;
            """
        )
        row = cur.fetchone()
    except Exception:
        row = None

    if not row:
        return {
            "text": format_deterministic_explanation(exp),
            "is_ai_generated": False,
            "provider": None,
            "model": None,
            "note": "Configurações de IA não localizadas. Exibindo síntese determinística.",
        }

    provider = str(row[0] or "openrouter").lower()
    model = str(row[1] or "deepseek/deepseek-v4-pro")
    openai_key = row[2] or ""
    anthropic_key = row[3] or ""
    openrouter_key = row[4] or ""

    api_key = openrouter_key if provider == "openrouter" else (openai_key if provider == "openai" else anthropic_key)

    if not api_key.strip():
        return {
            "text": format_deterministic_explanation(exp),
            "is_ai_generated": False,
            "provider": provider,
            "model": model,
            "note": "Chave de API não configurada. Exibindo síntese determinística.",
        }

    # 2. Constrói payload JSON fechado
    payload_json = json.dumps(exp.model_dump(), ensure_ascii=False, indent=2)
    payload_hash = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()[:12]

    system_prompt = (
        "Você é o copiloto analítico do Longevidade Hub. Sua função é explicar e resumir "
        "uma alteração fisiológica com base ESTRITAMENTE no JSON estruturado fornecido.\n\n"
        "REGRAS DE SEGURANÇA E CONFORMIDADE:\n"
        "1. PROIBIDO inventar métricas, exames, treinos ou fatores não descritos no JSON.\n"
        "2. NUNCA declare causalidade (ex: 'o álcool causou'). Use termos de associação temporal (ex: 'ocorreu no mesmo período', 'associado no seu histórico').\n"
        "3. NÃO prescreva medicamentos, tratamentos ou diagnósticos médicos.\n"
        "4. Seja objetivo, empático e claro (máximo 3 parágrafos curtos).\n"
        "5. Conclua sempre ressaltando que correlações temporais não provam relação de causa e efeito."
    )

    user_prompt = (
        f"Analise e resuma em linguagem natural a seguinte mudança de métrica baseando-se apenas neste JSON:\n\n"
        f"```json\n{payload_json}\n```\n\n"
        "Apresente: 1) O que mudou e sua magnitude; 2) Os principais fatores associados encontrados; 3) O nível de confiança da análise."
    )

    ai_text, error = generate_llm_response(provider, api_key, model, system_prompt, user_prompt)

    if error or not ai_text:
        return {
            "text": format_deterministic_explanation(exp),
            "is_ai_generated": False,
            "provider": provider,
            "model": model,
            "note": f"Falha na chamada da IA ({error}). Exibindo síntese determinística.",
        }

    # 3. Registra auditoria na tabela ai_insights_history se existir
    try:
        conn.execute(
            """
            INSERT INTO ai_insights_history (
                provider_used, model_used, category, headline, insight_text, actionable_steps, user_prompt
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (
                provider,
                model,
                "context_insight",
                exp.summary_headline,
                ai_text,
                exp.disclaimer,
                f"payload_hash:{payload_hash}",
            ),
        )
        conn.commit()
    except Exception:
        pass

    return {
        "text": ai_text.strip(),
        "is_ai_generated": True,
        "provider": provider,
        "model": model,
        "payload_hash": payload_hash,
    }
