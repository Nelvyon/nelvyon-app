"""F62 — Apollo leads API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.apollo_service import ApolloService, get_apollo_service

router = APIRouter(prefix="/api/apollo", tags=["apollo"])


class SearchBody(BaseModel):
    sector: str = "saas"
    title: str | None = None
    city: str | None = None
    company_size: str | None = None
    limit: int = Field(25, ge=1, le=100)


class SyncCrmBody(BaseModel):
    leads: list[dict] = Field(..., min_length=1)


@router.post("/search")
async def search_leads(
    body: SearchBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = get_apollo_service(db, ws.workspace_id)
    return await svc.search(
        sector=body.sector,
        title=body.title,
        city=body.city,
        company_size=body.company_size,
        limit=body.limit,
    )


@router.post("/enrich/{contact_id}")
async def enrich_contact(
    contact_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_apollo_service(db, ws.workspace_id).enrich_contact(contact_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/sync-crm")
async def sync_crm(
    body: SyncCrmBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_apollo_service(db, ws.workspace_id).sync_to_crm(body.leads)


@router.get("/suggestions/{client_id}")
async def suggestions(
    client_id: str,
    sector: str = "saas",
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_apollo_service(db, ws.workspace_id).suggestions(client_id, sector=sector)
