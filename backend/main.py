import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.orchestrator import PipelineOrchestrator, PIPELINE_STEPS, PIPELINE_CONFIGS
from config import settings
from logging_config import setup_logging
from models.database import async_session, init_db
from models.article import Article
from models.schemas import ArticleCreate, ArticleDetail, ArticleList, ArticleMode, ArticleStatus

setup_logging()
logger = logging.getLogger(__name__)

orchestrator = PipelineOrchestrator()
active_connections: dict[str, list[WebSocket]] = {}
running_tasks: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await orchestrator.stop()


app = FastAPI(title="Writent", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST API ──────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    logger.debug("Health check requested")
    return {"status": "ok"}


@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str):
    logger.info("Deleting article %s", article_id)
    async with async_session() as session:
        from sqlalchemy import select, delete as sql_delete
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            from fastapi import HTTPException
            raise HTTPException(404, "Article not found")

        # Stop pipeline if running
        task = running_tasks.pop(article_id, None)
        if task and not task.done():
            task.cancel()

        await session.delete(article)
        await session.commit()
        logger.info("Article %s deleted", article_id)
    return {"status": "deleted"}


@app.get("/api/articles", response_model=list[ArticleList])
async def list_articles():
    logger.info("Listing all articles")
    async with async_session() as session:
        from sqlalchemy import select
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


@app.get("/api/articles/{article_id}", response_model=ArticleDetail)
async def get_article(article_id: str):
    logger.info("Fetching article %s", article_id)
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            logger.warning("Article %s not found", article_id)
            from fastapi import HTTPException
            raise HTTPException(404, "Article not found")

        pipeline_steps = _build_pipeline_steps(article)
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
        )


@app.post("/api/articles", response_model=ArticleList)
async def create_article(payload: ArticleCreate):
    logger.info("Creating article — topic=%s mode=%s custom_instructions=%s", payload.topic, payload.article_mode.value, bool(payload.custom_instructions))
    async with async_session() as session:
        article = Article(
            topic=payload.topic,
            article_mode=payload.article_mode.value,
            status=ArticleStatus.IN_PROGRESS.value,
        )
        session.add(article)
        await session.commit()
        await session.refresh(article)
        logger.info("Article %s created in DB (mode=%s)", article.id, payload.article_mode.value)

        task = asyncio.create_task(
            _run_pipeline(article.id, payload.topic, payload.custom_instructions, payload.article_mode.value)
        )
        running_tasks[article.id] = task
        logger.info("Pipeline task started for article %s", article.id)

        return ArticleList(
            id=article.id,
            topic=article.topic,
            article_mode=payload.article_mode,
            status=ArticleStatus.IN_PROGRESS,
            current_step="ideation",
            created_at=article.created_at,
            updated_at=article.updated_at,
        )


# ── Stop Pipeline ──────────────────────────────────────────────

@app.post("/api/articles/{article_id}/stop")
async def stop_article(article_id: str):
    logger.info("Stop requested for article %s", article_id)
    task = running_tasks.pop(article_id, None)
    if task and not task.done():
        task.cancel()
        try:
            async with async_session() as session:
                from sqlalchemy import select
                result = await session.execute(select(Article).where(Article.id == article_id))
                article = result.scalar_one_or_none()
                if article:
                    article.status = ArticleStatus.ERROR.value
                    article.updated_at = datetime.now(timezone.utc)
                    await session.commit()
        except Exception as e:
            logger.warning("Could not update DB on stop: %s", e)
        await _broadcast(article_id, {
            "type": "step_update",
            "step": "stopped",
            "status": "error",
            "data": {"error": "Pipeline stopped by user"},
        })
    return {"status": "stopped"}


# ── WebSocket ─────────────────────────────────────────────────

