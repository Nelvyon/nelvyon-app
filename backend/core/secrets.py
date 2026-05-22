"""
SECRETS-1: centralized helpers to avoid leaking secrets in logs/errors/audit.
"""
from __future__ import annotations

import re
from typing import Any

REDACTED = "***redacted***"
_TOKEN_SUFFIX_LEN = 4

_SENSITIVE_KEY_WORDS = (
    "authorization",
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "cookie",
    "set-cookie",
    "session",
    "nelvyon_session",
    "stripe",
)

# key=value / key: value style leaks
_INLINE_SECRET_RE = re.compile(
    r"(?i)\b("
    r"authorization|password|password_hash|token|access_token|refresh_token|api_key|secret|cookie|set-cookie|nelvyon_session|stripe[_a-z0-9]*"
    r")\b\s*[:=]\s*([^\s,;]+)"
)

# Authorization: Bearer <token>
_BEARER_RE = re.compile(r"(?i)\b(bearer)\s+([A-Za-z0-9\-._~+/=]+)")

# Cookie snippets
_SESSION_COOKIE_RE = re.compile(r"(?i)\b(nelvyon_session\s*=\s*)([^;,\s]+)")


def _is_sensitive_key(key: Any) -> bool:
    if not isinstance(key, str):
        return False
    k = key.strip().lower()
    return any(word in k for word in _SENSITIVE_KEY_WORDS)


def _mask_token_value(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return REDACTED
    if len(raw) <= _TOKEN_SUFFIX_LEN:
        return REDACTED
    return f"***{raw[-_TOKEN_SUFFIX_LEN:]}"


def sanitize_text(text: str) -> str:
    """
    Redact secret-like values from free text.
    Keeps only a short suffix for token-like values when possible.
    """
    if not isinstance(text, str) or not text:
        return text

    scrubbed = _INLINE_SECRET_RE.sub(lambda m: f"{m.group(1)}={REDACTED}", text)
    scrubbed = _SESSION_COOKIE_RE.sub(lambda m: f"{m.group(1)}{REDACTED}", scrubbed)
    scrubbed = _BEARER_RE.sub(lambda m: f"{m.group(1)} {_mask_token_value(m.group(2))}", scrubbed)
    return scrubbed


def sanitize_for_logging(data: Any) -> Any:
    """Recursively redact sensitive keys/values from dict/list payloads."""
    if isinstance(data, dict):
        out: dict[Any, Any] = {}
        for key, value in data.items():
            if _is_sensitive_key(key):
                out[key] = REDACTED
            else:
                out[key] = sanitize_for_logging(value)
        return out
    if isinstance(data, list):
        return [sanitize_for_logging(v) for v in data]
    if isinstance(data, tuple):
        return tuple(sanitize_for_logging(v) for v in data)
    if isinstance(data, str):
        return sanitize_text(data)
    return data


def safe_client_error_detail(exc: BaseException, fallback: str = "Internal server error") -> str:
    """Return sanitized error detail safe for HTTP responses."""
    raw = str(exc) if exc is not None else ""
    if not raw:
        return fallback
    return sanitize_text(raw)
