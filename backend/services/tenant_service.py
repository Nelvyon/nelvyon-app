"""Multi-tenant isolation — RLS session context and tenant-scoped queries."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from core.tenant_context import get_tenant_context

logger = logging.getLogger(__name__)

_SCHEMA_READY = False


class TenantService:
    """Tenant (workspace) isolation helpers."""

    def __init__(self, session: AsyncSession):
        self.session = session
    @staticmethod
    async def ensure_schema(*_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return



    async def set_tenant_context(self, tenant_id: int, user_id: str | None = None) -> None:
        """Fija el contexto de sesion que evaluan las politicas RLS.

        DOS VARIABLES, NO UNA
        ---------------------
        Las 969 politicas del esquema no miran todas lo mismo:

            606  `nelvyon_jwt_user_id()`  ->  request.jwt.claim.sub
             53  tenant por workspace     ->  app.tenant_id
             11  tenant SaaS              ->  request.jwt.claim.sub (a traves de la anterior)

        Hasta ahora solo se fijaba `app.tenant_id`, asi que las 617 politicas que
        dependen del sujeto del JWT evaluarian NULL. Como la aplicacion se conecta
        con un rol superusuario, ninguna llega a evaluarse y el detalle no se
        notaba; el dia que se le retire ese privilegio —que es lo que hace falta
        para que RLS sea frontera real— esas tablas denegarian TODO en vez de
        aislar, y el sintoma seria una aplicacion que devuelve listas vacias sin
        un solo error.

        Fijar aqui las dos deja el contexto completo y es inocuo mientras el rol
        siga siendo superusuario: `set_config` no altera ninguna respuesta si las
        politicas no se evaluan. Es preparacion verificable, no un cambio de
        conducta.

        Ambas con ambito de TRANSACCION (`is_local = true`), no de conexion: es
        lo que hace seguro reutilizar conexiones de un pool, porque el contexto
        no sobrevive al commit ni se filtra a la siguiente peticion.
        """
        await self.ensure_schema()
        await self.session.execute(
            text("SELECT set_tenant_context(:tid)"),
            {"tid": int(tenant_id)},
        )
        if user_id:
            await self.session.execute(
                text("SELECT set_config('request.jwt.claim.sub', :uid, true)"),
                {"uid": str(user_id)},
            )

    async def apply_request_tenant(self, user_id: str | None = None) -> int | None:
        """Apply tenant from ContextVar to DB session (call at start of tenant-scoped handlers)."""
        tid = get_tenant_context()
        if tid is not None:
            await self.set_tenant_context(tid, user_id)
        return tid

    @staticmethod
    def tenant_filter_clause(column: str = "workspace_id") -> str:
        """SQL fragment ensuring queries are tenant-scoped."""
        return f"{column} = :tenant_id"

    async def verify_tenant_access(self, tenant_id: int, table: str, resource_id: str) -> bool:
        """Verify a resource belongs to the tenant."""
        if table not in {
            "crm_contacts",
            "crm_deals",
            "campaigns",
            "invoices",
            "bookings",
        }:
            return False
        await self.set_tenant_context(tenant_id)
        r = await self.session.execute(
            text(
                f"SELECT 1 FROM {table} WHERE workspace_id = :tid AND id::text = :rid LIMIT 1"
            ),
            {"tid": tenant_id, "rid": resource_id},
        )
        return r.fetchone() is not None


def get_tenant_service(session: AsyncSession) -> TenantService:
    return TenantService(session)
