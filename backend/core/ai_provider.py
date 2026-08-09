"""Punto único de configuración de IA para los servicios Python de NELVYON.

POR QUÉ EXISTE
-------------
Los servicios Python resolvían el endpoint de IA de dos maneras, y **las dos
terminaban en OpenAI**:

1. Default duro::

       base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

2. Aparentemente inocuo::

       base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
       AsyncOpenAI(api_key=key, base_url=base)

   El segundo NO es más seguro: ``base_url=None`` hace que el SDK use su propio
   default, que es ``https://api.openai.com/v1``. Delegar el default no lo
   elimina; solo lo esconde.

El resultado era que cualquier servicio con una clave en el entorno salía a un
proveedor externo de pago sin decisión explícita, y había ~30 implementaciones
divergentes de la misma resolución.

CONTRATO
--------
El endpoint se resuelve por precedencia explícita:

1. ``NELVYON_AI_BASE_URL`` — infraestructura controlada por NELVYON. Es el
   destino preferente y el único que se considera "propio".
2. ``OPENAI_BASE_URL`` / ``APP_AI_BASE_URL`` — configuración EXPLÍCITA del
   operador. Sirve para apuntar a un endpoint compatible con la API de OpenAI
   que puede ser local (Ollama, vLLM, LiteLLM...). Nunca se rellena solo.
3. Nada configurado → ``NOT_CONFIGURED``. **No hay fallback a
   ``api.openai.com``.** El llamante debe degradar de forma explícita.

Ningún secreto vive en este fichero: todo sale del entorno.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Optional

#: Endpoint público de OpenAI. Solo se usa para DETECTARLO y poder avisar,
#: nunca como valor por defecto.
OPENAI_PUBLIC_BASE_URL = "https://api.openai.com/v1"


@dataclass(frozen=True)
class AiEndpoint:
    """Resolución del endpoint de IA."""

    base_url: str
    api_key: str
    #: ``True`` cuando el destino es infraestructura declarada de NELVYON.
    nelvyon_controlled: bool
    #: ``True`` cuando el destino es el OpenAI público (solo por config explícita).
    external_public: bool


class AiNotConfigured(RuntimeError):
    """No hay endpoint de IA configurado. Capacidad NOT_CONFIGURED."""


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def resolve_ai_endpoint() -> Optional[AiEndpoint]:
    """Resuelve el endpoint, o ``None`` si no hay ninguno configurado.

    Nunca inventa ``api.openai.com``: sin configuración explícita devuelve
    ``None`` y la capacidad queda NOT_CONFIGURED.
    """
    nelvyon_base = _env("NELVYON_AI_BASE_URL")
    explicit_base = _env("OPENAI_BASE_URL") or _env("APP_AI_BASE_URL")

    base_url = nelvyon_base or explicit_base
    if not base_url:
        return None

    api_key = _env("NELVYON_AI_API_KEY") or _env("OPENAI_API_KEY") or _env("APP_AI_KEY")
    if not api_key:
        # Los runtimes locales compatibles (Ollama, vLLM, LiteLLM) ignoran la
        # credencial pero el SDK exige un valor no vacío.
        api_key = "nelvyon-local"

    normalized = base_url.rstrip("/")
    return AiEndpoint(
        base_url=normalized,
        api_key=api_key,
        nelvyon_controlled=bool(nelvyon_base),
        external_public=normalized.startswith(OPENAI_PUBLIC_BASE_URL.rstrip("/")),
    )


def get_ai_client() -> Optional[Any]:
    """Cliente compatible con la API de OpenAI, o ``None`` si no hay endpoint.

    Devolver ``None`` es el estado NOT_CONFIGURED: el llamante debe degradar de
    forma explícita, nunca contactar con un proveedor externo por su cuenta.
    """
    endpoint = resolve_ai_endpoint()
    if endpoint is None:
        return None

    from openai import AsyncOpenAI  # import perezoso: no todos los servicios lo usan

    # `base_url` SIEMPRE explícito: jamás se deja que el SDK ponga su default.
    return AsyncOpenAI(api_key=endpoint.api_key, base_url=endpoint.base_url)


def require_ai_client() -> Any:
    """Igual que :func:`get_ai_client` pero lanza ``AiNotConfigured``."""
    client = get_ai_client()
    if client is None:
        raise AiNotConfigured(
            "IA no configurada: define NELVYON_AI_BASE_URL para usar la "
            "infraestructura de NELVYON. No se contacta ningún proveedor "
            "externo por defecto."
        )
    return client


def ai_capability_status() -> str:
    """``"nelvyon"`` | ``"explicit_external"`` | ``"not_configured"``."""
    endpoint = resolve_ai_endpoint()
    if endpoint is None:
        return "not_configured"
    return "nelvyon" if endpoint.nelvyon_controlled else "explicit_external"
