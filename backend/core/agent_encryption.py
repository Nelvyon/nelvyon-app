"""AES-256-GCM encryption for OS agent prompts — key from AGENT_ENCRYPTION_KEY only."""

from __future__ import annotations

import base64
import os
import secrets
from typing import Final

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_NONCE_BYTES: Final = 12
_KEY_ENV = "AGENT_ENCRYPTION_KEY"


def _load_key() -> bytes:
    raw = os.environ.get(_KEY_ENV, "").strip()
    if not raw:
        raise RuntimeError(f"{_KEY_ENV} is not configured")
    try:
        if len(raw) == 64 and all(c in "0123456789abcdefABCDEF" for c in raw):
            key = bytes.fromhex(raw)
        else:
            key = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    except Exception as exc:
        raise RuntimeError(f"Invalid {_KEY_ENV} format") from exc
    if len(key) != 32:
        raise RuntimeError(f"{_KEY_ENV} must decode to 32 bytes (AES-256)")
    return key


def encrypt_prompt(plaintext: str) -> str:
    """Encrypt prompt text; returns base64url(nonce || ciphertext+tag)."""
    if plaintext is None:
        plaintext = ""
    key = _load_key()
    nonce = secrets.token_bytes(_NONCE_BYTES)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_prompt(encrypted_prompt: str) -> str:
    """Decrypt prompt at runtime only — never log the return value."""
    if not encrypted_prompt:
        return ""
    key = _load_key()
    blob = base64.urlsafe_b64decode(encrypted_prompt + "=" * (-len(encrypted_prompt) % 4))
    if len(blob) < _NONCE_BYTES + 16:
        raise ValueError("Invalid encrypted prompt blob")
    nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")
