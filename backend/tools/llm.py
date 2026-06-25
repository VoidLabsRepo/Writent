import json
import logging
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self) -> None:
        self.base_url = settings.opencode_base_url
        self.api_key = settings.opencode_api_key
        self.model = settings.opencode_model
        self.fallback_model = settings.opencode_fallback_model
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(180.0, connect=10.0),
        )

    async def _call_api(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        resp = await self.client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        json_mode: bool = False,
        _model_override: str | None = None,
    ) -> str:
        model = _model_override or self.model
        logger.debug(
            "LLM request — model=%s messages=%d temperature=%.2f max_tokens=%d json_mode=%s",
            model, len(messages), temperature, max_tokens, json_mode,
        )

        # Try the given model with retries
        for attempt in range(3):
            try:
                content = await self._call_api(
                    messages, model=model, temperature=temperature,
                    max_tokens=max_tokens, json_mode=json_mode,
                )
                logger.debug("LLM response — length=%d model=%s attempt=%d", len(content), model, attempt + 1)
                return content
            except (httpx.HTTPStatusError, httpx.RequestError, KeyError) as e:
                logger.warning("LLM model '%s' attempt %d failed: %s", model, attempt + 1, e)

        # If we used the primary model and it failed, try fallback
        if model == self.model:
            logger.warning("Primary model '%s' failed 3 times, switching to fallback '%s'", self.model, self.fallback_model)
            for attempt in range(2):
                try:
                    content = await self._call_api(
                        messages, model=self.fallback_model, temperature=temperature,
                        max_tokens=max_tokens, json_mode=json_mode,
                    )
                    logger.info("LLM fallback '%s' succeeded — length=%d", self.fallback_model, len(content))
                    return content
                except (httpx.HTTPStatusError, httpx.RequestError, KeyError) as e:
                    logger.warning("LLM fallback '%s' attempt %d failed: %s", self.fallback_model, attempt + 1, e)

        raise RuntimeError(f"LLM model '{model}' failed after all retries")

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 8192,
    ) -> dict[str, Any]:
        logger.debug("LLM JSON request — messages=%d", len(messages))

        # Try primary model — on parse failure, tell it to fix its own JSON
        for attempt in range(3):
            try:
                raw = await self.chat(
                    messages, temperature=temperature, max_tokens=max_tokens, json_mode=True,
                )
            except RuntimeError:
                break

            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            try:
                result = json.loads(cleaned)
                logger.debug("LLM JSON parsed — keys=%s", list(result.keys()))
                return result
            except json.JSONDecodeError as e:
                logger.warning(
                    "JSON parse failed — model=%s attempt=%d response_length=%d error=%s",
                    self.model, attempt + 1, len(raw), e,
                )
                logger.warning("Raw response tail: %s", raw[-500:])
                # Append error context so model can fix its own output
                messages = messages + [
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content": f"Your JSON had a syntax error: {e}. Fix it and return ONLY the corrected JSON, nothing else."},
                ]

        # Fallback model
        logger.warning("Primary model '%s' failed, trying fallback '%s'", self.model, self.fallback_model)
        for attempt in range(2):
            try:
                raw = await self.chat(
                    messages, temperature=temperature, max_tokens=max_tokens, json_mode=True,
                    _model_override=self.fallback_model,
                )
            except RuntimeError:
                break

            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            try:
                result = json.loads(cleaned)
                logger.info("Fallback model '%s' produced valid JSON", self.fallback_model)
                return result
            except json.JSONDecodeError as e:
                logger.warning("Fallback JSON parse failed — attempt %d: %s", attempt + 1, e)

        raise RuntimeError("Failed to get valid JSON from any model")

    async def close(self) -> None:
        await self.client.aclose()
