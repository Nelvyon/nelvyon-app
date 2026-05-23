"""Instagram Graph API publisher."""

from __future__ import annotations

import logging
import os

import httpx

from services.social_publishers.base import PublishResult

logger = logging.getLogger(__name__)
GRAPH = "https://graph.facebook.com/v19.0"


def is_configured() -> bool:
    return bool(os.environ.get("INSTAGRAM_APP_ID") and os.environ.get("INSTAGRAM_APP_SECRET"))


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
            error="Configure INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET on Railway",
        )
    token = account.get("access_token")
    ig_user_id = account.get("account_id")
    if not token or not ig_user_id:
        return PublishResult(False, pending_auth=True, error="Instagram account token missing")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if post_type == "text" and not media_urls:
                return PublishResult(
                    False,
                    error="Instagram requires an image or video for feed posts",
                )
            if post_type in ("image", "carousel", "text") and media_urls:
                if post_type == "carousel" and len(media_urls) > 1:
                    children = []
                    for url in media_urls[:10]:
                        cr = await client.post(
                            f"{GRAPH}/{ig_user_id}/media",
                            params={
                                "image_url": url,
                                "is_carousel_item": "true",
                                "access_token": token,
                            },
                        )
                        cr.raise_for_status()
                        children.append(cr.json().get("id"))
                    cr = await client.post(
                        f"{GRAPH}/{ig_user_id}/media",
                        params={
                            "media_type": "CAROUSEL",
                            "children": ",".join(children),
                            "caption": content[:2200],
                            "access_token": token,
                        },
                    )
                else:
                    cr = await client.post(
                        f"{GRAPH}/{ig_user_id}/media",
                        params={
                            "image_url": media_urls[0],
                            "caption": content[:2200],
                            "access_token": token,
                        },
                    )
                cr.raise_for_status()
                creation_id = cr.json().get("id")
            elif post_type == "video" and media_urls:
                cr = await client.post(
                    f"{GRAPH}/{ig_user_id}/media",
                    params={
                        "media_type": "REELS",
                        "video_url": media_urls[0],
                        "caption": content[:2200],
                        "access_token": token,
                    },
                )
                cr.raise_for_status()
                creation_id = cr.json().get("id")
            else:
                return PublishResult(False, error=f"Unsupported Instagram post_type: {post_type}")

            pub = await client.post(
                f"{GRAPH}/{ig_user_id}/media_publish",
                params={"creation_id": creation_id, "access_token": token},
            )
            pub.raise_for_status()
            post_id = pub.json().get("id", creation_id)
            return PublishResult(True, platform_post_id=str(post_id))
    except Exception as exc:
        logger.warning("Instagram publish failed: %s", exc)
        return PublishResult(False, error=str(exc)[:500])
