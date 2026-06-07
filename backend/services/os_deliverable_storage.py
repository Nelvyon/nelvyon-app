"""OS deliverable file storage helpers — bucket paths, safe URLs, signed download prep."""
from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import urlparse

from services.supabase_service import SupabaseService, get_supabase_service

OS_DELIVERABLES_BUCKET = (
    os.environ.get("OS_DELIVERABLES_BUCKET", "os-deliverables").strip() or "os-deliverables"
)
DEFAULT_SIGNED_URL_TTL_SEC = int(os.environ.get("OS_DELIVERABLES_SIGNED_TTL_SEC", "600"))

_UNSAFE_PATH = re.compile(r"\.\.|//|^/|\\")


def is_safe_https_url(url: str | None) -> bool:
    if not url or not str(url).strip():
        return False
    parsed = urlparse(str(url).strip())
    return parsed.scheme == "https" and bool(parsed.netloc)


def deliverable_has_file(*, storage_key: str | None, file_url: str | None) -> bool:
    key = (storage_key or "").strip()
    if key and not _UNSAFE_PATH.search(key):
        return True
    return is_safe_https_url(file_url)


def build_storage_path(
    workspace_id: int,
    deliverable_id: str,
    version: int,
    filename: str,
) -> str:
    safe_name = filename.replace("..", "").replace("\\", "/").lstrip("/")
    return f"{int(workspace_id)}/{deliverable_id}/{int(version)}/{safe_name}"


async def resolve_deliverable_download_url(
    *,
    storage_key: str | None,
    file_url: str | None,
    supabase: SupabaseService | None = None,
    bucket: str = OS_DELIVERABLES_BUCKET,
    expires_in: int = DEFAULT_SIGNED_URL_TTL_SEC,
) -> str | None:
    """Resolve a client-safe download URL. Priority: storage_key (signed) > https file_url."""
    key = (storage_key or "").strip()
    if key:
        if _UNSAFE_PATH.search(key):
            return None
        svc = supabase or get_supabase_service()
        result = await svc.create_signed_url(bucket, key, expires_in=expires_in)
        signed = result.get("signed_url")
        return str(signed) if signed else None

    if is_safe_https_url(file_url):
        return str(file_url).strip()

    return None


def upload_design_note() -> dict[str, Any]:
    """Minimal upload contract for a future operator endpoint (not wired yet)."""
    return {
        "bucket": OS_DELIVERABLES_BUCKET,
        "path_pattern": "{workspace_id}/{deliverable_id}/{version}/{filename}",
        "mock_mode": "SupabaseService returns mock URLs when SUPABASE_URL or service role key missing",
        "compat": "Manual file_url (https) continues to work; storage_key takes priority on download",
        "future_endpoint": "POST /api/v1/os/deliverables/{id}/upload (multipart, operator+)",
    }
