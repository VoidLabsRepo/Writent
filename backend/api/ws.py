import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from models.database import async_session
from models.article import Article
from agents.orchestrator import PIPELINE_STEPS, PIPELINE_CONFIGS

logger = logging.getLogger(__name__)
router = APIRouter()

active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/articles/{article_id}")
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


async def broadcast(article_id: str, message: dict) -> None:
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


def build_pipeline_steps(article: Article) -> list[dict]:
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


def sanitize_for_json(obj: object) -> object:
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj
