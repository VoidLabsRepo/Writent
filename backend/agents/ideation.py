import logging
from datetime import datetime, timezone

from tools.llm import LLMClient
from prompts.ideation import SYSTEM, SUGGEST_TOPICS, REFINE_TOPIC, REFINE_TOPIC_CASUAL, REFINE_TOPIC_SERIOUS

logger = logging.getLogger(__name__)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


class IdeationAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def suggest_topics(self, user_input: str) -> dict:
        logger.info("Suggesting topics for input: %s", user_input[:100])
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SYSTEM}"},
            {"role": "user", "content": SUGGEST_TOPICS.format(user_input=user_input)},
        ]
        result = await self.llm.chat_json(messages)
        logger.info("Topic suggestions generated — %d topics", len(result.get("topics", [])))
        return result

    async def refine_topic(self, topic: str, custom_instructions: str = "", article_mode: str = "deep_research") -> dict:
        logger.info("Refining topic: %s (mode=%s)", topic[:100], article_mode)
        instructions = f"\nCustom instructions: {custom_instructions}" if custom_instructions else ""

        if article_mode == "casual":
            prompt = REFINE_TOPIC_CASUAL
        elif article_mode == "serious":
            prompt = REFINE_TOPIC_SERIOUS
        else:
            prompt = REFINE_TOPIC

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SYSTEM}"},
            {"role": "user", "content": prompt.format(
                topic=topic, custom_instructions=instructions
            )},
        ]
        result = await self.llm.chat_json(messages)
        logger.info("Topic refined — title=%s angle=%s", result.get("title"), result.get("angle"))
        return result
