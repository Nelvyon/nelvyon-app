"""Tenant audit trail API — immutable action log and CSV export."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.tenant_context import get_tenant_context
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace_admin
from schemas.auth import UserResponse
from services.audit_service import get_audit_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _tenant_id(ws: WorkspaceContext) -> int:
    tid = get_tenant_context()
    if tid is not None:
        return int(tid)
    return int(ws.workspace_id)


@router.get("/trail")
async def get_audit_trail(
    request: Request,
    user_id: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = _tenant_id(ws)
    await TenantService(db).set_tenant_context(tid)
    svc = get_audit_service(db, tid)
    entries = await svc.get_audit_trail(
        tid,
        user_id=user_id,
        resource_type=resource_type,
        action=action,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return {"tenant_id": tid, "entries": entries, "count": len(entries)}


@router.get("/export")
async def export_audit_log(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = _tenant_id(ws)
    svc = get_audit_service(db, tid)
    csv_data = await svc.export_audit_csv(tid, date_from=date_from, date_to=date_to)
    filename = f"audit-log-tenant-{tid}.csv"
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
