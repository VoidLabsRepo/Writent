import asyncio
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Coroutine

from agents.ideation import IdeationAgent
from agents.notes_agent import NotesAgent
from agents.research_planner import ResearchPlannerAgent
from agents.researcher import ResearchAgent
from agents.media_collector import MediaCollectorAgent
from agents.citation_collector import CitationCollectorAgent
from agents.writer import WriterAgent
from agents.formatter import FormatterAgent
from agents.social_media import SocialMediaAgent
from config import settings
from tools.browser import BrowserPool
from tools.llm import LLMClient
from tools.search import WebSearcher

logger = logging.getLogger(__name__)


class PipelineStep(str, Enum):
    IDEATION = "ideation"
    NOTES = "notes"
    RESEARCH_PLAN = "research_plan"
    RESEARCH = "research"
    MEDIA = "media"
    CITATIONS = "citations"
    OUTLINE = "outline"
    WRITING = "writing"
    FORMATTING = "formatting"
    SOCIAL = "social"
    COMPLETE = "complete"


ALL_PIPELINE_STEPS = [
    {"id": "ideation", "name": "Ideation", "description": "Refining your topic and angle"},
    {"id": "notes", "name": "Research Notes", "description": "Creating research todos and angles"},
    {"id": "research_plan", "name": "Research Plan", "description": "Creating targeted research tasks"},
    {"id": "research", "name": "Research", "description": "Browsing the web with specific tasks"},
    {"id": "media", "name": "Media Collection", "description": "Finding images and videos"},
    {"id": "citations", "name": "Citations", "description": "Collecting all sources"},
    {"id": "outline", "name": "Outline", "description": "Structuring the article"},
    {"id": "writing", "name": "Writing", "description": "Writing the article"},
    {"id": "formatting", "name": "Formatting", "description": "Preparing for Medium"},
    {"id": "social", "name": "Social Media", "description": "Creating X, LinkedIn, Threads posts"},
    {"id": "complete", "name": "Complete", "description": "All done!"},
]

# Which steps each mode runs
PIPELINE_CONFIGS: dict[str, list[str]] = {
    "casual": [
        "ideation", "outline", "writing", "formatting", "social", "complete",
    ],
    "serious": [
        "ideation", "notes", "research_plan", "research",
        "outline", "writing", "formatting", "social", "complete",
    ],
    "deep_research": [
        "ideation", "notes", "research_plan", "research",
        "media", "citations", "outline", "writing", "formatting", "social", "complete",
    ],
}

# Keep backward compat alias
PIPELINE_STEPS = ALL_PIPELINE_STEPS

UpdateCallback = Callable[[str, str, dict[str, Any]], Coroutine[Any, Any, None]]


