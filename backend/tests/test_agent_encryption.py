"""Tests for agent prompt encryption."""

import os

import pytest

from core.agent_encryption import decrypt_prompt, encrypt_prompt


@pytest.fixture
def encryption_key(monkeypatch):
    key = os.urandom(32).hex()
    monkeypatch.setenv("AGENT_ENCRYPTION_KEY", key)
    return key


def test_encrypt_decrypt_roundtrip(encryption_key):
    plain = "Eres un agente elite de NELVYON OS."
    enc = encrypt_prompt(plain)
    assert enc != plain
    assert decrypt_prompt(enc) == plain


def test_missing_key_raises(monkeypatch):
    monkeypatch.delenv("AGENT_ENCRYPTION_KEY", raising=False)
    with pytest.raises(RuntimeError):
        encrypt_prompt("x")
