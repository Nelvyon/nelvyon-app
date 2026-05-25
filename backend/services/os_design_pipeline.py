"""Shared DALL-E hero generation and design scoring for OS builders."""

from __future__ import annotations

import logging
from typing import Any

from agents.design_scorer_agent import get_design_scorer_agent

logger = logging.getLogger(__name__)


async def generate_hero_image_dalle(
    sector: str,
    business_name: str = "",
) -> str | None:
    """Generate a DALL-E 3 HD hero image URL for the given sector."""
    from services.dalle_service import get_dalle_service

    sector_label = (sector or "business").strip().replace("_", " ")
    prompt = (
        f"professional {sector_label} business hero image, "
        "ultra realistic, cinematic lighting, 8k"
    )
    if business_name:
        prompt = f"{prompt}, brand: {business_name}"

    try:
        svc = get_dalle_service()
        result = await svc.generate_image(
            prompt,
            size="1792x1024",
            quality="hd",
            style="vivid",
        )
        url = result.get("public_url")
        if url:
            return str(url)
    except Exception as exc:
        logger.warning("Hero image DALL-E generation failed: %s", exc)
    return None


def inject_hero_image_url(website_json: dict[str, Any], url: str) -> dict[str, Any]:
    """Set hero_image_url on root, business_info, and hero blocks."""
    out = dict(website_json)
    out["hero_image_url"] = url
    business = dict(out.get("business_info") or {})
    business["hero_image_url"] = url
    out["business_info"] = business

    pages = []
    for page in out.get("pages") or []:
        page_copy = dict(page)
        blocks = []
        for blk in page.get("blocks") or []:
            blk_copy = dict(blk)
            if blk_copy.get("type") in ("hero", "hero_3d"):
                props = dict(blk_copy.get("props") or {})
                props["imageUrl"] = url
                blk_copy["props"] = props
            blocks.append(blk_copy)
        page_copy["blocks"] = blocks
        pages.append(page_copy)
    out["pages"] = pages
    return out


def inject_store_hero_url(store_json: dict[str, Any], url: str) -> dict[str, Any]:
    """Set hero_image_url on store project JSON and home hero blocks."""
    out = dict(store_json)
    out["hero_image_url"] = url
    store_info = dict(out.get("store_info") or {})
    store_info["hero_image_url"] = url
    out["store_info"] = store_info

    pages = []
    for page in out.get("pages") or []:
        page_copy = dict(page)
        blocks = []
        for blk in page.get("blocks") or []:
            blk_copy = dict(blk)
            if blk_copy.get("type") in ("hero", "hero_3d"):
                props = dict(blk_copy.get("props") or {})
                props["imageUrl"] = url
                blk_copy["props"] = props
            blocks.append(blk_copy)
        page_copy["blocks"] = blocks
        pages.append(page_copy)
    out["pages"] = pages
    return out


async def run_design_score_and_improve(
    website_json: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    agent = get_design_scorer_agent()
    return await agent.score_and_improve(website_json)
