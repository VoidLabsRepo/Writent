import asyncio
import logging
from dataclasses import dataclass, field

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class BrowserPage:
    page: Page
    context: BrowserContext


class BrowserPool:
    def __init__(self) -> None:
        self._playwright = None
        self._browser: Browser | None = None
        self._contexts: list[BrowserContext] = []
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        logger.info("Starting browser pool")
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        logger.info("Browser pool started — chromium launched")

    async def acquire(self) -> BrowserPage:
        async with self._lock:
            if not self._browser:
                await self.start()
            assert self._browser is not None

            if len(self._contexts) >= settings.max_browser_contexts:
                oldest = self._contexts.pop(0)
                logger.debug("Closing oldest browser context (pool full)")
                await oldest.close()

            context = await self._browser.new_context(
                viewport={"width": 1280, "height": 720},
                user_agent=(
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                ),
            )
            self._contexts.append(context)
            page = await context.new_page()
            page.set_default_timeout(settings.browser_timeout_ms)
            return BrowserPage(page=page, context=context)

    async def release(self, bp: BrowserPage) -> None:
        try:
            await bp.page.close()
        except Exception:
            pass
        if bp.context in self._contexts:
            self._contexts.remove(bp.context)
        try:
            await bp.context.close()
        except Exception:
            pass
        logger.debug("Browser context released — active contexts: %d", len(self._contexts))

    async def stop(self) -> None:
        logger.info("Stopping browser pool — closing %d contexts", len(self._contexts))
        for ctx in self._contexts:
            try:
                await ctx.close()
            except Exception:
                pass
        self._contexts.clear()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def __aenter__(self) -> "BrowserPool":
        await self.start()
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.stop()
