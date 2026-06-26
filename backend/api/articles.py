import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from agents.orchestrator import PipelineOrchestrator
from models.database import async_session
from models.article import Article
from models.schemas import ArticleCreate, ArticleDetail, ArticleList, ArticleMode, ArticleStatus
from api.ws import broadcast, build_pipeline_steps, sanitize_for_json

logger = logging.getLogger(__name__)
router = APIRouter()

orchestrator = PipelineOrchestrator()
running_tasks: dict[str, asyncio.Task] = {}


# ── CRUD ─────────────────────────────────────────────────────

@router.get("/api/articles", response_model=list[ArticleList])
async def list_articles():
    logger.info("Listing all articles")
    async with async_session() as session:
        result = await session.execute(select(Article).order_by(Article.created_at.desc()))
        articles = result.scalars().all()
        logger.info("Found %d articles", len(articles))
        return [
            ArticleList(
                id=a.id,
                topic=a.topic,
                title=a.title,
                article_mode=ArticleMode(a.article_mode) if a.article_mode else ArticleMode.DEEP_RESEARCH,
                status=ArticleStatus(a.status),
                current_step=a.current_step,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in articles
        ]


@router.get("/api/articles/{article_id}", response_model=ArticleDetail)
async def get_article(article_id: str):
    logger.info("Fetching article %s", article_id)
    async with async_session() as session:
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            logger.warning("Article %s not found", article_id)
            raise HTTPException(404, "Article not found")

        pipeline_steps = build_pipeline_steps(article)
        logger.debug("Article %s — status=%s step=%s", article_id, article.status, article.current_step)

        return ArticleDetail(
            id=article.id,
            topic=article.topic,
            title=article.title,
            article_mode=ArticleMode(article.article_mode) if article.article_mode else ArticleMode.DEEP_RESEARCH,
            status=ArticleStatus(article.status),
            current_step=article.current_step,
            created_at=article.created_at,
            updated_at=article.updated_at,
            outline=article.outline,
            content_markdown=article.content_markdown,
            content_html=article.content_html,
            research_data=article.research_data,
            notes=article.notes,
            citations=article.citations,
            media=article.media,
            social_posts=article.social_posts,
            pipeline_steps=pipeline_steps,
            conversation_history=article.conversation_history,
            custom_instructions=article.custom_instructions,
        )


@router.post("/api/articles", response_model=ArticleList)
async def create_article(payload: ArticleCreate):
    logger.info("Creating article — topic=%s mode=%s", payload.topic, payload.article_mode.value)
    async with async_session() as session:
        article = Article(
            topic=payload.topic,
            article_mode=payload.article_mode.value,
            status=ArticleStatus.PENDING.value,
        )
        session.add(article)
        await session.commit()
        await session.refresh(article)
        logger.info("Article %s created in DB (mode=%s)", article.id, payload.article_mode.value)

        return ArticleList(
            id=article.id,
            topic=article.topic,
            article_mode=payload.article_mode,
            status=article.status,
            current_step=None,
            created_at=article.created_at,
            updated_at=article.updated_at,
        )


@router.delete("/api/articles/{article_id}")
async def delete_article(article_id: str):
    logger.info("Deleting article %s", article_id)
    async with async_session() as session:
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article not found")

        task = running_tasks.pop(article_id, None)
        if task and not task.done():
            task.cancel()

        await session.delete(article)
        await session.commit()
        logger.info("Article %s deleted", article_id)
    return {"status": "deleted"}


# ── PATCH (Rename / Start Pipeline) ──────────────────────────

class ArticleUpdate(BaseModel):
    title: str | None = None
    topic: str | None = None
    article_mode: ArticleMode | None = None
    custom_instructions: str | None = None
    start_pipeline: bool = False


@router.patch("/api/articles/{article_id}", response_model=ArticleList)
async def update_article(article_id: str, payload: ArticleUpdate):
    logger.info("Updating article %s — title=%s topic=%s mode=%s start_pipeline=%s", article_id, payload.title, payload.topic, payload.article_mode, payload.start_pipeline)
    async with async_session() as session:
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article not found")

        if payload.title is not None:
            article.title = payload.title
        if payload.topic is not None:
            article.topic = payload.topic
        if payload.article_mode is not None:
            article.article_mode = payload.article_mode.value
        if payload.custom_instructions is not None:
            article.custom_instructions = payload.custom_instructions

        article.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(article)

        if payload.start_pipeline and article.status == ArticleStatus.PENDING.value:
            topic = payload.topic or article.topic
            mode = payload.article_mode.value if payload.article_mode else article.article_mode
            custom_instructions = payload.custom_instructions or article.custom_instructions

            article.status = ArticleStatus.IN_PROGRESS.value
            await session.commit()

            task = asyncio.create_task(
                _run_pipeline(article.id, topic, custom_instructions, mode)
            )
            running_tasks[article.id] = task
            logger.info("Pipeline started for article %s via PATCH", article.id)

        return ArticleList(
            id=article.id,
            topic=article.topic,
            title=article.title,
            article_mode=ArticleMode(article.article_mode) if article.article_mode else ArticleMode.DEEP_RESEARCH,
            status=ArticleStatus(article.status),
            current_step=article.current_step,
            created_at=article.created_at,
            updated_at=article.updated_at,
        )


# ── Stop Pipeline ────────────────────────────────────────────

@router.post("/api/articles/{article_id}/stop")
async def stop_article(article_id: str):
    logger.info("Stop requested for article %s", article_id)
    task = running_tasks.pop(article_id, None)
    if task and not task.done():
        task.cancel()
        try:
            async with async_session() as session:
                result = await session.execute(select(Article).where(Article.id == article_id))
                article = result.scalar_one_or_none()
                if article:
                    article.status = ArticleStatus.ERROR.value
                    article.updated_at = datetime.now(timezone.utc)
                    await session.commit()
        except Exception as e:
            logger.warning("Could not update DB on stop: %s", e)
        await broadcast(article_id, {
            "type": "step_update",
            "step": "stopped",
            "status": "error",
            "data": {"error": "Pipeline stopped by user"},
        })
    return {"status": "stopped"}


# ── Chat (Pre-pipeline conversation + Post-pipeline edit) ────

class ChatMessage(BaseModel):
    message: str
    article_mode: ArticleMode | None = None


@router.post("/api/articles/{article_id}/chat")
async def chat_about_article(article_id: str, payload: ChatMessage):
    logger.info("Chat request for article %s — message length=%d", article_id, len(payload.message))
    async with async_session() as session:
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article not found")

        is_pending = article.status == ArticleStatus.PENDING.value
        conversation_history = article.conversation_history or []

        if payload.article_mode and is_pending:
            article.article_mode = payload.article_mode.value

    if is_pending:
        return await _pre_pipeline_chat(article, conversation_history, payload.message)
    else:
        return await _post_pipeline_chat(article, payload.message)


async def _pre_pipeline_chat(article, conversation_history: list, user_message: str):
    """Handle pre-pipeline conversation: AI asks questions, accumulates topic + instructions.
    Supports topic discovery: AI can search the web for trendy topics when the user asks.
    Uses Playwright for real-time browsing. Broadcasts which URLs are being accessed."""
    mode = article.article_mode or "deep_research"
    now = datetime.now(timezone.utc).strftime("%A, %B %d, %Y at %H:%M UTC")

    base_prompt = f"""You are Writent, a friendly AI writing assistant. The user wants to write an article.

Current date and time: {now}

Your job is to have a brief conversation to understand:
1. What topic they want to write about
2. What angle or perspective they want
3. Any specific requirements (audience, tone, length)

Keep responses SHORT (2-3 sentences max). Be conversational and helpful.

When you have enough information to write the article, tell the user to type "start" to begin.

IMPORTANT: Do NOT write the article yourself. Just gather requirements. Keep it to 2-4 exchanges max.

TOPIC DISCOVERY: If the user asks you to find topics, suggest topics, or search for trendy/trending topics, respond with your suggestions AND include a search query on its own line in this exact format:
[SEARCH: <search query>]
For example, if the user says "find me trending AI topics", you would suggest some topics and end with:
[SEARCH: trending AI topics 2026]
The search results will be provided to you automatically. After receiving results, present 3-5 topic options to the user and let them pick one.
Always use the current date when searching for trending or recent topics."""

    if mode == "serious":
        base_prompt += """

IMPORTANT for Serious mode: Ask the user if they have any specific reference links, articles, or sources they want the AI to use or cite in the article. If they share links, acknowledge them and note you will incorporate those references."""
    elif mode == "deep_research":
        base_prompt += """

For Deep Research mode, the AI will conduct thorough web research independently. No need to ask for links."""

    system_prompt = base_prompt

    messages = [{"role": "system", "content": system_prompt}]
    for turn in conversation_history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        llm = orchestrator.llm
        response = await llm.chat(messages, max_tokens=500, temperature=0.7)

        # Check if AI wants to search
        if "[SEARCH:" in response:
            import re
            search_match = re.search(r"\[SEARCH:\s*(.+?)\]", response)
            if search_match:
                query = search_match.group(1).strip()
                logger.info("Pre-pipeline search requested: %s", query)
                response = re.sub(r"\[SEARCH:\s*.+?\]", "", response).strip()

                await broadcast(article.id, {
                    "type": "chat_search",
                    "query": query,
                    "status": "searching",
                })

                # Direct Playwright search — no agents, just the browser
                search_results_text = ""
                bp = await orchestrator.pool.acquire()
                try:
                    page = bp.page
                    search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
                    logger.info("Searching Google: %s", search_url)

                    await broadcast(article.id, {
                        "type": "chat_search",
                        "url": search_url,
                        "status": "browsing",
                    })

                    await page.goto(search_url, wait_until="domcontentloaded", timeout=15_000)
                    await page.wait_for_timeout(1500)

                    results = await page.evaluate("""() => {
                        const items = [];
                        document.querySelectorAll('div.g, div[data-sokoban-container]').forEach(el => {
                            const titleEl = el.querySelector('h3');
                            const linkEl = el.querySelector('a[href]');
                            const snippetEl = el.querySelector('[data-sncf], .VwiC3b, .IsZvec');
                            if (titleEl && linkEl) {
                                items.push({
                                    title: titleEl.innerText,
                                    url: linkEl.href,
                                    snippet: snippetEl ? snippetEl.innerText : ''
                                });
                            }
                        });
                        return items.slice(0, 8);
                    }""")

                    if results:
                        search_results_text = "\n\nSearch results:\n"
                        for i, r in enumerate(results, 1):
                            search_results_text += f"{i}. {r['title']} — {r['snippet']}\n   URL: {r['url']}\n"

                    await broadcast(article.id, {
                        "type": "chat_search",
                        "status": "done",
                        "results_count": len(results) if results else 0,
                    })

                except Exception as e:
                    logger.warning("Playwright search failed: %s", e)
                    await broadcast(article.id, {
                        "type": "chat_search",
                        "status": "fallback",
                    })
                finally:
                    await orchestrator.pool.release(bp)

                if search_results_text:
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": f"Here are the search results for '{query}':\n{search_results_text}\n\nNow present 3-5 topic options to the user based on these results. Keep it concise."})
                    response = await llm.chat(messages, max_tokens=500, temperature=0.7)

        new_history = conversation_history + [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": response},
        ]

        async with async_session() as session:
            result = await session.execute(select(Article).where(Article.id == article.id))
            db_article = result.scalar_one_or_none()
            if db_article:
                db_article.conversation_history = new_history
                if not db_article.topic or db_article.topic == "New session":
                    db_article.topic = user_message
                db_article.updated_at = datetime.now(timezone.utc)
                await session.commit()

        return {"response": response}

    except Exception as e:
        logger.error("Pre-pipeline chat failed for %s: %s", article.id, e)
        raise HTTPException(500, f"Chat failed: {e}")


async def _post_pipeline_chat(article, user_message: str):
    """Handle post-pipeline chat: edit the existing article."""
    current_content = article.content_markdown or ""
    topic = article.topic

    messages = [
        {"role": "system", "content": """You are an article editor. The user will give you instructions to modify an article.
You must return the ENTIRE modified article in the same JSON format:
{
  "content_markdown": "The full modified article in Markdown",
  "changes_made": "Brief description of what you changed"
}

Rules:
- Keep the article's existing quality and tone
- Apply the user's requested changes precisely
- Return the COMPLETE article, not just the changes
- If the user asks to add a section, write it in the same style as the existing article"""},
        {"role": "user", "content": f"""Current article:
{current_content}

User request: {user_message}

Modify the article according to the user's request. Return the full modified article.""",
        },
    ]

    try:
        llm = orchestrator.llm
        logger.debug("Calling LLM for chat on article %s", article.id)
        result = await llm.chat_json(messages, max_tokens=16384, temperature=0.7)

        new_content = result.get("content_markdown", current_content)
        changes = result.get("changes_made", "Updated article")
        logger.info("Chat completed for article %s — changes=%s", article.id, changes)

        async with async_session() as session:
            result_db = await session.execute(select(Article).where(Article.id == article.id))
            db_article = result_db.scalar_one_or_none()
            if db_article:
                db_article.content_markdown = new_content
                db_article.updated_at = datetime.now(timezone.utc)
                await session.commit()

        await broadcast(article.id, {
            "type": "article_updated",
            "changes": changes,
        })

        return {"status": "ok", "changes": changes, "content": new_content}

    except Exception as e:
        logger.error("Chat failed for %s: %s", article.id, e)
        raise HTTPException(500, f"Chat failed: {e}")


# ── Casual Mode: Save Article ────────────────────────────────

class CasualSavePayload(BaseModel):
    content_markdown: str
    title: str | None = None


@router.post("/api/articles/{article_id}/casual/save")
async def save_casual_article(article_id: str, payload: CasualSavePayload):
    logger.info("Saving casual article %s — title=%s content_length=%d", article_id, payload.title, len(payload.content_markdown))
    async with async_session() as session:
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article not found")

        article.content_markdown = payload.content_markdown
        if payload.title:
            article.title = payload.title
        article.status = ArticleStatus.COMPLETED.value
        article.updated_at = datetime.now(timezone.utc)
        await session.commit()

    await broadcast(article_id, {
        "type": "article_updated",
        "changes": "Article saved from casual conversation",
    })

    return {"status": "ok"}


# ── Pipeline Runner ──────────────────────────────────────────

async def _run_pipeline(
    article_id: str, topic: str, custom_instructions: str | None = None, article_mode: str = "deep_research"
) -> None:
    logger.info("Pipeline starting for article %s — topic=%s mode=%s", article_id, topic, article_mode)
    if custom_instructions:
        logger.info("Custom instructions provided: %s", custom_instructions[:200])

    async def on_update(step: str, status: str, data: dict) -> None:
        if status == "in_progress":
            logger.info("Pipeline step %s → in_progress (article %s)", step, article_id)
        elif status == "completed":
            logger.info("Pipeline step %s → completed (article %s)", step, article_id)
        elif status == "error":
            logger.error("Pipeline step %s → error (article %s): %s", step, article_id, data.get("error", "unknown"))
        await broadcast(article_id, {
            "type": "step_update",
            "step": step,
            "status": status,
            "data": sanitize_for_json(data),
        })

        if status not in ("completed", "error"):
            return

        async with async_session() as session:
            result = await session.execute(select(Article).where(Article.id == article_id))
            article = result.scalar_one_or_none()
            if not article:
                return

            article.current_step = step
            article.updated_at = datetime.now(timezone.utc)

            if status == "completed":
                if step == "ideation":
                    article.title = data.get("title", article.title)
                elif step == "notes":
                    article.notes = data
                elif step == "writing":
                    article.title = data.get("title", article.title) or article.title
                    article.content_markdown = data.get("content_markdown")
                elif step == "citations":
                    article.citations = data.get("citations", [])
                elif step == "media":
                    article.media = data
                elif step == "formatting":
                    article.content_html = data.get("html")
                    article.content_markdown = data.get("content_markdown") or article.content_markdown
                elif step == "social":
                    article.social_posts = data
                elif step == "complete":
                    article.status = ArticleStatus.COMPLETED.value
            elif status == "error":
                article.status = ArticleStatus.ERROR.value

            await session.commit()

    try:
        await orchestrator.run_pipeline(
            article_id, topic, custom_instructions, on_update, article_mode=article_mode,
        )
        logger.info("Pipeline completed successfully for article %s", article_id)
    except asyncio.CancelledError:
        logger.info("Pipeline cancelled for article %s", article_id)
    except Exception as e:
        logger.error("Pipeline failed for article %s: %s", article_id, e, exc_info=True)
        async with async_session() as session:
            result = await session.execute(select(Article).where(Article.id == article_id))
            article = result.scalar_one_or_none()
            if article:
                article.status = ArticleStatus.ERROR.value
                await session.commit()

        await broadcast(article_id, {
            "type": "step_update",
            "step": "error",
            "status": "error",
            "data": {"error": str(e)},
        })
