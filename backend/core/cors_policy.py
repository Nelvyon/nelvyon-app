"""Restrictive CORS — NELVYON domains + verified white-label origins."""

from __future__ import annotations

import os
import re

_NELVYON_ORIGIN = re.compile(
    r"^https://([a-z0-9-]+\.)*nelvyon\.(com|dev|app)(:\d+)?$",
    re.I,
)
_RAILWAY_ORIGIN = re.compile(r"^https://([a-z0-9-]+\.)*up\.railway\.app(:\d+)?$", re.I)
_LOCALHOST = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", re.I)


def _extra_origins() -> list[str]:
    raw = os.environ.get("WHITELABEL_CORS_ORIGINS", "").strip()
    if not raw:
        return []
    return [o.strip() for o in raw.split(",") if o.strip()]


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return False
    o = origin.strip()
    if _NELVYON_ORIGIN.match(o) or _LOCALHOST.match(o) or _RAILWAY_ORIGIN.match(o):
        return True
    return o in _extra_origins()


def cors_origin_regex(environment: str) -> str:
    env = environment.lower()
    if env in ("dev", "development", "test"):
        return r"https?://.*"
    extras = _extra_origins()
    railway = r"https://([a-z0-9-]+\.)*up\.railway\.app(:\d+)?$"
    nelvyon = r"https://(.*\.)?nelvyon\.(com|dev|app)(:\d+)?$"
    if extras:
        escaped = "|".join(re.escape(x) for x in extras)
        return rf"{nelvyon}|{railway}|{escaped}"
    return rf"{nelvyon}|{railway}"
