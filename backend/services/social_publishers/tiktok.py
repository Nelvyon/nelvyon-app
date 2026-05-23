"""TikTok for Business video publish (simplified init flow)."""

from __future__ import annotations

import logging
import os

import httpx

from services.social_publishers.base import PublishResult

logger = logging.getLogger(__name__)
API = "https://open.tiktokapis.com/v2"


def is_configured() -> bool:
    return bool(os.environ.get("TIKTOK_CLIENT_KEY") and os.environ.get("TIKTOK_CLIENT_SECRET"))


async def publish(
    account: dict,
    *,
    content: str,
    media_urls: list[str],
    post_type: str,
) -> PublishResult:
    if not is_configured():
        return PublishResult(
            False,
            pending_auth=True,
            error="Configure TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET on Railway",
        )
    token = account.get("access_token")
    if not token:
        return PublishResult(False, pending_auth=True, error="TikTok access token missing")
    if post_type != "video" or not media_urls:
        return PublishResult(
            False,
            error="TikTok only supports video posts with a media URL",
        )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            init = await client.post(
                f"{API}/post/publish/video/init/",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "post_info": {
                        "title": content[:150] or "NELVYON post",
                        "privacy_level": "PUBLIC_TO_EVERYONE",
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": media_urls[0],
                    },
                },
            )
            if init.status_code >= 400:
                return PublishResult(False, error=init.text[:500])
            publish_id = init.json().get("data", {}).get("publish_id", "tiktok-init")
            return PublishResult(True, platform_post_id=str(publish_id))
    except Exception as exc:
        logger.warning("TikTok publish failed: %s", exc)
        return PublishResult(False, error=str(exc)[:500])
