"""Publish scheduled posts to social networks."""

from __future__ import annotations

from services.social_publishers import facebook, instagram, linkedin, tiktok
from services.social_publishers.base import PublishResult

_PUBLISHERS = {
    "instagram": instagram.publish,
    "linkedin": linkedin.publish,
    "facebook": facebook.publish,
    "tiktok": tiktok.publish,
}


async def publish_to_platform(
    platform: str,
    account: dict,
    *,
    content: str,
    media_urls: list,
    post_type: str,
) -> PublishResult:
    fn = _PUBLISHERS.get(platform)
    if not fn:
        return PublishResult(False, error=f"Unknown platform: {platform}")
    return await fn(
        account,
        content=content,
        media_urls=media_urls,
        post_type=post_type,
    )
