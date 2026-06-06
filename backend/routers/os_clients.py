"""OS-1-03 — REST API for canonical NELVYON OS clients (os_clients)."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import (
    WorkspaceContext,
    require_workspace,
    require_workspace_operator,
)
from models.os_clients import Os_clients
from services.os_clients import OsClientsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/os/clients", tags=["os_clients"])


class OsClientCreateBody(BaseModel):
    business_name: str = Field(..., min_length=1)
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = "active"
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    website_url: Optional[str] = None
    ideal_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    differentiator: Optional[str] = None
    services: Optional[str] = None
    objectives: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    brand_colors: Optional[str] = None
    logo_url: Optional[str] = None
    competition: Optional[str] = None
    testimonials: Optional[str] = None
    case_studies: Optional[str] = None
    budget: Optional[str] = None
    language: Optional[str] = None
    market: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class OsClientUpdateBody(BaseModel):
    business_name: Optional[str] = None
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    website_url: Optional[str] = None
    ideal_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    differentiator: Optional[str] = None
    services: Optional[str] = None
    objectives: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    brand_colors: Optional[str] = None
    logo_url: Optional[str] = None
    competition: Optional[str] = None
    testimonials: Optional[str] = None
    case_studies: Optional[str] = None
    budget: Optional[str] = None
    language: Optional[str] = None
    market: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class OsClientResponse(BaseModel):
    id: str
    workspace_id: int
    created_by_user_id: str
    business_name: str
    sector: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: str
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    website_url: Optional[str] = None
    ideal_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    differentiator: Optional[str] = None
    services: Optional[str] = None
    objectives: Optional[str] = None
    brand_tone: Optional[str] = None
    visual_style: Optional[str] = None
    brand_colors: Optional[str] = None
    logo_url: Optional[str] = None
    competition: Optional[str] = None
    testimonials: Optional[str] = None
    case_studies: Optional[str] = None
    budget: Optional[str] = None
    language: Optional[str] = None
    market: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    legacy_nelvyon_client_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OsClientListResponse(BaseModel):
    items: List[OsClientResponse]
    total: int
    skip: int
    limit: int


def _to_response(row: Os_clients) -> OsClientResponse:
    return OsClientResponse(
        id=row.id,
        workspace_id=row.workspace_id,
        created_by_user_id=row.created_by_user_id,
        business_name=row.business_name,
        sector=row.sector,
        country=row.country,
        city=row.city,
        status=row.status,
        contact_email=row.contact_email,
        contact_name=row.contact_name,
        website_url=row.website_url,
        ideal_customer=row.ideal_customer,
        value_proposition=row.value_proposition,
        differentiator=row.differentiator,
        services=row.services,
        objectives=row.objectives,
        brand_tone=row.brand_tone,
        visual_style=row.visual_style,
        brand_colors=row.brand_colors,
        logo_url=row.logo_url,
        competition=row.competition,
        testimonials=row.testimonials,
        case_studies=row.case_studies,
        budget=row.budget,
        language=row.language,
        market=row.market,
        metadata=row.client_metadata if isinstance(row.client_metadata, dict) else {},
        legacy_nelvyon_client_id=row.legacy_nelvyon_client_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=OsClientListResponse)
async def list_os_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search business_name, contact_email, contact_name"),
    status: Optional[str] = Query(None, description="Filter: active | archived"),
    sector: Optional[str] = Query(None, description="Exact sector match"),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsClientsService(db)
    try:
        result = await service.list_clients(
            workspace_id=ws_ctx.workspace_id,
            skip=skip,
            limit=limit,
            q=q,
            status=status,
            sector=sector,
        )
        return OsClientListResponse(
            items=[_to_response(row) for row in result["items"]],
            total=result["total"],
            skip=result["skip"],
            limit=result["limit"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error listing os_clients: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/{client_id}", response_model=OsClientResponse)
async def get_os_client(
    client_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    service = OsClientsService(db)
    row = await service.get_by_id(client_id, workspace_id=ws_ctx.workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return _to_response(row)


@router.post("", response_model=OsClientResponse, status_code=201)
async def create_os_client(
    body: OsClientCreateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsClientsService(db)
    try:
        row = await service.create(
            body.model_dump(),
            user_id=str(ws_ctx.user_id),
            workspace_id=ws_ctx.workspace_id,
        )
        return _to_response(row)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating os_client: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.patch("/{client_id}", response_model=OsClientResponse)
async def patch_os_client(
    client_id: str,
    body: OsClientUpdateBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsClientsService(db)
    update_dict = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        row = await service.update(client_id, update_dict, workspace_id=ws_ctx.workspace_id)
        if not row:
            raise HTTPException(status_code=404, detail="Client not found")
        return _to_response(row)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error updating os_client %s: %s", client_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/{client_id}")
async def delete_os_client(
    client_id: str,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    service = OsClientsService(db)
    success = await service.delete(client_id, workspace_id=ws_ctx.workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client archived successfully", "id": client_id, "status": "archived"}
