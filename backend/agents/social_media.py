import logging
from datetime import datetime, timezone

from tools.llm import LLMClient
from prompts.social import SOCIAL_SYSTEM, X_POST, LINKEDIN_POST, THREADS_POST

logger = logging.getLogger(__name__)


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


class SocialMediaAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def create_x_post(self, title: str, article_content: str) -> dict:
        logger.info("Creating X post for: %s", title[:60])
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SOCIAL_SYSTEM}"},
            {"role": "user", "content": X_POST.format(
                title=title, article_content=article_content
            )},
        ]
        result = await self.llm.chat_json(messages, max_tokens=1024, temperature=0.8)
        logger.info("X post created — type=%s", result.get("type"))
        return result

    async def create_linkedin_post(self, title: str, article_content: str) -> dict:
        logger.info("Creating LinkedIn post for: %s", title[:60])
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SOCIAL_SYSTEM}"},
            {"role": "user", "content": LINKEDIN_POST.format(
                title=title, article_content=article_content
            )},
        ]
        result = await self.llm.chat_json(messages, max_tokens=2048, temperature=0.8)
        logger.info("LinkedIn post created — length=%d", len(result.get("content", "")))
        return result

    async def create_threads_post(self, title: str, article_content: str) -> dict:
        logger.info("Creating Threads post for: %s", title[:60])
        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SOCIAL_SYSTEM}"},
            {"role": "user", "content": THREADS_POST.format(
                title=title, article_content=article_content
            )},
        ]
        result = await self.llm.chat_json(messages, max_tokens=1024, temperature=0.8)
        logger.info("Threads post created — length=%d", len(result.get("content", "")))
        return result

    async def create_all_posts(self, title: str, article_content: str) -> dict:
        import asyncio
        logger.info("Creating all social posts for: %s", title[:60])

        # Pass truncated article content to each platform (enough context, not too much)
        truncated = article_content[:8000]

        x_task = self.create_x_post(title, truncated)
        linkedin_task = self.create_linkedin_post(title, truncated)
        threads_task = self.create_threads_post(title, truncated)

        x, linkedin, threads = await asyncio.gather(
            x_task, linkedin_task, threads_task, return_exceptions=True
        )

        result = {
            "x": x if isinstance(x, dict) else {"content": "Failed to generate"},
            "linkedin": linkedin if isinstance(linkedin, dict) else {"content": "Failed to generate"},
            "threads": threads if isinstance(threads, dict) else {"content": "Failed to generate"},
        }
        logger.info("All social posts created — X=%s LinkedIn=%s Threads=%s",
                     "ok" if isinstance(x, dict) else "failed",
                     "ok" if isinstance(linkedin, dict) else "failed",
                     "ok" if isinstance(threads, dict) else "failed")
        return result
