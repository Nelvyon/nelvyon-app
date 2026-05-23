"""Encrypt OAuth tokens at rest for social accounts."""

from __future__ import annotations

import os

from core.mask_crypto import decrypt_text, encrypt_text


def encrypt_token(value: str | None) -> str | None:
    if not value:
        return None
    return encrypt_text(value)


def decrypt_token(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return decrypt_text(value)
    except Exception:
        key = os.environ.get("SOCIAL_TOKEN_ENCRYPTION_KEY") or os.environ.get("MASK_KEY")
        if not key:
            return value
        raise
