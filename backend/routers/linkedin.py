"""F62 — LinkedIn outreach API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.linkedin_service import LinkedInService, get_linkedin_service

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


class ConnectBody(BaseModel):
    client_id: str = "default"
    prospect_name: str = Field(..., min_length=1)
    company: str = ""
    sector: str = "saas"
    role: str = "Director"
    contact_id: str | None = None
    preview_only: bool = False


class SequenceBody(BaseModel):
    client_id: str = "default"
    contact_id: str | None = None
    prospect_name: str = Field(..., min_length=1)
    company: str = ""
    sector: str = "saas"
    role: str = "Director"


@router.post("/connect")
async def connect(
    body: ConnectBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_linkedin_service(db, ws.workspace_id).send_connect(
            client_id=body.client_id,
            prospect_name=body.prospect_name,
            company=body.company,
            sector=body.sector,
            role=body.role,
            contact_id=body.contact_id,
            preview_only=body.preview_only,
        )
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e)) from e


@router.post("/sequence/{contact_id}")
async def start_sequence(
    contact_id: str,
    body: SequenceBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_linkedin_service(db, ws.workspace_id).start_sequence(
        client_id=body.client_id,
        contact_id=contact_id,
        prospect_name=body.prospect_name,
        company=body.company,
        sector=body.sector,
        role=body.role,
    )


@router.get("/stats/{client_id}")
async def outreach_stats(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_linkedin_service(db, ws.workspace_id).stats(client_id)


@router.get("/inbox/{client_id}")
async def outreach_inbox(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_linkedin_service(db, ws.workspace_id).inbox(client_id)


@router.get("/prospects/{client_id}")
async def list_prospects(
    client_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_linkedin_service(db, ws.workspace_id).list_prospects(client_id)
