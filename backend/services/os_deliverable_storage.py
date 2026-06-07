"""OS deliverable file storage helpers — bucket paths, safe URLs, upload validation."""
from __future__ import annotations

import os
import re
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import urlparse

from services.supabase_service import SupabaseService, get_supabase_service

OS_DELIVERABLES_BUCKET = (
    os.environ.get("OS_DELIVERABLES_BUCKET", "os-deliverables").strip() or "os-deliverables"
)
DEFAULT_SIGNED_URL_TTL_SEC = int(os.environ.get("OS_DELIVERABLES_SIGNED_TTL_SEC", "600"))
MAX_UPLOAD_BYTES = int(os.environ.get("OS_DELIVERABLES_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))

ALLOWED_EXTENSIONS = frozenset(
    {"pdf", "png", "jpg", "jpeg", "webp", "svg", "zip", "docx", "xlsx"}
)

EXTENSION_CONTENT_TYPES: dict[str, tuple[str, ...]] = {
    "pdf": ("application/pdf",),
    "png": ("image/png",),
    "jpg": ("image/jpeg",),
    "jpeg": ("image/jpeg",),
    "webp": ("image/webp",),
    "svg": ("image/svg+xml",),
    "zip": ("application/zip", "application/x-zip-compressed"),
    "docx": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
    ),
    "xlsx": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
    ),
}

_UNSAFE_PATH = re.compile(r"\.\.|//|^/|\\")
_FILENAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._\- ]{0,199}$")


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


def sanitize_upload_filename(raw_name: str | None) -> str:
    if not raw_name or not str(raw_name).strip():
        raise ValueError("filename is required")
    name = PurePosixPath(str(raw_name).replace("\\", "/")).name.strip()
    if not name or name in {".", ".."}:
        raise ValueError("invalid filename")
    if _UNSAFE_PATH.search(name):
        raise ValueError("invalid filename")
    if not _FILENAME_RE.match(name):
        raise ValueError(
            "filename must start with alphanumeric and use only letters, numbers, "
            "spaces, dots, dashes or underscores (max 200 chars)"
        )
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise ValueError(f"file type not allowed; permitted: {allowed}")
    return name


def validate_upload_payload(
    *,
    filename: str,
    content_type: str | None,
    size_bytes: int,
) -> tuple[str, str]:
    safe_name = sanitize_upload_filename(filename)
    if size_bytes <= 0:
        raise ValueError("empty file")
    if size_bytes > MAX_UPLOAD_BYTES:
        raise ValueError(f"file exceeds maximum size ({MAX_UPLOAD_BYTES} bytes)")

    ext = safe_name.rsplit(".", 1)[-1].lower()
    allowed_types = EXTENSION_CONTENT_TYPES.get(ext, ())
    ct = (content_type or "").split(";", 1)[0].strip().lower()
    if ct and ct not in allowed_types and ct != "application/octet-stream":
        raise ValueError(f"content type '{ct}' does not match extension .{ext}")

    resolved_ct = ct if ct and ct != "application/octet-stream" else allowed_types[0]
    return safe_name, resolved_ct


def content_type_for_extension(ext: str) -> str:
    key = ext.lower().lstrip(".")
    types = EXTENSION_CONTENT_TYPES.get(key)
    return types[0] if types else "application/octet-stream"


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
    """Upload contract reference (endpoint implemented in os_deliverables_rest)."""
    return {
        "bucket": OS_DELIVERABLES_BUCKET,
        "path_pattern": "{workspace_id}/{deliverable_id}/{version}/{filename}",
        "max_bytes": MAX_UPLOAD_BYTES,
        "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
        "mock_mode": "SupabaseService returns mock URLs when SUPABASE_URL or service role key missing",
        "compat": "Manual file_url (https) continues to work; storage_key takes priority on download",
        "endpoint": "POST /api/v1/os/deliverables/{id}/upload (multipart, operator+)",
    }
