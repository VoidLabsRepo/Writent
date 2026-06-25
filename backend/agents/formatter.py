import logging

import markdown

from tools.llm import LLMClient
from prompts.formatter import FORMATTER_SYSTEM, FORMAT_MEDIUM

logger = logging.getLogger(__name__)


class FormatterAgent:
    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    async def format_for_medium(
        self,
        title: str,
        subtitle: str,
        content_markdown: str,
        citations: list[dict],
    ) -> dict:
        logger.info("Formatting for Medium: %s", title)
        citations_text = "\n".join(
            f"[{c.get('number', i+1)}] [{c['title']}]({c['url']})"
            for i, c in enumerate(citations)
        )

        messages = [
            {"role": "system", "content": FORMATTER_SYSTEM},
            {"role": "user", "content": FORMAT_MEDIUM.format(
                title=title,
                subtitle=subtitle,
                content_markdown=content_markdown,
                citations=citations_text,
            )},
        ]
        llm_result = await self.llm.chat_json(messages, max_tokens=8192)

        # Also generate a clean Markdown version
        word_count = len(content_markdown.split())
        read_time = f"{max(1, word_count // 250)} min read"

        result = {
            "html": llm_result.get("html", self._md_to_html(content_markdown, title)),
            "content_markdown": content_markdown,
            "read_time_estimate": llm_result.get("read_time_estimate", read_time),
            "tags": llm_result.get("tags", []),
        }
        logger.info("Formatted for Medium — tags=%s read_time=%s", result["tags"], result["read_time_estimate"])
        return result

    @staticmethod
    def _md_to_html(md_content: str, title: str) -> str:
        html_body = markdown.markdown(
            md_content,
            extensions=["extra", "codehilite", "toc"],
        )
        return f"<h1>{title}</h1>\n{html_body}"
