import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    topic: Mapped[str] = mapped_column(String(500))
    article_mode: Mapped[str] = mapped_column(String(20), default="deep_research")
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # Pipeline state for crash recovery
    pipeline_state: Mapped[dict | None] = mapped_column(JSON, default=None)
    current_step: Mapped[str | None] = mapped_column(String(50), default=None)

    # Content
    title: Mapped[str | None] = mapped_column(String(500), default=None)
    outline: Mapped[str | None] = mapped_column(Text, default=None)
    content_markdown: Mapped[str | None] = mapped_column(Text, default=None)
    content_html: Mapped[str | None] = mapped_column(Text, default=None)

    # Research data
    research_data: Mapped[dict | None] = mapped_column(JSON, default=None)
    citations: Mapped[list | None] = mapped_column(JSON, default=None)
    media: Mapped[list | None] = mapped_column(JSON, default=None)

    # Research notes / todos
    notes: Mapped[dict | None] = mapped_column(JSON, default=None)

    # Social media
    social_posts: Mapped[dict | None] = mapped_column(JSON, default=None)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
