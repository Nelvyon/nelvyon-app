"""Un webhook reenviado no puede duplicar lo que ya escribio.

POR QUE HACE FALTA
------------------
De los doce webhooks entrantes, SOLO el de Stripe tenia idempotencia
—`stripe_webhook_events`—. Los otros once no comprobaban nada.

Y esto no es un escenario de ataque: es operacion normal. Los proveedores
reintentan cuando la respuesta tarda o falla. Meta reintenta durante horas. Un
timeout de 15 segundos en NELVYON producia:

    dos veces el mismo DM en la bandeja
    dos tickets por el mismo correo
    dos citas por la misma reserva
    dos mensajes en la misma conversacion de SMS

Nadie lo veria como un error. Se veria como que el cliente escribio dos veces.

QUE HACE ESTO, Y QUE NO
-----------------------
Comprueba si un identificador de mensaje del PROVEEDOR ya se registro para ese
workspace, mirando el JSON que ya se guarda con cada fila. No hace falta tabla
nueva ni migracion: los servicios ya guardan el evento completo del proveedor en
una columna `jsonb`, y ahi viene su identificador.

Lo que NO cierra es la carrera: dos entregas simultaneas del mismo evento pueden
pasar las dos por el `SELECT` antes de que ninguna haya insertado. La ventana es
de milisegundos y el caso real —el reintento del proveedor tras un timeout— llega
segundos o minutos despues, asi que esto cubre lo que ocurre de verdad.

Cerrarla del todo pide un indice unico sobre el identificador del proveedor, que
es una migracion. Queda anotado como candidato en vez de fingir que no existe.

DE DONDE SALE EL IDENTIFICADOR
------------------------------
Del cuerpo que la firma cubre, igual que el inquilino. Cada proveedor lo llama de
una forma:

    Meta (Instagram, Messenger, WhatsApp)   `mid` dentro del mensaje
    Twilio                                  `MessageSid` / `CallSid`
    Zoom                                    `payload.uuid` o `event_ts`
    SNS/SES                                 `MessageId`
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

#: Claves donde los proveedores meten el identificador del mensaje. Se buscan en
#: este orden; el primero que aparezca manda.
CLAVES_DE_MENSAJE = (
    "mid",            # Meta: Instagram, Messenger, WhatsApp
    "message_id",
    "MessageId",      # Amazon SNS
    "MessageSid",     # Twilio SMS
    "CallSid",        # Twilio voz
    "id",
    "event_id",
    "uuid",           # Zoom
)

#: Tablas donde se puede comprobar, con la columna jsonb que guarda el evento.
#: Cerrada a proposito: los dos nombres acaban dentro del SQL.
_DONDE_MIRAR = {
    "instagram_dm_messages": "meta_json",
    "facebook_messenger_messages": "meta_json",
    "tiktok_dm_messages": "meta_json",
}


def identificador_del_proveedor(evento: dict[str, Any] | None) -> str | None:
    """El id de mensaje que trae el evento, si trae alguno.

    Busca en el nivel superior y un nivel dentro de `message`, que es donde lo
    pone Meta.
    """
    if not isinstance(evento, dict):
        return None
    for clave in CLAVES_DE_MENSAJE:
        valor = evento.get(clave)
        if valor:
            return str(valor)
    interior = evento.get("message")
    if isinstance(interior, dict):
        for clave in CLAVES_DE_MENSAJE:
            valor = interior.get(clave)
            if valor:
                return str(valor)
    return None


async def ya_procesado(
    sesion: AsyncSession, tabla: str, workspace_id: int, identificador: str | None
) -> bool:
    """¿Se registro ya este mensaje del proveedor en este workspace?

    Sin identificador devuelve False: no se puede deduplicar lo que no viene
    identificado, y bloquear todo lo que no lo traiga romperia los proveedores
    que no lo mandan. Se prefiere procesar de mas a dejar de procesar.
    """
    if not identificador:
        return False

    columna = _DONDE_MIRAR.get(tabla)
    if columna is None:
        raise ValueError(
            f"tabla no declarada para idempotencia: {tabla}. Anadela a "
            f"_DONDE_MIRAR a proposito; aqui no se compone SQL con nombres "
            f"que vengan de fuera.")

    # El `workspace_id` va SIEMPRE: dos inquilinos podrian recibir mensajes con
    # el mismo identificador de proveedor si comparten una cuenta mal
    # configurada, y deduplicar entre ellos seria perder el mensaje de uno.
    #
    # Se miran los dos sitios donde los proveedores ponen el `mid`: en el nivel
    # superior del evento y dentro de `message`.
    consulta = (
        f"SELECT 1 FROM {tabla}"
        f" WHERE workspace_id = :ws"
        f"   AND (   {columna} ->> 'mid' = :ident"
        f"        OR {columna} -> 'message' ->> 'mid' = :ident)"
        f" LIMIT 1"
    )
    encontrado = await sesion.execute(text(consulta),
                                      {"ws": workspace_id, "ident": identificador})
    return encontrado.first() is not None
