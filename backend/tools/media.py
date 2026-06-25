import logging

from ddgs import DDGS

logger = logging.getLogger(__name__)


class MediaCollector:
    def __init__(self) -> None:
        self._ddgs = DDGS()

    async def find_images(self, query: str, max_results: int = 8) -> list[dict[str, str]]:
        logger.info("Searching images: %s (max=%d)", query, max_results)
        try:
            results = self._ddgs.images(query, max_results=max_results)
            images = [
                {
                    "url": r.get("image", ""),
                    "alt_text": r.get("title", ""),
                    "type": "image",
                    "source": r.get("source", ""),
                }
                for r in results
                if r.get("image")
            ]
            logger.info("Found %d images for: %s", len(images), query)
            return images
        except Exception as e:
            logger.warning("Image search failed for '%s': %s", query, e)
            return []

    async def find_videos(self, query: str, max_results: int = 5) -> list[dict[str, str]]:
        logger.info("Searching videos: %s (max=%d)", query, max_results)
        try:
            results = self._ddgs.videos(query, max_results=max_results)
            videos = [
                {
                    "url": r.get("content", ""),
                    "alt_text": r.get("title", ""),
                    "type": "video",
                    "source": r.get("publisher", ""),
                }
                for r in results
                if r.get("content")
            ]
            logger.info("Found %d videos for: %s", len(videos), query)
            return videos
        except Exception as e:
            logger.warning("Video search failed for '%s': %s", query, e)
            return []
