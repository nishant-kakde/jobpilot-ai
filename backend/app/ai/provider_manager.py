import time
import asyncio
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import httpx

from app.core.config import settings
from app.ai.token_manager import token_manager

logger = logging.getLogger("jobpilot.ai.provider_manager")

@dataclass
class AIExecutionResult:
    content: Optional[str]
    provider: str
    model: str
    is_fallback: bool
    tokens_used: int
    latency_ms: float
    error_message: Optional[str] = None

class ProviderManager:
    """
    Unified manager for calling OpenAI, Google Gemini, Anthropic Claude,
    or falling back to the Built-in Deterministic Engine.
    """

    def __init__(self):
        self.default_provider = settings.AI_PROVIDER.lower()

    async def execute_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        provider_override: Optional[str] = None,
        api_key_override: Optional[str] = None,
        model_override: Optional[str] = None,
        json_mode: bool = True
    ) -> AIExecutionResult:
        """
        Executes a prompt through the target provider with retries and graceful fallback.
        """
        provider = (provider_override or self.default_provider).lower()
        start_time = time.perf_counter()

        # If built-in is explicitly chosen, return immediately indicating fallback
        if provider == "built-in":
            latency = (time.perf_counter() - start_time) * 1000.0
            tokens = token_manager.estimate_tokens(system_prompt + " " + user_prompt)
            return AIExecutionResult(
                content=None,
                provider="built-in",
                model="deterministic-heuristics",
                is_fallback=True,
                tokens_used=tokens,
                latency_ms=round(latency, 2)
            )

        # 1. Try OpenAI
        if provider == "openai":
            api_key = api_key_override or settings.OPENAI_API_KEY
            model = model_override or settings.OPENAI_MODEL
            if api_key:
                res = await self._call_openai_with_retry(system_prompt, user_prompt, api_key, model, temperature, json_mode)
                if res.content is not None:
                    return res
                logger.warning(f"OpenAI execution failed: {res.error_message}. Falling back to built-in.")

        # 2. Try Gemini
        elif provider == "gemini":
            api_key = api_key_override or settings.GEMINI_API_KEY
            model = model_override or settings.GEMINI_MODEL
            if api_key:
                res = await self._call_gemini_with_retry(system_prompt, user_prompt, api_key, model, temperature, json_mode)
                if res.content is not None:
                    return res
                logger.warning(f"Gemini execution failed: {res.error_message}. Falling back to built-in.")

        # 3. Try Anthropic
        elif provider == "anthropic":
            api_key = api_key_override or settings.ANTHROPIC_API_KEY
            model = model_override or settings.ANTHROPIC_MODEL
            if api_key:
                res = await self._call_anthropic_with_retry(system_prompt, user_prompt, api_key, model, temperature)
                if res.content is not None:
                    return res
                logger.warning(f"Anthropic execution failed: {res.error_message}. Falling back to built-in.")

        # Final Fallback to Built-in Engine
        latency = (time.perf_counter() - start_time) * 1000.0
        tokens = token_manager.estimate_tokens(system_prompt + " " + user_prompt)
        return AIExecutionResult(
            content=None,
            provider="built-in",
            model="deterministic-heuristics",
            is_fallback=True,
            tokens_used=tokens,
            latency_ms=round(latency, 2),
            error_message=f"Provider '{provider}' was unavailable or unconfigured. Applied built-in intelligent engine."
        )

    # ---------------- Provider Implementations with Retries ----------------

    async def _call_openai_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        temperature: float,
        json_mode: bool
    ) -> AIExecutionResult:
        start_time = time.perf_counter()
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        body: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        usage = data.get("usage", {})
                        tokens = usage.get("total_tokens", token_manager.estimate_tokens(content or ""))
                        latency = (time.perf_counter() - start_time) * 1000.0
                        return AIExecutionResult(
                            content=content,
                            provider="openai",
                            model=model,
                            is_fallback=False,
                            tokens_used=tokens,
                            latency_ms=round(latency, 2)
                        )
                    elif resp.status_code in [429, 500, 502, 503, 504]:
                        last_error = f"OpenAI HTTP {resp.status_code}: {resp.text}"
                        await asyncio.sleep(1.0 * (attempt + 1))
                    else:
                        last_error = f"OpenAI HTTP {resp.status_code}: {resp.text}"
                        break
            except Exception as e:
                last_error = str(e)
                await asyncio.sleep(0.5)

        latency = (time.perf_counter() - start_time) * 1000.0
        return AIExecutionResult(
            content=None,
            provider="openai",
            model=model,
            is_fallback=True,
            tokens_used=0,
            latency_ms=round(latency, 2),
            error_message=last_error
        )

    async def _call_gemini_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        temperature: float,
        json_mode: bool
    ) -> AIExecutionResult:
        start_time = time.perf_counter()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        generation_config: Dict[str, Any] = {"temperature": temperature}
        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        body = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
            "generationConfig": generation_config
        }

        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                content = parts[0].get("text", "")
                                usage = data.get("usageMetadata", {})
                                tokens = usage.get("totalTokenCount", token_manager.estimate_tokens(content))
                                latency = (time.perf_counter() - start_time) * 1000.0
                                return AIExecutionResult(
                                    content=content,
                                    provider="gemini",
                                    model=model,
                                    is_fallback=False,
                                    tokens_used=tokens,
                                    latency_ms=round(latency, 2)
                                )
                    elif resp.status_code in [429, 500, 502, 503, 504]:
                        last_error = f"Gemini HTTP {resp.status_code}: {resp.text}"
                        await asyncio.sleep(1.0 * (attempt + 1))
                    else:
                        last_error = f"Gemini HTTP {resp.status_code}: {resp.text}"
                        break
            except Exception as e:
                last_error = str(e)
                await asyncio.sleep(0.5)

        latency = (time.perf_counter() - start_time) * 1000.0
        return AIExecutionResult(
            content=None,
            provider="gemini",
            model=model,
            is_fallback=True,
            tokens_used=0,
            latency_ms=round(latency, 2),
            error_message=last_error
        )

    async def _call_anthropic_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        temperature: float
    ) -> AIExecutionResult:
        start_time = time.perf_counter()
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        body = {
            "model": model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": 4096,
            "temperature": temperature
        }

        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        content_blocks = data.get("content", [])
                        text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")
                        usage = data.get("usage", {})
                        tokens = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
                        if tokens == 0:
                            tokens = token_manager.estimate_tokens(text)
                        latency = (time.perf_counter() - start_time) * 1000.0
                        return AIExecutionResult(
                            content=text,
                            provider="anthropic",
                            model=model,
                            is_fallback=False,
                            tokens_used=tokens,
                            latency_ms=round(latency, 2)
                        )
                    elif resp.status_code in [429, 500, 502, 503, 504]:
                        last_error = f"Anthropic HTTP {resp.status_code}: {resp.text}"
                        await asyncio.sleep(1.0 * (attempt + 1))
                    else:
                        last_error = f"Anthropic HTTP {resp.status_code}: {resp.text}"
                        break
            except Exception as e:
                last_error = str(e)
                await asyncio.sleep(0.5)

        latency = (time.perf_counter() - start_time) * 1000.0
        return AIExecutionResult(
            content=None,
            provider="anthropic",
            model=model,
            is_fallback=True,
            tokens_used=0,
            latency_ms=round(latency, 2),
            error_message=last_error
        )

provider_manager = ProviderManager()

