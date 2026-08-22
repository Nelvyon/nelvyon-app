"""El mismo webhook entregado dos veces no escribe dos veces.

POR QUE ESTO NO ES UN ESCENARIO DE ATAQUE
------------------------------------------
Es operacion normal. Los proveedores REINTENTAN cuando la respuesta tarda o
falla; Meta reintenta durante horas. Un timeout de quince segundos en NELVYON
metia el mismo DM dos veces en la bandeja.

Y nadie lo veria como un error: se veria como que el cliente escribio dos veces.
Un agente de soporte respondiendo dos veces al mismo mensaje, un informe contando
el doble de conversaciones.

QUE SE ENCONTRO
---------------
De los doce webhooks entrantes, SOLO el de Stripe tenia idempotencia. Los otros
once no comprobaban nada.

LO QUE ESTA BATERIA MIDE
------------------------
El efecto, no la intencion: se envia el MISMO cuerpo firmado dos veces por la
ruta HTTP real y se cuentan las filas. Una prueba del ayudante habria pasado en
verde con el servicio duplicando igual.
"""
from __future__ import annotations

import hashlib
import hmac
import json

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.asyncio

SECRETO = "secreto-de-instagram-de-prueba"
CUENTA = "17841400000000042"
WS = 4242


def _firmar(cuerpo: bytes) -> str:
    return "sha256=" + hmac.new(SECRETO.encode(), cuerpo, hashlib.sha256).hexdigest()


def _cuerpo(mid: str, texto: str = "hola") -> bytes:
    """Un DM de Meta con su `mid`, que es el identificador del mensaje."""
    return json.dumps({
        "object": "instagram",
        "entry": [{
            "id": CUENTA,
            "messaging": [{
                "sender": {"id": "cliente-repetido"},
                "message": {"mid": mid, "text": texto},
            }],
        }],
    }).encode()


@pytest.fixture(autouse=True)
def _secretos(monkeypatch):
    monkeypatch.setenv("INSTAGRAM_APP_SECRET", SECRETO)
    monkeypatch.setenv("NELVYON_MOCK_AI", "1")


@pytest.fixture
async def inquilino(db_session):
    await db_session.execute(text("DELETE FROM oauth_tokens"))
    await db_session.execute(text("DELETE FROM instagram_dm_messages"))
    await db_session.execute(text("DELETE FROM instagram_dm_conversations"))
    await db_session.execute(
        text("INSERT INTO oauth_tokens (workspace_id, user_id, provider, "
             "access_token, account_id) "
             "VALUES (:ws, 'usuario-idem', 'instagram', 'no-real', :cuenta)"),
        {"ws": WS, "cuenta": CUENTA})
    await db_session.commit()
    return WS


async def _entregar(client, cuerpo: bytes):
    return await client.post(
        "/api/instagram-dm/webhook",
        content=cuerpo,
        headers={"x-hub-signature-256": _firmar(cuerpo),
                 "content-type": "application/json"})


async def _entrantes(db_session) -> int:
    return (await db_session.execute(text(
        "SELECT count(*) FROM instagram_dm_messages "
        " WHERE workspace_id = :ws AND direction = 'in'"), {"ws": WS})).scalar()


# ═══════════════════════════════════════════════════════════════════════════


async def test_la_misma_entrega_dos_veces_escribe_una(client, db_session, inquilino):
    """LA PRUEBA. Se cuenta el efecto, no lo que dice el codigo."""
    cuerpo = _cuerpo("m_REINTENTO_1", "necesito ayuda con la factura")

    await _entregar(client, cuerpo)
    tras_la_primera = await _entrantes(db_session)
    assert tras_la_primera == 1, (
        f"la primera entrega escribio {tras_la_primera} mensajes; se esperaba 1")

    await _entregar(client, cuerpo)          # el reintento del proveedor
    tras_la_segunda = await _entrantes(db_session)

    assert tras_la_segunda == 1, (
        f"el reintento duplico el mensaje: {tras_la_segunda} filas. En la bandeja "
        f"se veria como que el cliente escribio dos veces, y un agente le "
        f"responderia dos veces.")


async def test_tres_reintentos_siguen_siendo_uno(client, db_session, inquilino):
    """Meta reintenta durante horas, no una vez."""
    cuerpo = _cuerpo("m_REINTENTO_2")
    for _ in range(3):
        await _entregar(client, cuerpo)
    assert await _entrantes(db_session) == 1


async def test_dos_mensajes_DISTINTOS_si_se_escriben_los_dos(client, db_session, inquilino):
    """EL CONTROL, y el que impide la correccion facil.

    Deduplicar de mas seria peor que el problema: se perderian mensajes reales
    de clientes. Dos `mid` distintos son dos mensajes.
    """
    await _entregar(client, _cuerpo("m_UNO", "primera pregunta"))
    await _entregar(client, _cuerpo("m_DOS", "segunda pregunta"))
    assert await _entrantes(db_session) == 2, (
        "dos mensajes distintos del cliente acabaron colapsados en uno")


async def test_un_mensaje_sin_identificador_no_se_bloquea(client, db_session, inquilino):
    """No todos los proveedores mandan identificador.

    Sin esto, la forma facil de aprobar las pruebas de arriba seria rechazar todo
    lo que no traiga `mid` — y entonces se perderian mensajes de los proveedores
    que no lo mandan. Se prefiere procesar de mas a dejar de procesar.
    """
    cuerpo = json.dumps({
        "object": "instagram",
        "entry": [{"id": CUENTA, "messaging": [{
            "sender": {"id": "cliente-sin-mid"},
            "message": {"text": "sin identificador"},
        }]}],
    }).encode()
    await _entregar(client, cuerpo)
    assert await _entrantes(db_session) >= 1, (
        "un mensaje sin `mid` no se proceso: los proveedores que no lo mandan "
        "quedarian mudos")


async def test_el_mismo_mid_en_otro_workspace_no_se_confunde(
    client, db_session, inquilino
):
    """Dos inquilinos pueden recibir mensajes con el mismo identificador si
    comparten una cuenta mal configurada. Deduplicar entre ellos seria PERDER el
    mensaje de uno de los dos, que es peor que duplicarlo.
    """
    from core.idempotencia_entrante import ya_procesado

    await _entregar(client, _cuerpo("m_COMPARTIDO"))
    assert await _entrantes(db_session) == 1

    # El mismo identificador, otro workspace: no puede considerarse procesado.
    visto = await ya_procesado(db_session, "instagram_dm_messages", 999999,
                               "m_COMPARTIDO")
    assert not visto, (
        "el identificador de un workspace tapo el de otro: se perderia el "
        "mensaje del segundo inquilino")
