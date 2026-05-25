"""F63 — Email warmup API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from services.email_warmup_service import get_email_warmup_service

router = APIRouter(prefix="/api/email-warmup", tags=["email-warmup"])


class StartWarmupBody(BaseModel):
    email: str = Field(..., min_length=5)
    domain: str | None = None


class CheckDeliverabilityBody(BaseModel):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    sender: str = Field(..., min_length=5)
    domain: str | None = None


@router.post("/start")
async def start_warmup(
    body: StartWarmupBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_email_warmup_service(db, ws.workspace_id).start_warmup(
            body.email, domain=body.domain
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/stats")
async def warmup_stats(
    account_id: str | None = None,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_email_warmup_service(db, ws.workspace_id).get_stats(account_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/rotate")
async def rotate_pool(
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_email_warmup_service(db, ws.workspace_id).rotate_pool()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/check-deliverability")
async def check_deliverability(
    body: CheckDeliverabilityBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_email_warmup_service(db, ws.workspace_id).check_deliverability(
        subject=body.subject,
        body=body.body,
        sender=body.sender,
        domain=body.domain,
    )
