import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from tools.llm import LLMClient
from tools.search import WebSearcher
from tools.browser import BrowserPool
from prompts.research import (
    RESEARCHER_SYSTEM, RESEARCH_TASK, SYNTHESIZE_AGENT_FINDINGS, SYNTHESIZE_RESEARCH,
)

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[str], Coroutine[Any, Any, None]]


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


class ResearchAgent:
    def __init__(self, llm: LLMClient, pool: BrowserPool) -> None:
        self.llm = llm
        self.searcher = WebSearcher(pool)
        self.pool = pool

    async def research_with_plan(
        self, topic: str, research_plan: dict, on_progress: ProgressCallback | None = None
    ) -> list[dict]:
        """Research using the structured plan. Each category = one agent that
        executes its tasks, synthesizes its own findings, and returns a
        concise briefing."""
        categories = research_plan.get("research_categories", [])
        logger.info("Starting research — %d agent categories", len(categories))

        async def run_category(agent_number: int, cat: dict) -> dict | None:
            cat_name = cat.get("category", f"Agent {agent_number}")
            tasks = cat.get("tasks", [])
            logger.info("[%s] Agent #%d starting — %d tasks", cat_name, agent_number, len(tasks))
            if on_progress:
                await on_progress(f"Agent #{agent_number}: {cat_name}")

            # 1. Execute all tasks for this category
            raw_findings = []
            for task in tasks:
                try:
                    result = await self._execute_research_task(topic, cat_name, task, on_progress)
                    if result:
                        raw_findings.append(result)
                except Exception as e:
                    logger.warning("[%s] Task failed: %s", cat_name, e)

            if not raw_findings:
                logger.warning("[%s] No findings collected — skipping synthesis", cat_name)
                return None

            # 2. Synthesize this agent's findings into a concise briefing
            logger.info("[%s] Synthesizing %d task results", cat_name, len(raw_findings))
            briefing = await self._synthesize_agent_findings(
                agent_number=agent_number,
                agent_goal=cat_name,
                task_count=len(raw_findings),
                raw_findings=raw_findings,
                on_progress=on_progress,
            )
            return briefing

        # Run categories in parallel (max 3 concurrent agents to avoid API rate limits)
        sem = asyncio.Semaphore(3)

        async def limited_run(i: int, cat: dict) -> dict | None:
            async with sem:
                return await run_category(i + 1, cat)

        results = await asyncio.gather(
            *[limited_run(i, cat) for i, cat in enumerate(categories)],
            return_exceptions=True,
        )

        agent_briefings = []
        for r in results:
            if isinstance(r, dict):
                agent_briefings.append(r)
            elif isinstance(r, Exception):
                logger.error("Agent category failed: %s", r)

        logger.info("Research complete — %d agent briefings collected", len(agent_briefings))
        return agent_briefings

    async def _execute_research_task(
        self, topic: str, category: str, task: dict, on_progress: ProgressCallback | None = None
    ) -> dict | None:
        desc = task.get("description", "")
        search_queries = task.get("search_queries", [f"{topic} {desc}"])
        browse_urls = task.get("browse_urls", [])
        logger.info("  Task: %s", desc[:80])

        async def progress(msg: str) -> None:
            if on_progress:
                await on_progress(msg)

        all_results = []
        for query in search_queries[:3]:
            await progress(f"Searching: {query}")
            results = await self.searcher.search(query, max_results=5)
            all_results.extend(results)

        urls_to_browse = browse_urls[:2]
        for r in all_results[:3]:
            url = r.get("url", "")
            if url and url not in urls_to_browse:
                urls_to_browse.append(url)

        page_contents = []
        for url in urls_to_browse[:4]:
            await progress(f"Reading: {url}")
            try:
                page = await self.searcher.browse_page(url)
                if page.get("content"):
                    page_contents.append(
                        f"--- {page.get('title', url)} ({url}) ---\n{page['content']}"
                    )
            except Exception as e:
                logger.warning("Browse failed %s: %s", url, e)

        context = "\n\n".join(page_contents) if page_contents else "\n".join(
            f"[{i+1}] {r['title']}\n{r['url']}\n{r['snippet']}"
            for i, r in enumerate(all_results[:8])
        )

        if not context.strip():
            logger.info("  Task '%s' — no usable sources found", desc[:60])
            return None

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{RESEARCHER_SYSTEM}"},
            {"role": "user", "content": RESEARCH_TASK.format(
                task_description=desc, category=category, topic=topic, context=context,
            )},
        ]
        return await self.llm.chat_json(messages, max_tokens=8192)

    async def _synthesize_agent_findings(
        self,
        agent_number: int,
        agent_goal: str,
        task_count: int,
        raw_findings: list[dict],
        on_progress: ProgressCallback | None = None,
    ) -> dict:
        """Have an agent synthesize its own findings into a concise briefing."""
        if on_progress:
            await on_progress(f"Agent #{agent_number}: synthesizing findings")

        # Build a compact summary of all task results
        findings_parts = []
        for f in raw_findings:
            part = f"--- Task: {f.get('task', 'unknown')} ---\n"
            for finding in f.get("key_findings", []):
                part += f"- {finding.get('claim', '')} (Source: {finding.get('source_url', 'N/A')})\n"
            if f.get("statistics"):
                part += f"Statistics: {', '.join(str(s) for s in f['statistics'][:10])}\n"
            if f.get("expert_quotes"):
                part += f"Quotes: {'; '.join(str(q) for q in f['expert_quotes'][:5])}\n"
            if f.get("comparisons"):
                part += f"Comparisons: {'; '.join(str(c) for c in f['comparisons'][:5])}\n"
            findings_parts.append(part)

        raw_text = "\n".join(findings_parts)

        # Truncate if still too large
        if len(raw_text) > 30000:
            raw_text = raw_text[:30000] + "\n[... truncated ...]"

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{RESEARCHER_SYSTEM}"},
            {"role": "user", "content": SYNTHESIZE_AGENT_FINDINGS.format(
                agent_number=agent_number,
                agent_goal=agent_goal,
                task_count=task_count,
                raw_findings=raw_text,
            )},
        ]
        return await self.llm.chat_json(messages, max_tokens=8192)

    async def synthesize(self, topic: str, agent_briefings: list[dict]) -> dict:
        """Final synthesis: combine agent briefings into one article-ready briefing."""
        logger.info("Final synthesis — %d agent briefings for topic: %s", len(agent_briefings), topic[:60])

        briefings_text = "\n\n".join(
            f"=== Agent: {b.get('agent_goal', 'unknown')} ===\n"
            f"Summary: {b.get('executive_summary', '')}\n"
            + "\n".join(
                f"- {f.get('claim', '')} (Source: {f.get('source_url', 'N/A')})"
                for f in b.get("key_findings", [])
            )
            + (f"\nStatistics: {', '.join(str(s) for s in b.get('statistics', []))}" if b.get("statistics") else "")
            + (f"\nQuotes: {'; '.join(str(q) for q in b.get('expert_quotes', []))}" if b.get("expert_quotes") else "")
            + (f"\nComparisons: {'; '.join(str(c) for c in b.get('comparisons', []))}" if b.get("comparisons") else "")
            + (f"\nKey insight: {b.get('key_insight', '')}" if b.get("key_insight") else "")
            for b in agent_briefings
        )

        logger.info("Final synthesis payload — %d chars (~%d tokens)", len(briefings_text), len(briefings_text) // 4)

        messages = [
            {"role": "system", "content": f"Today's date: {_today()}\n\n{SYNTHESIZE_RESEARCH.split(chr(10))[0]}"},
            {"role": "user", "content": SYNTHESIZE_RESEARCH.format(
                topic=topic, agent_count=len(agent_briefings), all_findings=briefings_text,
            )},
        ]
        return await self.llm.chat_json(messages, max_tokens=8192)
