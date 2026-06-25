from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    opencode_api_key: str = ""
    opencode_base_url: str = "https://opencode.ai/zen/go/v1"
    opencode_model: str = "mimo-v2.5"
    opencode_fallback_model: str = "deepseek-v4-flash"

    database_url: str = "sqlite+aiosqlite:///./writent.db"

    max_research_agents: int = 3
    max_review_retries: int = 2
    browser_timeout_ms: int = 30_000
    max_browser_contexts: int = 5

    websocket_update_interval: float = 0.5


settings = Settings()
