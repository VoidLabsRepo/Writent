import logging
from datetime import datetime, timezone

from tools.llm import LLMClient
from prompts.writing import (
    WRITER_SYSTEM, WRITE_ARTICLE, OUTLINE_ARTICLE,
    WRITER_SYSTEM_CASUAL, WRITE_ARTICLE_CASUAL, OUTLINE_ARTICLE_CASUAL,
    WRITER_SYSTEM_SERIOUS, WRITE_ARTICLE_SERIOUS, OUTLINE_ARTICLE_SERIOUS,
)

logger = logging.getLogger(__name__)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


def _get_prompts(article_mode: str) -> tuple[str, str, str]:
    if article_mode == "casual":
        return WRITER_SYSTEM_CASUAL, WRITE_ARTICLE_CASUAL, OUTLINE_ARTICLE_CASUAL
    elif article_mode == "serious":
        return WRITER_SYSTEM_SERIOUS, WRITE_ARTICLE_SERIOUS, OUTLINE_ARTICLE_SERIOUS
    return WRITER_SYSTEM, WRITE_ARTICLE, OUTLINE_ARTICLE


class WriterAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def create_outline(self, title: str, topic: str, research_synthesis: dict, article_mode: str = "deep_research", angle: str = "") -> dict:
        system_prompt, _, outline_prompt = _get_prompts(article_mode)
        logger.info("Creating outline for: %s (mode=%s)", title, article_mode)
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{system_prompt}"},
            {"role": "user", "content": outline_prompt.format(
                title=title,
                topic=topic,
                research_synthesis=str(research_synthesis),
                angle=angle,
            )},
        ]
        result = await self.llm.chat_json(messages, max_tokens=4096)
        logger.info("Outline created — %d sections", len(result.get("outline", [])))
        return result

    async def write_article(
        self,
        title: str,
        topic: str,
        angle: str,
        audience: str,
        research_data: dict,
        citations: list[dict],
        article_mode: str = "deep_research",
    ) -> dict:
        system_prompt, write_prompt, _ = _get_prompts(article_mode)

        citations_text = "\n".join(
            f"[{c.get('number', i+1)}] {c['title']} — {c['url']}"
            for i, c in enumerate(citations)
        ) if citations else ""

        research_text = str(research_data)

        # Casual mode uses a simpler template — no research_data/citations sections
        if article_mode == "casual":
            research_context = ""
            if research_data:
                research_context = f"Background context (use if relevant, don't force it in):\n{research_text}"
            user_content = write_prompt.format(
                title=title,
                topic=topic,
                angle=angle,
                audience=audience,
                research_context=research_context,
            )
        else:
            user_content = write_prompt.format(
                title=title,
                topic=topic,
                angle=angle,
                audience=audience,
                research_data=research_text,
                citations=citations_text,
            )

        logger.info("Writing article: %s (mode=%s)", title, article_mode)
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{system_prompt}"},
            {"role": "user", "content": user_content},
        ]
        result = await self.llm.chat_json(messages, max_tokens=16384, temperature=0.75)
        logger.info("Article written — word_count=%s", result.get("word_count"))
        return result

    async def revise_article(
        self,
        original_article: dict,
        review_feedback: dict,
        citations: list[dict],
    ) -> dict:
        logger.info("Revising article — score=%s", review_feedback.get("overall_score"))
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{WRITER_SYSTEM}"},
            {"role": "user", "content": f"""Revise this article based on the editorial review.

ORIGINAL ARTICLE:
{original_article.get('content_markdown', '')}

REVIEW FEEDBACK:
Score: {review_feedback.get('overall_score', 0)}/100
Issues: {review_feedback.get('rewrite_instructions', '')}

Section scores: {str(review_feedback.get('sections', {}))}

Fix ALL issues. Make the article MORE comprehensive — add depth, data, examples.
Ensure there is a REFERENCES section at the end with all sources.
Do NOT use inline citation numbers [1][2] — weave sources into natural prose.

Return the same JSON format:
{{
  "title": "Final article title",
  "subtitle": "Compelling subtitle",
  "content_markdown": "Revised full comprehensive article with REFERENCES section",
  "word_count": 0
}}"""},
        ]
        return await self.llm.chat_json(messages, max_tokens=16384, temperature=0.7)
