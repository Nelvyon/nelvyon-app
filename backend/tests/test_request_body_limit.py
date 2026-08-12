"""
El tope de tamano de peticion no puede depender de lo que declare el cliente.

`Content-Length` es una DECLARACION, y no siempre viaja: una peticion con
`Transfer-Encoding: chunked` no la lleva. La comprobacion miraba solo esa
cabecera, asi que bastaba omitirla para saltarse el limite de 10 MB.

Medido antes de corregir: 20 MB sin `Content-Length` entraban ENTEROS y solo los
rechazaba despues la validacion del esquema (422), con la memoria ya consumida.

Ahora, cuando falta la cabecera, el cuerpo se lee por trozos y se corta en
cuanto pasa del tope; lo leido se reinyecta para que el endpoint lo reciba
intacto.
"""
from __future__ import annotations

import json

import pytest
from httpx import AsyncClient

from middlewares.security import MAX_BODY_SIZE


async def _enviar_sin_content_length(client: AsyncClient, cabeceras: dict, trozos: list[bytes]):
    async def gen():
        for t in trozos:
            yield t

    return await client.post(
        "/api/v1/entities/contacts",
        content=gen(),
        headers={**cabeceras, "Content-Type": "application/json"},
    )


@pytest.mark.asyncio
async def test_un_cuerpo_enorme_sin_content_length_se_rechaza(
    client: AsyncClient, auth_headers: dict
):
    """El caso exacto del hallazgo."""
    r = await _enviar_sin_content_length(
        client, auth_headers, [b"x" * (512 * 1024) for _ in range(40)]
    )
    assert r.status_code == 413, f"{r.status_code} {r.text[:150]}"


@pytest.mark.asyncio
async def test_un_cuerpo_enorme_con_content_length_sigue_rechazandose(
    client: AsyncClient, auth_headers: dict
):
    """La comprobacion barata —cortar antes de leer— no se ha perdido."""
    r = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "x" * (MAX_BODY_SIZE + 1000), "email": "a@b.com", "status": "active"},
        headers=auth_headers,
    )
    assert r.status_code == 413, f"{r.status_code} {r.text[:150]}"


@pytest.mark.asyncio
async def test_una_peticion_chunked_legitima_llega_intacta(
    client: AsyncClient, auth_headers: dict
):
    """
    Contraprueba imprescindible: cerrar el bypass no puede romper a los clientes
    que no mandan `Content-Length`. Una primera version reinyectaba el cuerpo
    reconstruyendo el canal ASGI y el endpoint lo recibia VACIO — 422 por campo
    ausente. Aqui se comprueba que llega entero.
    """
    datos = json.dumps(
        {"first_name": "Chunked", "email": "chunked-ok@test.com", "status": "active"}
    ).encode()
    r = await _enviar_sin_content_length(client, auth_headers, [datos])
    assert r.status_code == 201, f"{r.status_code} {r.text[:150]}"
    assert r.json().get("first_name") == "Chunked"


@pytest.mark.asyncio
async def test_una_peticion_normal_no_se_ve_afectada(client: AsyncClient, auth_headers: dict):
    r = await client.post(
        "/api/v1/entities/contacts",
        json={"first_name": "Normal", "email": "normal-32@test.com", "status": "active"},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text[:150]


def test_el_tope_no_depende_solo_de_la_cabecera():
    """Regresion de forma: si vuelve a mirarse solo `content-length`, vuelve el bypass."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "middlewares" / "security.py"
    ).read_text(encoding="utf-8")
    i = src.index("content_length = request.headers.get")
    tramo = src[i : i + 2500]
    assert "request.stream()" in tramo, "ya no se cuenta al leer: el bypass vuelve"
    assert "MAX_BODY_SIZE" in tramo


# ═══════════════════════════════ duracion del stream (bloque 32)

def test_el_stream_sse_no_dura_mas_que_su_autorizacion():
    """
    El token de stream vive 2 minutos a proposito: obliga a reautorizar contra
    conversacion+usuario+workspace. Pero el bucle era `while True`, asi que una
    conexion abierta con ese token seguia viva indefinidamente y la
    autorizacion solo se comprobaba al conectar — la vida corta del token no
    servia de nada.
    """
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "conversation_realtime.py"
    ).read_text(encoding="utf-8")
    assert "while True:" not in src, "el stream volvio a no tener fin"
    assert "STREAM_TOKEN_TTL_MINUTES)" in src
    assert "while datetime.now(timezone.utc) < limite:" in src


def test_el_stream_conserva_su_keepalive():
    """
    Acotar la duracion no puede quitar el ping: sin el, un proxy corta la
    conexion por inactividad antes de que llegue ningun evento.
    """
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "conversation_realtime.py"
    ).read_text(encoding="utf-8")
    assert "event: ping" in src
    assert "asyncio.TimeoutError" in src


def test_el_stream_avisa_al_expirar():
    """El cliente necesita saber por que se cerro, para pedir token nuevo."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "conversation_realtime.py"
    ).read_text(encoding="utf-8")
    assert "event: expired" in src
