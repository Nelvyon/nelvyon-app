"""F64 — CPQ quotes API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.cpq_service import PIXEL_GIF, get_cpq_service

router = APIRouter(prefix="/api/cpq", tags=["cpq"])


class GenerateQuoteBody(BaseModel):
    client_id: str = "default"
    lead_email: str = Field(..., min_length=5)
    lead_name: str | None = None
    sector: str = Field(..., min_length=2)
    services: list[str] = Field(default_factory=list)
    budget_hint: str | None = None
    company_size: str | None = None
    send_email: bool = True


class StatusBody(BaseModel):
    status: str = Field(..., min_length=3)


@router.post("/generate")
async def generate_quote(
    body: GenerateQuoteBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_cpq_service(db, ws.workspace_id).generate_quote(
            client_id=body.client_id,
            lead_email=body.lead_email,
            lead_name=body.lead_name,
            sector=body.sector,
            services=body.services,
            budget_hint=body.budget_hint,
            company_size=body.company_size,
            send_email=body.send_email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/quotes")
async def list_quotes(
    client_id: str | None = None,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_cpq_service(db, ws.workspace_id).list_quotes(client_id)


@router.get("/quotes/{quote_id}")
async def get_quote(
    quote_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_cpq_service(db, ws.workspace_id).get_quote(quote_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/quotes/{quote_id}/status")
@router.patch("/quotes/{quote_id}/status")
async def update_status(
    quote_id: str,
    body: StatusBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_cpq_service(db, ws.workspace_id).update_status(quote_id, body.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/quotes/{quote_id}/send")
async def resend_quote(
    quote_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_cpq_service(db, ws.workspace_id).send_quote(quote_id)
    except ValueError as e:
        msg = str(e)
        code = 404 if msg == "Quote not found" else 400
        raise HTTPException(status_code=code, detail=msg) from e


@router.get("/quotes/{quote_id}/viewed")
async def quote_viewed_pixel(quote_id: str, db: AsyncSession = Depends(get_db)):
    """Tracking pixel — public, no auth."""
    await get_cpq_service(db, 1).mark_viewed(quote_id)
    return Response(content=PIXEL_GIF, media_type="image/gif")
