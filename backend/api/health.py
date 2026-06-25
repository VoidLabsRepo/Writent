import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/health")
async def health():
    logger.debug("Health check requested")
    return {"status": "ok"}
