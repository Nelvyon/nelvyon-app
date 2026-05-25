"""Frente 59 — DALL-E / upload images → responsive WebP variants."""

from __future__ import annotations

import io
import logging
import uuid
from typing import Any

from services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

WEBP_QUALITY = 85
SIZES = (
    ("desktop", 1920),
    ("tablet", 768),
    ("mobile", 375),
)
WEBSITES_BUCKET = "websites"


def _require_pillow():
    from PIL import Image

    return Image


async def optimize_image_bytes(
    image_bytes: bytes,
    *,
    base_id: str | None = None,
    bucket: str = "agent-results",
    prefix: str = "optimized",
) -> dict[str, Any]:
    """Convert to WebP at 3 breakpoints; upload to Supabase."""
    Image = _require_pillow()
    img_id = base_id or uuid.uuid4().hex
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    supabase = get_supabase_service()
    variants: dict[str, str] = {}

    for label, max_width in SIZES:
        scale = min(1.0, max_width / w) if w > max_width else 1.0
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
        path = f"{prefix}/{img_id}_{label}.webp"
        up = await supabase.upload_bytes(
            bucket,
            path,
            buf.getvalue(),
            content_type="image/webp",
        )
        variants[label] = up.get("public_url") or supabase.public_url(bucket, path)

    return {
        "id": img_id,
        "variants": variants,
        "picture_html": build_picture_html(
            variants, alt="", width=w, height=h, lazy=True
        ),
        "width": w,
        "height": h,
    }


def build_picture_html(
    variants: dict[str, str],
    *,
    alt: str = "",
    lazy: bool = True,
    width: int | None = None,
    height: int | None = None,
) -> str:
    desk = variants.get("desktop") or variants.get("tablet") or variants.get("mobile") or ""
    tab = variants.get("tablet") or desk
    mob = variants.get("mobile") or tab
    if not desk:
        return ""
    loading = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    w = f' width="{width}"' if width else ""
    h = f' height="{height}"' if height else ""
    return (
        f"<picture>"
        f'<source media="(max-width: 375px)" srcset="{mob}">'
        f'<source media="(max-width: 768px)" srcset="{tab}">'
        f'<img src="{desk}" alt="{_esc(alt)}"{w}{h}{loading} decoding="async">'
        f"</picture>"
    )


def _esc(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
