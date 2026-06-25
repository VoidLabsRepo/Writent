import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from logging_config import setup_logging
from models.database import init_db
from api.articles import orchestrator
from api.health import router as health_router
from api.articles import router as articles_router
from api.ws import router as ws_router

setup_logging()
logger = logging.getLogger(__name__)


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

app.include_router(health_router)
app.include_router(articles_router)
app.include_router(ws_router)
