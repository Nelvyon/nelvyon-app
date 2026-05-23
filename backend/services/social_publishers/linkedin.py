"""LinkedIn v2 UGC posts publisher."""

from __future__ import annotations

import logging
import os

import httpx

from services.social_publishers.base import PublishResult

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get("LINKEDIN_CLIENT_ID") and os.environ.get("LINKEDIN_CLIENT_SECRET"))


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
            error="Configure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET on Railway",
        )
    token = account.get("access_token")
    author = account.get("account_id")
    if not token or not author:
        return PublishResult(False, pending_auth=True, error="LinkedIn account not fully connected")

    if not author.startswith("urn:"):
        author = f"urn:li:person:{author}"

    body: dict = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content[:3000]},
                "shareMediaCategory": "NONE" if not media_urls else "IMAGE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    if media_urls and post_type in ("image", "carousel"):
        body["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
            {
                "status": "READY",
                "originalUrl": media_urls[0],
            }
        ]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.linkedin.com/v2/ugcPosts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                json=body,
            )
            if r.status_code >= 400:
                return PublishResult(False, error=r.text[:500])
            post_id = r.headers.get("x-restli-id") or r.json().get("id", "linkedin-post")
            return PublishResult(True, platform_post_id=str(post_id))
    except Exception as exc:
        logger.warning("LinkedIn publish failed: %s", exc)
        return PublishResult(False, error=str(exc)[:500])
