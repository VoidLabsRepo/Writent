import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class CitationCollectorAgent:
    async def collect(self, agent_briefings: list[dict], search_results: list[dict] | None = None) -> list[dict]:
        """Extract citations from agent briefings. Each briefing has key_findings
        with source_url fields."""
        logger.info("Collecting citations from %d agent briefings", len(agent_briefings))
        citations = []
        seen_urls: set[str] = set()

        for briefing in agent_briefings:
            for item in briefing.get("key_findings", []):
                url = item.get("source_url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    citations.append({
                        "title": item.get("claim", "")[:100],
                        "url": url,
                        "source": self._extract_domain(url),
                        "snippet": item.get("details", item.get("claim", "")),
                        "accessed_at": datetime.now(timezone.utc).isoformat(),
                    })

        for i, citation in enumerate(citations, 1):
            citation["number"] = i

        logger.info("Citations collected — %d total sources", len(citations))
        return citations

    @staticmethod
    def _extract_domain(url: str) -> str:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc.replace("www.", "")
        except Exception:
            return url
