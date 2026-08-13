"""Puente entre el workspace del backend FastAPI y el inquilino de `/saas`.

POR QUE EXISTEN DOS IDENTIFICADORES
-----------------------------------
NELVYON tiene dos superficies sobre la MISMA base de datos:

  * el backend FastAPI, que identifica al cliente con `workspace_id` (entero);
  * `/saas` (Next.js), que lo identifica con `saas_tenants.id` (uuid).

Varias tablas las creo la generacion `/saas` y por eso su columna de inquilino es
`tenant_id uuid` con clave foranea a `saas_tenants` — `audit_logs` y
`calendar_events`, entre otras. Para escribir en ellas desde el backend hace
falta traducir, y la traduccion ya existe en el esquema:
`saas_tenants.workspace_id`. Es la misma que usa `saas_billing_sync`.

CUIDADO: NO TODAS LAS `tenant_id` SON UUID
------------------------------------------
`social_posts.tenant_id` es INTEGER y contiene directamente el workspace — asi
lo usa `finetuning_service`, que ata `:ws` a `sp.tenant_id`. Ahi no hay que
traducir nada. Este modulo es solo para las columnas uuid; usarlo donde la
columna es entera meteria un uuid en un entero.

POR QUE DEVUELVE None EN VEZ DE INVENTAR
----------------------------------------
Si el workspace no tiene inquilino, no hay bajo quien escribir. La clave foranea
lo rechazaria igualmente, y escribir bajo un inquilino ajeno seria peor que no
escribir: mezclaria datos de dos clientes.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_SQL = "SELECT id FROM saas_tenants WHERE workspace_id = :ws LIMIT 1"


async def resolve_tenant_uuid(session: AsyncSession, workspace_id: int) -> str | None:
    """`workspace_id` (entero) -> `saas_tenants.id` (uuid), o None si no existe."""
    if workspace_id is None:
        return None
    r = await session.execute(_SQL_texto(), {"ws": int(workspace_id)})
    fila = r.fetchone()
    return str(fila[0]) if fila else None


def _SQL_texto():
    # `text()` se construye en cada llamada a proposito: compartir el objeto
    # entre sesiones asincronas distintas no aporta nada y complica el trazado.
    return text(_SQL)


class TenantNoEncontrado(RuntimeError):
    """El workspace no tiene fila en `saas_tenants`.

    Se distingue de un fallo de base para que monitorizacion pueda separar «este
    cliente no esta dado de alta en /saas» de «la base no responde».
    """


async def require_tenant_uuid(session: AsyncSession, workspace_id: int) -> str:
    """Como `resolve_tenant_uuid`, pero lanza en vez de devolver None.

    Para escrituras, donde continuar sin inquilino no es una opcion.
    """
    uuid_inquilino = await resolve_tenant_uuid(session, workspace_id)
    if uuid_inquilino is None:
        raise TenantNoEncontrado(
            f"el workspace {workspace_id} no tiene fila en saas_tenants; "
            "no se puede escribir bajo un inquilino inexistente"
        )
    return uuid_inquilino
