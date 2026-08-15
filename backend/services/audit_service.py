"""Immutable tenant audit log — compliance trail and CSV export."""

from __future__ import annotations

import csv

from core.csv_safety import fila_segura
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False


def _json_dumps(obj: Any) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


def _expandir_detalles(fila: dict[str, Any]) -> dict[str, Any]:
    """Devuelve `old_value` y `new_value` sacados de `details`.

    La tabla real guarda ambos dentro de un unico `details jsonb`. Quien lea la
    traza espera las dos claves sueltas, asi que se exponen tambien planas: el
    cambio de esquema no tiene por que llegar hasta el consumidor.
    """
    detalles = fila.get("details")
    if isinstance(detalles, str):
        try:
            detalles = json.loads(detalles)
        except (ValueError, TypeError):
            detalles = None
    if isinstance(detalles, dict):
        fila.setdefault("old_value", detalles.get("old_value"))
        fila.setdefault("new_value", detalles.get("new_value"))
    else:
        fila.setdefault("old_value", None)
        fila.setdefault("new_value", None)
    return fila


class AuditTenantNotFound(RuntimeError):
    """El workspace no tiene fila en `saas_tenants`, asi que no hay inquilino
    bajo el que registrar la accion. Se distingue de un fallo de base para que
    monitorizacion pueda separarlos."""


