import logging

from tools.media import MediaCollector

logger = logging.getLogger(__name__)


class MediaCollectorAgent:
    def __init__(self) -> None:
        self.collector = MediaCollector()

    async def collect(self, topic: str, title: str) -> dict:
        logger.info("Collecting media for: %s", title or topic)
        try:
            images = await self.collector.find_images(f"{topic} article", max_results=8)
        except Exception as e:
            logger.warning("Image collection failed: %s", e)
            images = []

        try:
            videos = await self.collector.find_videos(f"{topic} explained", max_results=5)
        except Exception as e:
            logger.warning("Video collection failed: %s", e)
            videos = []

        result = {
            "images": images,
            "videos": videos,
            "total_media": len(images) + len(videos),
        }
        logger.info("Media collection complete — %d images, %d videos", len(images), len(videos))
        return result