@app.websocket("/ws/articles/{article_id}")
async def websocket_endpoint(websocket: WebSocket, article_id: str):
    await websocket.accept()
    if article_id not in active_connections:
        active_connections[article_id] = []
    active_connections[article_id].append(websocket)
    logger.info("WebSocket connected for article %s (total: %d)", article_id, len(active_connections[article_id]))

    try:
        while True:
            data = await websocket.receive_text()
            if data == "get_state":
                logger.debug("WebSocket state request for article %s", article_id)
                state = await _get_article_state(article_id)
                await websocket.send_json({"type": "state", "data": state})
    except WebSocketDisconnect:
        active_connections[article_id].remove(websocket)
        logger.info("WebSocket disconnected for article %s (remaining: %d)", article_id, len(active_connections[article_id]))
        if not active_connections[article_id]:
            del active_connections[article_id]


# ── Chat Endpoint ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str


@app.post("/api/articles/{article_id}/chat")
async def chat_about_article(article_id: str, payload: ChatMessage):
    logger.info("Chat request for article %s — message length=%d", article_id, len(payload.message))
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            from fastapi import HTTPException
            raise HTTPException(404, "Article not found")

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

User request: {payload.message}

Modify the article according to the user's request. Return the full modified article.""",
        },
    ]

    try:
        llm = orchestrator.llm
        logger.debug("Calling LLM for chat on article %s", article_id)
        result = await llm.chat_json(messages, max_tokens=16384, temperature=0.7)

        new_content = result.get("content_markdown", current_content)
        changes = result.get("changes_made", "Updated article")
        logger.info("Chat completed for article %s — changes=%s", article_id, changes)

        async with async_session() as session:
            from sqlalchemy import select
            result_db = await session.execute(select(Article).where(Article.id == article_id))
            article = result_db.scalar_one_or_none()
            if article:
                article.content_markdown = new_content
                article.updated_at = datetime.now(timezone.utc)
                await session.commit()

        await _broadcast(article_id, {
            "type": "article_updated",
            "changes": changes,
        })

        return {"status": "ok", "changes": changes, "content": new_content}

    except Exception as e:
        logger.error("Chat failed for %s: %s", article_id, e)
        from fastapi import HTTPException
        raise HTTPException(500, f"Chat failed: {e}")


# ── Pipeline Runner ────────────────────────────────────────────

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
        # Always broadcast to WebSocket clients immediately
        await _broadcast(article_id, {
            "type": "step_update",
            "step": step,
            "status": status,
            "data": _sanitize_for_json(data),
        })

        # Only write to DB on completed/error — not on every in_progress message
        # This prevents SQLite lock contention with concurrent research tasks
        if status not in ("completed", "error"):
            return

        async with async_session() as session:
            from sqlalchemy import select
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
            from sqlalchemy import select
            result = await session.execute(select(Article).where(Article.id == article_id))
            article = result.scalar_one_or_none()
            if article:
                article.status = ArticleStatus.ERROR.value
                await session.commit()

        await _broadcast(article_id, {
            "type": "step_update",
            "step": "error",
            "status": "error",
            "data": {"error": str(e)},
        })


async def _broadcast(article_id: str, message: dict) -> None:
    connections = active_connections.get(article_id, [])
    if connections:
        logger.debug("Broadcasting to %d clients for article %s — type=%s", len(connections), article_id, message.get("type"))
    disconnected = []
    for ws in connections:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        connections.remove(ws)


async def _get_article_state(article_id: str) -> dict:
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            return {}
        return {
            "id": article.id,
            "status": article.status,
            "current_step": article.current_step,
            "title": article.title,
            "content_markdown": article.content_markdown,
            "citations": article.citations,
            "social_posts": article.social_posts,
        }


def _build_pipeline_steps(article: Article) -> list[dict]:
    mode = article.article_mode or "deep_research"
    active_step_ids = set(PIPELINE_CONFIGS.get(mode, PIPELINE_CONFIGS["deep_research"]))
    steps = []
    current_found = False
    for step_def in PIPELINE_STEPS:
        if step_def["id"] not in active_step_ids:
            continue
        status = "pending"
        if article.status == "error" and step_def["id"] == article.current_step:
            status = "error"
            current_found = True
        elif article.current_step is None:
            status = "pending"
        elif not current_found:
            if step_def["id"] == article.current_step:
                status = "in_progress"
                current_found = True
            else:
                status = "completed"

        steps.append({**step_def, "status": status})
    return steps


def _sanitize_for_json(obj: object) -> object:
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(i) for i in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj
