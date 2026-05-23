"""Facebook Graph API publisher."""

from __future__ import annotations

import logging
import os

import httpx

from services.social_publishers.base import PublishResult

logger = logging.getLogger(__name__)
GRAPH = "https://graph.facebook.com/v19.0"


def is_configured() -> bool:
    return bool(os.environ.get("FACEBOOK_APP_ID") and os.environ.get("FACEBOOK_APP_SECRET"))


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
            error="Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET on Railway",
        )
    token = account.get("access_token")
    page_id = account.get("account_id")
    if not token or not page_id:
        return PublishResult(False, pending_auth=True, error="Facebook page token missing")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            if post_type == "video" and media_urls:
                r = await client.post(
                    f"{GRAPH}/{page_id}/videos",
                    data={
                        "file_url": media_urls[0],
                        "description": content[:5000],
                        "access_token": token,
                    },
                )
            elif media_urls:
                r = await client.post(
                    f"{GRAPH}/{page_id}/photos",
                    data={
                        "url": media_urls[0],
                        "caption": content[:5000],
                        "access_token": token,
                    },
                )
            else:
                r = await client.post(
                    f"{GRAPH}/{page_id}/feed",
                    data={"message": content[:5000], "access_token": token},
                )
            if r.status_code >= 400:
                return PublishResult(False, error=r.text[:500])
            data = r.json()
            post_id = data.get("id") or data.get("post_id")
            return PublishResult(True, platform_post_id=str(post_id or "fb-published"))
    except Exception as exc:
        logger.warning("Facebook publish failed: %s", exc)
        return PublishResult(False, error=str(exc)[:500])
