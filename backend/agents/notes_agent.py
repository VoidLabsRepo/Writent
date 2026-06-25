import logging
from datetime import datetime, timezone

from tools.llm import LLMClient
from prompts.notes import SYSTEM, CREATE_NOTES, CREATE_NOTES_SERIOUS

logger = logging.getLogger(__name__)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


class NotesAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def create_notes(
        self,
        topic: str,
        angle: str,
        audience: str,
        key_questions: list[str],
        custom_instructions: str = "",
        article_mode: str = "deep_research",
    ) -> dict:
        instructions = f"\nCustom instructions: {custom_instructions}" if custom_instructions else ""

        if article_mode == "serious":
            notes_prompt = CREATE_NOTES_SERIOUS
        else:
            notes_prompt = CREATE_NOTES

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SYSTEM}"},
            {"role": "user", "content": notes_prompt.format(
                topic=topic,
                angle=angle,
                audience=audience,
                key_questions="\n".join(f"- {q}" for q in key_questions),
                custom_instructions=instructions,
            )},
        ]

        logger.info("Creating research notes for topic: %s (mode=%s)", topic, article_mode)
        result = await self.llm.chat_json(messages, max_tokens=4096)

        total_tasks = sum(
            len(angle.get("todos", []))
            for angle in result.get("angles", [])
        )
        result["total_tasks"] = total_tasks

        logger.info(
            "Research notes created: %d angles, %d tasks",
            len(result.get("angles", [])),
            total_tasks,
        )
        return result
