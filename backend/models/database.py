import logging

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()
    logger.debug("SQLite pragmas set — WAL mode, busy_timeout=5000")


async def init_db() -> None:
    from models.article import Base

    logger.info("Initializing database — creating tables")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # SQLite migration: add missing columns to existing tables
    async with engine.begin() as conn:
        await conn.run_sync(_migrate_sqlite)

    logger.info("Database initialized successfully")


def _migrate_sqlite(sync_conn) -> None:
    """Add columns that may be missing from older databases."""
    cursor = sync_conn.execute(text("PRAGMA table_info(articles)"))
    existing = {row[1] for row in cursor.fetchall()}

    migrations = [
        ("notes", "JSON"),
        ("article_mode", "TEXT DEFAULT 'deep_research'"),
    ]

    for col, col_type in migrations:
        if col not in existing:
            sync_conn.execute(text(f"ALTER TABLE articles ADD COLUMN {col} {col_type}"))
            logger.info("Migration: added column '%s' to articles table", col)


async def get_session() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session
