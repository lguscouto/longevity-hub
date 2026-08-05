"""
Motor Multi-Provedor de Inteligência Artificial para o Longevidade Hub.
Suporta chamadas diretas e resilientes para OpenAI, Anthropic e OpenRouter.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional, Tuple


def _http_post(url: str, headers: Dict[str, str], payload: Dict[str, Any], timeout: int = 45) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Helper genérico para requisições HTTP POST codificadas em JSON."""
    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body), None
    except urllib.error.HTTPError as err:
        err_text = err.read().decode("utf-8", errors="replace")
        return None, f"HTTP Error {err.code}: {err_text[:250]}"
    except Exception as ex:
        return None, str(ex)


class OpenAIProvider:
    @staticmethod
    def generate(api_key: str, model: str, system_prompt: str, user_prompt: str) -> Tuple[Optional[str], Optional[str]]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3
        }
        res, err = _http_post(url, headers, payload)
        if err:
            return None, err
        try:
            content = res["choices"][0]["message"]["content"]
            return content, None
        except Exception:
            return None, f"Resposta inválida da OpenAI: {res}"


class AnthropicProvider:
    @staticmethod
    def generate(api_key: str, model: str, system_prompt: str, user_prompt: str) -> Tuple[Optional[str], Optional[str]]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key.strip(),
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model or "claude-3-5-haiku-20241022",
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3
        }
        res, err = _http_post(url, headers, payload)
        if err:
            return None, err
        try:
            content = res["content"][0]["text"]
            return content, None
        except Exception:
            return None, f"Resposta inválida da Anthropic: {res}"


class OpenRouterProvider:
    @staticmethod
    def generate(api_key: str, model: str, system_prompt: str, user_prompt: str) -> Tuple[Optional[str], Optional[str]]:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:8887",
            "X-Title": "Longevidade Hub"
        }
        payload = {
            "model": model or "deepseek/deepseek-v4-pro",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3
        }
        res, err = _http_post(url, headers, payload)
        if err:
            return None, err
        try:
            content = res["choices"][0]["message"]["content"]
            return content, None
        except Exception:
            return None, f"Resposta inválida da OpenRouter: {res}"


def generate_llm_response(
    provider: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str
) -> Tuple[Optional[str], Optional[str]]:
    """Despacha a chamada para o provedor selecionado (openai, anthropic ou openrouter)."""
    prov = (provider or "openrouter").lower().strip()
    if not api_key or not api_key.strip():
        return None, f"Chave de API ausente para o provedor '{prov}'"

    if prov == "openai":
        return OpenAIProvider.generate(api_key, model, system_prompt, user_prompt)
    elif prov == "anthropic":
        return AnthropicProvider.generate(api_key, model, system_prompt, user_prompt)
    elif prov == "openrouter":
        return OpenRouterProvider.generate(api_key, model, system_prompt, user_prompt)
    else:
        return None, f"Provedor desconhecido: '{prov}'"


def validate_provider_connection(provider: str, api_key: str, model: Optional[str] = None) -> Tuple[bool, str]:
    """Testa a validade da chave de API enviando um prompt minimalista."""
    test_system = "Você é um validador de API."
    test_prompt = "Responda apenas com a palavra OK."
    m = model or ("gpt-4o-mini" if provider == "openai" else ("claude-3-5-haiku-20241022" if provider == "anthropic" else "google/gemini-2.5-flash"))

    res, err = generate_llm_response(provider, api_key, m, test_system, test_prompt)
    if err:
        return False, err
    if res and ("OK" in res.upper() or len(res) > 0):
        return True, f"Conexão com {provider.capitalize()} ({m}) estabelecida com sucesso!"
    return False, "Resposta inesperada da API"