class AuditService:
    """Append-only audit log per tenant."""

    def __init__(self, session: AsyncSession, tenant_id: int):
        self.session = session
        self.tenant_id = int(tenant_id)
    @staticmethod
    async def ensure_schema(*_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return



    async def _prepare_session(self) -> None:
        await self.ensure_schema()
        await TenantService(self.session).set_tenant_context(self.tenant_id)

    async def _tenant_uuid(self) -> str | None:
        """`workspace_id` (entero) -> `saas_tenants.id` (uuid).

        `audit_logs` la declara la migracion 412 con `tenant_id uuid` y clave
        foranea a `saas_tenants`. El backend FastAPI trabaja con workspaces
        enteros, asi que hace falta el puente — que existe:
        `saas_tenants.workspace_id`, el mismo que ya usa `saas_billing_sync`.

        Devuelve None si ese workspace no tiene tenant. No se inventa uno: la
        clave foranea lo rechazaria de todos modos, y escribir auditoria bajo un
        inquilino que no es el suyo seria peor que no escribirla.
        """
        r = await self.session.execute(
            text("SELECT id FROM saas_tenants WHERE workspace_id = :ws LIMIT 1"),
            {"ws": self.tenant_id},
        )
        fila = r.fetchone()
        return str(fila[0]) if fila else None

    async def log_action(
        self,
        tenant_id: int,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Append immutable audit entry (no updates/deletes).

        ESCRIBIA CONTRA UNA TABLA QUE NUNCA EXISTE
        ------------------------------------------
        Este INSERT usaba `old_value`, `new_value` y un `tenant_id` entero, que
        es la definicion de la migracion 507. Esa definicion NO SE APLICA NUNCA:
        `audit_logs` la declara antes la 412, el ejecutor aplica los ficheros por
        nombre y todos usan `IF NOT EXISTS`, asi que la 412 gana siempre. Ademas
        `audit_logs` no tiene modelo ORM, asi que `create_all` tampoco puede
        crearla con otra forma. La conclusion no depende de mirar produccion: en
        cualquier entorno construido desde este repositorio, la tabla es la de la
        412 — y un dump real de julio lo confirma.

        Es decir: el rastro de auditoria de acciones criticas no se ha escrito
        nunca. Fallaba con `column "old_value" does not exist` y el llamante, que
        es «best-effort, never raises», se lo tragaba.

        Los tests no lo veian porque el esquema de SQLite se derivaba de la 507,
        justo la definicion que pierde. Eso ya esta corregido en
        `tests/_schema_bootstrap.py`.

        El antes y el despues no se pierden: van dentro de `details`, que es
        jsonb y existe para eso. `module` sale de `resource_type`, que el
        llamante ya proporciona, en vez de inventarse un valor.
        """
        await self._prepare_session()
        tenant_uuid = await self._tenant_uuid()
        if tenant_uuid is None:
            raise AuditTenantNotFound(
                f"workspace {self.tenant_id} no tiene fila en saas_tenants; "
                "no se puede escribir auditoria bajo un inquilino inexistente"
            )
        entry_id = str(uuid.uuid4())
        detalles: dict[str, Any] = {}
        if old_value is not None:
            detalles["old_value"] = old_value
        if new_value is not None:
            detalles["new_value"] = new_value
        r = await self.session.execute(
            text(
                """
                INSERT INTO audit_logs (
                    id, tenant_id, user_id, action, module, resource_type,
                    resource_id, details, ip_address
                )
                VALUES (
                    :id, :tid, :uid, :action, :module, :rtype,
                    :rid, CAST(:details AS jsonb), :ip
                )
                RETURNING id, tenant_id, user_id, action, resource_type, resource_id, created_at
                """
            ),
            {
                "id": entry_id,
                "tid": tenant_uuid,
                "uid": user_id,
                "action": action,
                "module": resource_type or "unknown",
                "rtype": resource_type,
                "rid": resource_id,
                "details": _json_dumps(detalles),
                "ip": ip_address,
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def get_audit_trail(
        self,
        tenant_id: int,
        *,
        user_id: str | None = None,
        resource_type: str | None = None,
        action: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        await self._prepare_session()
        tenant_uuid = await self._tenant_uuid()
        if tenant_uuid is None:
            # Sin inquilino no hay filas suyas que devolver. Lista vacia, no
            # error: consultar la auditoria de un workspace sin tenant es una
            # pregunta legitima con respuesta vacia.
            return []
        # `details` sustituye a `old_value`/`new_value`, que no existen en la
        # tabla que realmente se crea (migracion 412). Se devuelven ademas
        # descompuestos, para no romper a quien ya leia esas dos claves.
        q = """
            SELECT id, tenant_id, user_id, action, module, resource_type,
                   resource_id, details, ip_address, created_at
            FROM audit_logs
            WHERE tenant_id = :tid
        """
        params: dict[str, Any] = {
            "tid": tenant_uuid,
            "limit": limit,
            "offset": offset,
        }
        if user_id:
            q += " AND user_id = :uid"
            params["uid"] = user_id
        if resource_type:
            q += " AND resource_type = :rtype"
            params["rtype"] = resource_type
        if action:
            q += " AND action = :action"
            params["action"] = action
        if date_from:
            q += " AND created_at >= :dfrom"
            params["dfrom"] = date_from
        if date_to:
            q += " AND created_at <= :dto"
            params["dto"] = date_to
        q += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        r = await self.session.execute(text(q), params)
        return [_expandir_detalles(_row(x)) for x in r.fetchall()]

    async def export_audit_csv(
        self,
        tenant_id: int,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> str:
        rows = await self.get_audit_trail(
            tenant_id,
            date_from=date_from,
            date_to=date_to,
            limit=10000,
        )
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            fila_segura([
                "id",
                "tenant_id",
                "user_id",
                "action",
                "resource_type",
                "resource_id",
                "ip_address",
                "created_at",
            ])
        )
        for row in rows:
            writer.writerow(
                fila_segura([
                    row.get("id"),
                    row.get("tenant_id"),
                    row.get("user_id"),
                    row.get("action"),
                    row.get("resource_type"),
                    row.get("resource_id"),
                    row.get("ip_address"),
                    row.get("created_at"),
                ])
            )
        return buffer.getvalue()


def get_audit_service(session: AsyncSession, tenant_id: int) -> AuditService:
    return AuditService(session, tenant_id)


async def log_critical_audit(
    session: AsyncSession,
    *,
    tenant_id: int | None,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip_address: str | None = None,
    new_value: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit for critical actions (never raises to caller)."""
    if tenant_id is None:
        return
    # tenant_id=0 allowed for platform-level events (e.g. login before workspace scope)
    try:
        svc = AuditService(session, int(tenant_id))
        await svc.log_action(
            int(tenant_id),
            user_id,
            action,
            resource_type,
            resource_id=resource_id,
            new_value=new_value,
            ip_address=ip_address,
        )
    except AuditTenantNotFound as exc:
        # No es un fallo tecnico: ese workspace no tiene inquirlino asociado.
        # Se registra aparte para que no se confunda con una base caida.
        logger.error("audit.tenant_ausente ws=%s: %s", tenant_id, exc)
    except Exception as exc:
        # ERROR, no warning. Esto es la traza de auditoria de una accion
        # critica: perderla en silencio es exactamente lo que la traza existe
        # para impedir.
        logger.error(
            "audit.escritura_fallida ws=%s accion=%s: %s",
            tenant_id, action, exc, exc_info=True,
        )
