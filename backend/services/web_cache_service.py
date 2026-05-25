"""Frente 59 — Redis cache for generated websites and static assets."""

from __future__ import annotations

import json
import logging
from typing import Any

from core.redis_adapter import redis_client

logger = logging.getLogger(__name__)

WEBSITE_TTL = 3600
ASSET_TTL = 86400
CACHE_HEADERS_WEBSITE = "public, max-age=3600"
CACHE_HEADERS_ASSET = "public, max-age=86400"


def _website_key(website_id: str, version: int) -> str:
    return f"website_{website_id}_{version}"


def _asset_key(asset_path: str) -> str:
    return f"web_asset:{asset_path}"


async def get_website_json(website_id: str, version: int) -> dict[str, Any] | None:
    try:
        raw = await redis_client.get(_website_key(website_id, version))
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.debug("website cache get failed: %s", exc)
    return None


async def set_website_json(website_id: str, version: int, payload: dict[str, Any]) -> None:
    try:
        await redis_client.set(
            _website_key(website_id, version),
            json.dumps(payload, default=str),
            ttl=WEBSITE_TTL,
        )
    except Exception as exc:
        logger.debug("website cache set failed: %s", exc)


async def invalidate_website(website_id: str, version: int | None = None) -> None:
    try:
        if version is not None:
            await redis_client.delete(_website_key(website_id, version))
    except Exception as exc:
        logger.debug("website cache invalidate failed: %s", exc)


async def get_asset_meta(path: str) -> dict[str, Any] | None:
    try:
        raw = await redis_client.get(_asset_key(path))
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.debug("asset cache get failed: %s", exc)
    return None


async def set_asset_meta(path: str, meta: dict[str, Any]) -> None:
    try:
        await redis_client.set(
            _asset_key(path),
            json.dumps(meta, default=str),
            ttl=ASSET_TTL,
        )
    except Exception as exc:
        logger.debug("asset cache set failed: %s", exc)