class PipelineOrchestrator:
    def __init__(self) -> None:
        self.llm = LLMClient()
        self.pool = BrowserPool()
        self.ideation = IdeationAgent(self.llm)
        self.notes_agent = NotesAgent(self.llm)
        self.planner = ResearchPlannerAgent(self.llm, WebSearcher(self.pool))
        self.researcher = ResearchAgent(self.llm, self.pool)
        self.media = MediaCollectorAgent()
        self.citations = CitationCollectorAgent()
        self.writer = WriterAgent(self.llm)
        self.formatter = FormatterAgent(self.llm)
        self.social = SocialMediaAgent(self.llm)

    async def start(self) -> None:
        await self.pool.start()

    async def stop(self) -> None:
        await self.pool.stop()
        await self.llm.close()

    async def run_pipeline(
        self,
        article_id: str,
        topic: str,
        custom_instructions: str | None = None,
        on_update: UpdateCallback | None = None,
        article_mode: str = "deep_research",
    ) -> dict[str, Any]:
        active_steps = PIPELINE_CONFIGS.get(article_mode, PIPELINE_CONFIGS["deep_research"])
        logger.info("=== PIPELINE START — article=%s topic=%s mode=%s steps=%s ===",
                     article_id, topic, article_mode, active_steps)

        state: dict[str, Any] = {
            "article_id": article_id,
            "topic": topic,
            "article_mode": article_mode,
            "current_step": PipelineStep.IDEATION,
            "research_plan": {},
            "research_findings": [],
            "media_data": {},
            "citations": [],
            "research_synthesis": {},
            "outline": {},
            "article": {},
            "formatted": {},
            "social_posts": {},
        }

        try:
            await self.pool.start()
        except Exception as e:
            logger.warning("Browser pool already started or failed: %s", e)

        async def update(step: str, status: str, data: dict | None = None) -> None:
            if on_update:
                await on_update(step, status, data or {})

        def should_run(step: str) -> bool:
            return step in active_steps

        try:
            # Step 1: Ideation
            logger.info("[%s] Step: Ideation", article_id)
            await update("ideation", "in_progress", {"details": "Analyzing your topic and finding the best angle..."})
            ideation_result = await self.ideation.refine_topic(
                topic, custom_instructions or "", article_mode=article_mode,
            )
            state["refined_topic"] = ideation_result
            state["title"] = ideation_result.get("title", topic)
            logger.info("[%s] Ideation complete — title=%s angle=%s", article_id, ideation_result.get("title"), ideation_result.get("angle"))
            await update("ideation", "completed", ideation_result)

            # Step 1.1: Research Notes (serious + deep_research only)
            if should_run("notes"):
                logger.info("[%s] Step: Research Notes", article_id)
                await update("notes", "in_progress", {"details": "Analyzing topic angles and creating research todos..."})
                notes_result = await self.notes_agent.create_notes(
                    topic=topic,
                    angle=ideation_result.get("angle", ""),
                    audience=ideation_result.get("target_audience", ""),
                    key_questions=ideation_result.get("key_questions", []),
                    custom_instructions=custom_instructions or "",
                    article_mode=article_mode,
                )
                state["notes"] = notes_result
                logger.info("[%s] Notes complete — %d angles, %d tasks", article_id, len(notes_result.get("angles", [])), notes_result.get("total_tasks", 0))
                await update("notes", "completed", notes_result)

            # Step 1.2: Research Plan (serious + deep_research only)
            research_plan = {}
            if should_run("research_plan"):
                logger.info("[%s] Step: Research Plan", article_id)
                await update("research_plan", "in_progress", {"details": "Searching the web to understand the topic landscape..."})
                research_plan = await self.planner.plan(
                    topic=topic,
                    angle=ideation_result.get("angle", ""),
                    audience=ideation_result.get("target_audience", ""),
                    key_questions=ideation_result.get("key_questions", []),
                    article_mode=article_mode,
                )
                state["research_plan"] = research_plan
                logger.info("[%s] Research plan complete — %d categories, %d total tasks",
                            article_id,
                            len(research_plan.get("research_categories", [])),
                            research_plan.get("total_tasks", 0))
                await update("research_plan", "completed", research_plan)

            # Step 2: Targeted Research (serious + deep_research only)
            research_findings = []
            research_synthesis = {}
            if should_run("research"):
                logger.info("[%s] Step: Research", article_id)
                await update("research", "in_progress")

                async def research_progress(msg: str) -> None:
                    await update("research", "in_progress", {"details": msg})

                research_findings = await self.researcher.research_with_plan(
                    topic, research_plan, on_progress=research_progress
                )
                state["research_findings"] = research_findings
                logger.info("[%s] Research complete — %d agent briefings collected", article_id, len(research_findings))
                await update("research", "completed", {"agents_completed": len(research_findings)})

                # Synthesize research
                logger.info("[%s] Step: Research Synthesis", article_id)
                await update("research", "in_progress", {"details": "Synthesizing all research findings into a briefing..."})
                research_synthesis = await self.researcher.synthesize(topic, research_findings)
                state["research_synthesis"] = research_synthesis
                logger.info("[%s] Research synthesis complete", article_id)

            # Step 2.1: Media + Citations (deep_research only for media; citations for serious + deep)
            media_data = {}
            citations_data = []
            if should_run("media") or should_run("citations"):
                logger.info("[%s] Step: Media + Citations (parallel)", article_id)
                tasks = {}

                if should_run("media"):
                    await update("media", "in_progress")
                    tasks["media"] = self.media.collect(topic, state["title"])

                if should_run("citations"):
                    await update("citations", "in_progress")
                    tasks["citations"] = self.citations.collect(research_findings)

                results = await asyncio.gather(*tasks.values()) if tasks else []
                result_keys = list(tasks.keys())
                for key, result in zip(result_keys, results):
                    if key == "media":
                        media_data = result
                        state["media_data"] = media_data
                        logger.info("[%s] Media collected — %d items", article_id, media_data.get("total_media", 0))
                        await update("media", "completed", media_data)
                    elif key == "citations":
                        citations_data = result
                        state["citations"] = citations_data
                        logger.info("[%s] Citations collected — %d sources", article_id, len(citations_data))
                        await update("citations", "completed", {"citations": citations_data})

            # Outline
            logger.info("[%s] Step: Outline", article_id)
            await update("outline", "in_progress", {"details": "Creating a detailed article structure..."})
            outline = await self.writer.create_outline(
                state["title"], topic, research_synthesis, article_mode=article_mode,
                angle=ideation_result.get("angle", ""),
            )
            state["outline"] = outline
            logger.info("[%s] Outline complete — %d sections", article_id, len(outline.get("outline", [])))
            await update("outline", "completed", outline)

            # Writing
            logger.info("[%s] Step: Writing", article_id)
            await update("writing", "in_progress", {"details": "Writing the full article..."})
            article = await self.writer.write_article(
                title=state["title"],
                topic=topic,
                angle=ideation_result.get("angle", ""),
                audience=ideation_result.get("target_audience", ""),
                research_data=research_synthesis,
                citations=citations_data,
                article_mode=article_mode,
            )
            state["article"] = article
            word_count = article.get("word_count", 0)
            logger.info("[%s] Writing complete — word_count=%s", article_id, word_count)
            await update("writing", "completed", article)

            # Formatting
            logger.info("[%s] Step: Formatting", article_id)
            await update("formatting", "in_progress", {"details": "Converting to Medium-compatible HTML..."})
            formatted = await self.formatter.format_for_medium(
                title=article.get("title", topic),
                subtitle=article.get("subtitle", ""),
                content_markdown=article.get("content_markdown", ""),
                citations=citations_data,
            )
            state["formatted"] = formatted
            logger.info("[%s] Formatting complete — %d tags", article_id, len(formatted.get("tags", [])))
            await update("formatting", "completed", formatted)

            # Social Media — pass full article content
            logger.info("[%s] Step: Social Media", article_id)
            await update("social", "in_progress", {"details": "Creating posts for X, LinkedIn, and Threads..."})
            article_content = article.get("content_markdown", "")
            social_posts = await self.social.create_all_posts(
                title=article.get("title", topic),
                article_content=article_content,
            )
            state["social_posts"] = social_posts
            logger.info("[%s] Social media complete", article_id)
            await update("social", "completed", social_posts)

            logger.info("[%s] Step: Complete", article_id)
            await update("complete", "completed")
            state["current_step"] = PipelineStep.COMPLETE
            logger.info("=== PIPELINE COMPLETE — article=%s mode=%s ===", article_id, article_mode)

        except Exception as e:
            logger.error("Pipeline failed at step %s: %s", state.get("current_step"), e)
            current = state.get("current_step", "unknown")
            await update(str(current), "error", {"error": str(e)})
            raise

        return state
