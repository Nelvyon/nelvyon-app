"""Base agent utilities — language detection and localized prompts."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

DETECT_MODEL = "gpt-4o"
SUPPORTED_LANGS = frozenset({"es", "en", "fr", "pt", "de", "it"})

LANG_LABELS = {
    "es": "español",
    "en": "English",
    "fr": "français",
    "pt": "português",
    "de": "Deutsch",
    "it": "italiano",
}

CULTURAL_HINTS = {
    "es": "Contexto hispano: tono cercano pero profesional, tuteo en B2C.",
    "en": "US/UK business English: clear, concise, action-oriented.",
    "fr": "Contexte français: formel-vouvoiement en B2B, élégance et précision.",
    "pt": "Contexto lusófono: caloroso e profissional, adaptado ao Brasil/Portugal.",
    "de": "Deutscher Kontext: direkt, sachlich, Sie-Form im B2B.",
    "it": "Contesto italiano: cordiale, professionale, Lei nel B2B.",
}


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


def _heuristic_detect(text: str) -> str:
    t = (text or "").lower()
    if re.search(r"\b(hola|gracias|necesito|quiero|empresa)\b", t):
        return "es"
    if re.search(r"\b(bonjour|merci|besoin|entreprise)\b", t):
        return "fr"
    if re.search(r"\b(olá|obrigado|preciso|empresa)\b", t):
        return "pt"
    if re.search(r"\b(hallo|danke|brauche|unternehmen)\b", t):
        return "de"
    if re.search(r"\b(ciao|grazie|ho bisogno|azienda)\b", t):
        return "it"
    if re.search(r"\b(hello|thanks|please|company|need)\b", t):
        return "en"
    return "es"


async def detect_language(text: str, *, fallback: str = "es") -> str:
    """Detect ISO 639-1 language code from user text (GPT-4o + heuristic fallback)."""
    fb = fallback if fallback in SUPPORTED_LANGS else "es"
    sample = (text or "").strip()[:2000]
    if not sample:
        return fb

    client = _openai_client()
    if client:
        try:
            resp = await client.chat.completions.create(
                model=DETECT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Detect language. Reply ONLY JSON: "
                            '{"language":"es|en|fr|pt|de|it"}'
                        ),
                    },
                    {"role": "user", "content": sample},
                ],
                temperature=0,
                max_tokens=30,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            lang = str(data.get("language", fb)).lower()[:2]
            if lang in SUPPORTED_LANGS:
                return lang
        except Exception as exc:
            logger.debug("detect_language GPT failed: %s", exc)

    detected = _heuristic_detect(sample)
    return detected if detected in SUPPORTED_LANGS else fb


def localized_system_prompt(base_prompt: str, language: str, *, role: str = "assistant") -> str:
    """Wrap a system prompt so the model responds in the client's language."""
    lang = language if language in SUPPORTED_LANGS else "es"
    label = LANG_LABELS.get(lang, lang)
    hint = CULTURAL_HINTS.get(lang, "")
    return (
        f"You are a NELVYON {role}. ALWAYS respond in {label} ({lang}).\n"
        f"Cultural context: {hint}\n\n"
        f"{base_prompt.strip()}"
    )


async def resolve_client_language(
    *,
    text: str | None = None,
    profile_language: str | None = None,
    workspace_locale: str | None = None,
) -> str:
    """Priority: profile language → detected from text → workspace locale → es."""
    if profile_language and profile_language in SUPPORTED_LANGS:
        return profile_language
    if text and text.strip():
        return await detect_language(text, fallback=workspace_locale or "es")
    if workspace_locale and workspace_locale in SUPPORTED_LANGS:
        return workspace_locale
    return "es"
