"""
El `state` de OAuth es una credencial de un solo uso.

`_load_state` solo LEIA de Redis, asi que el mismo `state` seguia siendo valido
durante todo su TTL. Su unica razon de ser es atar la respuesta del proveedor a
la peticion que la origino; si vale mas de una vez, deja de atar nada.

Un callback legitimo ocurre exactamente una vez.
"""
from __future__ import annotations

import pytest

from services import social_oauth_service as svc


@pytest.mark.asyncio
async def test_un_state_solo_sirve_una_vez():
    """La propiedad central."""
    await svc._save_state("state-de-prueba-1", {"workspace_id": 7, "platform": "instagram"})

    primero = await svc._load_state("state-de-prueba-1")
    assert primero == {"workspace_id": 7, "platform": "instagram"}

    segundo = await svc._load_state("state-de-prueba-1")
    assert segundo is None, "el state se pudo reutilizar"


@pytest.mark.asyncio
async def test_un_state_inexistente_no_devuelve_nada():
    assert await svc._load_state("nunca-guardado") is None


@pytest.mark.asyncio
async def test_states_distintos_no_se_interfieren():
    """Contraprueba: consumir uno no puede invalidar el de otro workspace."""
    await svc._save_state("state-a", {"workspace_id": 1})
    await svc._save_state("state-b", {"workspace_id": 2})

    assert (await svc._load_state("state-a"))["workspace_id"] == 1
    assert (await svc._load_state("state-b"))["workspace_id"] == 2


def test_el_borrado_ocurre_antes_de_devolver():
    """
    Si el borrado fuese despues del `return`, no se ejecutaria nunca; y si
    fuese despues de un fallo, el state seguiria disponible para otro intento.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "services" / "social_oauth_service.py").read_text(
        encoding="utf-8"
    )
    i = src.index("async def _load_state")
    cuerpo = src[i : src.index("def _platform_env", i)]
    assert "redis_client.delete(" in cuerpo, "el state ya no se consume"
    assert cuerpo.index("redis_client.delete(") < cuerpo.rindex("return json.loads")
