"""Sin configuración explícita, NELVYON no contacta ningún proveedor externo.

El defecto que esto protege tenía dos formas, y ambas terminaban en OpenAI:

    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")   # default duro
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None                # el SDK pone el default

La segunda parecía inocua pero no lo era: ``AsyncOpenAI(base_url=None)`` usa
``https://api.openai.com/v1``.
"""

from __future__ import annotations

import os
import pathlib
import re

import pytest

from backend.core.ai_provider import (
    AiNotConfigured,
    ai_capability_status,
    get_ai_client,
    require_ai_client,
    resolve_ai_endpoint,
)

AI_ENV = (
    "NELVYON_AI_BASE_URL",
    "OPENAI_BASE_URL",
    "APP_AI_BASE_URL",
    "NELVYON_AI_API_KEY",
    "OPENAI_API_KEY",
    "APP_AI_KEY",
)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for name in AI_ENV:
        monkeypatch.delenv(name, raising=False)


def test_sin_configuracion_no_hay_endpoint():
    assert resolve_ai_endpoint() is None
    assert get_ai_client() is None
    assert ai_capability_status() == "not_configured"


def test_sin_configuracion_require_lanza_not_configured():
    with pytest.raises(AiNotConfigured):
        require_ai_client()


def test_una_clave_suelta_no_activa_openai(monkeypatch):
    """Tener OPENAI_API_KEY NO debe bastar para salir a un proveedor externo."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-no-debe-usarse")
    assert resolve_ai_endpoint() is None
    assert get_ai_client() is None


def test_infra_nelvyon_tiene_precedencia(monkeypatch):
    monkeypatch.setenv("NELVYON_AI_BASE_URL", "http://127.0.0.1:11434/v1")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    endpoint = resolve_ai_endpoint()
    assert endpoint is not None
    assert endpoint.base_url == "http://127.0.0.1:11434/v1"
    assert endpoint.nelvyon_controlled is True
    assert endpoint.external_public is False
    assert ai_capability_status() == "nelvyon"


def test_url_externa_solo_si_se_configura_explicitamente(monkeypatch):
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    endpoint = resolve_ai_endpoint()
    assert endpoint is not None
    # Se respeta porque el operador lo pidió explícitamente, y queda marcado.
    assert endpoint.external_public is True
    assert endpoint.nelvyon_controlled is False
    assert ai_capability_status() == "explicit_external"


def test_endpoint_local_sin_clave_recibe_credencial_placeholder(monkeypatch):
    monkeypatch.setenv("NELVYON_AI_BASE_URL", "http://127.0.0.1:11434/v1")
    endpoint = resolve_ai_endpoint()
    assert endpoint is not None
    assert endpoint.api_key  # el SDK exige valor no vacío
    assert not endpoint.api_key.startswith("sk-")


REPO = pathlib.Path(__file__).resolve().parents[2]
SERVICE_DIRS = (REPO / "backend" / "services", REPO / "backend" / "agents")


def _python_sources():
    for d in SERVICE_DIRS:
        for f in d.glob("*.py"):
            yield f, f.read_text(encoding="utf-8")


def test_ningun_servicio_usa_openai_como_default_duro():
    """`api.openai.com` no puede aparecer como valor por defecto en código."""
    ofensores = []
    patron = re.compile(r'get\(\s*"[A-Z_]*BASE_URL"\s*,\s*"https://api\.openai\.com')
    for path, src in _python_sources():
        if patron.search(src):
            ofensores.append(str(path.relative_to(REPO)))
        # `or "https://api.openai.com/v1"` como último eslabón de la cadena.
        if re.search(r'or\s+"https://api\.openai\.com/v1"', src):
            ofensores.append(str(path.relative_to(REPO)))
    assert ofensores == [], f"defaults duros a OpenAI: {ofensores}"


def test_ningun_servicio_delega_el_default_al_sdk():
    """`base_url=None` deja que el SDK use api.openai.com: prohibido."""
    ofensores = [
        str(path.relative_to(REPO))
        for path, src in _python_sources()
        if re.search(r'get\("OPENAI_BASE_URL", ""\)\.strip\(\) or None', src)
    ]
    assert ofensores == [], f"delegan el default al SDK: {ofensores}"
