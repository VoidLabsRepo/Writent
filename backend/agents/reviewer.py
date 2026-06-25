import logging

from tools.llm import LLMClient
from prompts.review import REVIEWER_SYSTEM, REVIEW_ARTICLE

logger = logging.getLogger(__name__)


class ReviewerAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def review(
        self,
        title: str,
        article_content: str,
        citations: list[dict],
        research_data: dict,
    ) -> dict:
        logger.info("Reviewing article: %s", title)
        citations_text = "\n".join(
            f"[{c.get('number', i+1)}] {c['title']} — {c['url']}"
            for i, c in enumerate(citations)
        )

        messages = [
            {"role": "system", "content": REVIEWER_SYSTEM},
            {"role": "user", "content": REVIEW_ARTICLE.format(
                title=title,
                article_content=article_content[:12000],
                citations=citations_text,
                research_data=str(research_data)[:4000],
            )},
        ]
        return await self.llm.chat_json(messages, max_tokens=4096, temperature=0.3)
