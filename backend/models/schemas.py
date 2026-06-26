from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class PipelineStepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"
    SKIPPED = "skipped"


class ArticleMode(str, Enum):
    CASUAL = "casual"
    SERIOUS = "serious"
    DEEP_RESEARCH = "deep_research"


class ArticleStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"


class PipelineStep(BaseModel):
    id: str
    name: str
    description: str
    status: PipelineStepStatus = PipelineStepStatus.PENDING
    progress: float = 0.0
    message: str | None = None
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class StepUpdate(BaseModel):
    article_id: str
    step_id: str
    status: PipelineStepStatus
    progress: float = 0.0
    message: str | None = None
    error: str | None = None
    data: dict | None = None


class Citation(BaseModel):
    title: str
    url: str
    source: str
    snippet: str
    accessed_at: datetime | None = None


class MediaItem(BaseModel):
    url: str
    type: str  # "image" or "video"
    alt_text: str | None = None
    source: str | None = None


class SocialPost(BaseModel):
    platform: str  # "x", "linkedin", "threads"
    content: str
    char_count: int = 0
    hashtags: list[str] = []


class ArticleCreate(BaseModel):
    topic: str
    custom_instructions: str | None = None
    article_mode: ArticleMode = ArticleMode.DEEP_RESEARCH


class ArticleList(BaseModel):
    id: str
    topic: str
    title: str | None = None
    article_mode: ArticleMode = ArticleMode.DEEP_RESEARCH
    status: ArticleStatus
    current_step: str | None = None
    created_at: datetime
    updated_at: datetime


class ArticleDetail(ArticleList):
    outline: dict | str | None = None
    content_markdown: str | None = None
    content_html: str | None = None
    research_data: dict | None = None
    notes: dict | None = None
    citations: list[dict] | None = None
    media: dict | list | None = None
    social_posts: dict | None = None
    pipeline_steps: list[PipelineStep] = []
    conversation_history: list[dict] | None = None
    custom_instructions: str | None = None
