import logging
from datetime import datetime, timezone

from tools.llm import LLMClient
from tools.search import WebSearcher
from prompts.research_planner import SYSTEM, PLAN_RESEARCH, SYSTEM_SERIOUS, PLAN_RESEARCH_SERIOUS

logger = logging.getLogger(__name__)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


class ResearchPlannerAgent:
    def __init__(self, llm: LLMClient, searcher: WebSearcher) -> None:
        self.llm = llm
        self.searcher = searcher

    async def plan(self, topic: str, angle: str, audience: str, key_questions: list[str], article_mode: str = "deep_research") -> dict:
        if article_mode == "serious":
            system_prompt, plan_prompt = SYSTEM_SERIOUS, PLAN_RESEARCH_SERIOUS
        else:
            system_prompt, plan_prompt = SYSTEM, PLAN_RESEARCH

        # Quick search to understand the topic landscape
        context_results = await self.searcher.search(topic, max_results=5)
        context_text = "\n".join(
            f"- {r['title']}: {r['snippet']}" for r in context_results
        )

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{system_prompt}"},
            {"role": "user", "content": plan_prompt.format(
                topic=topic,
                angle=angle,
                audience=audience,
                key_questions="\n".join(f"- {q}" for q in key_questions),
            ) + f"\n\nQuick search results for context:\n{context_text}"},
        ]
        plan = await self.llm.chat_json(messages, max_tokens=4096)

        total = sum(
            len(cat.get("tasks", []))
            for cat in plan.get("research_categories", [])
        )
        plan["total_tasks"] = total
        logger.info(
            "Research plan: %d categories, %d tasks for '%s' (mode=%s)",
            len(plan.get("research_categories", [])),
            total,
            topic,
            article_mode,
        )
        return plan
