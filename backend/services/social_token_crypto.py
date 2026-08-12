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
    # Un descifrado fallido NO puede devolver el texto cifrado como si fuera el
    # valor: quien llame lo usaria como token y hablaria con el proveedor con
    # basura, o peor, lo guardaria de vuelta. Si no se puede descifrar, se
    # propaga.
    return decrypt_text(value)
