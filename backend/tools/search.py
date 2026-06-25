import logging
import re

from ddgs import DDGS

from tools.browser import BrowserPool

logger = logging.getLogger(__name__)


class WebSearcher:
    def __init__(self, pool: BrowserPool) -> None:
        self.pool = pool
        self._ddgs = DDGS()

    async def search(self, query: str, max_results: int = 10) -> list[dict[str, str]]:
        logger.info("Searching: %s (max_results=%d)", query, max_results)
        try:
            results = self._ddgs.text(query, max_results=max_results)
            formatted = [
                {"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", "")}
                for r in results
            ]
            logger.info("Search returned %d results for: %s", len(formatted), query)
            return formatted
        except Exception as e:
            logger.error("Search failed for '%s': %s", query, e)
            return []

    async def browse_page(self, url: str) -> dict[str, str]:
        logger.info("Browsing: %s", url)
        bp = await self.pool.acquire()
        try:
            page = bp.page
            await page.goto(url, wait_until="domcontentloaded", timeout=20_000)

            title = await page.title()
            content = await page.evaluate(
                """() => {
                document.querySelectorAll('script, style, nav, footer, header, aside, .ad, .sidebar').forEach(el => el.remove());
                const main = document.querySelector('main, article, .content, .post, [role="main"]');
                const el = main || document.body;
                return el ? el.innerText || el.textContent || '' : '';
            }"""
            )
            content = re.sub(r"\n{3,}", "\n\n", content).strip()
            logger.info("Browsed %s — title='%s' content_length=%d", url, title, len(content))
            return {"title": title, "content": content}
        except Exception as e:
            logger.warning("Failed to browse %s: %s", url, e)
            return {"title": "", "content": ""}
        finally:
            await self.pool.release(bp)
