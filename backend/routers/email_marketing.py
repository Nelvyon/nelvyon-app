"""Email marketing API — Klaviyo lists, profiles, campaigns, metrics, events."""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.klaviyo_service import KlaviyoService

router = APIRouter(prefix="/api/email", tags=["email-marketing"])


class CreateListRequest(BaseModel):
    name: str = Field(..., min_length=1)


class AddProfileRequest(BaseModel):
    email: EmailStr
    properties: Dict[str, Any] = Field(default_factory=dict)


class CreateCampaignRequest(BaseModel):
    name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    from_email: EmailStr
    from_name: str = Field(..., min_length=1)
    list_id: str = Field(..., min_length=1)


class SendEventRequest(BaseModel):
    event_name: str = Field(..., min_length=1)
    email: EmailStr
    properties: Dict[str, Any] = Field(default_factory=dict)


@router.get("/lists")
async def get_lists(
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Obtener listas Klaviyo."""
    service = KlaviyoService()
    return await service.get_lists()


@router.post("/lists")
async def create_list(
    body: CreateListRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Crear lista en Klaviyo."""
    service = KlaviyoService()
    return await service.create_list(body.name.strip())


@router.post("/profiles")
async def add_profile(
    body: AddProfileRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Añadir contacto (perfil) a Klaviyo."""
    service = KlaviyoService()
    return await service.add_profile(str(body.email), properties=body.properties)


@router.post("/campaigns")
async def create_campaign(
    body: CreateCampaignRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Crear campaña de email en Klaviyo."""
    service = KlaviyoService()
    return await service.create_campaign(
        name=body.name.strip(),
        subject=body.subject.strip(),
        from_email=str(body.from_email),
        from_name=body.from_name.strip(),
        list_id=body.list_id.strip(),
    )


@router.get("/metrics")
async def get_metrics(
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Métricas de email en Klaviyo."""
    service = KlaviyoService()
    return await service.get_metrics()


@router.post("/events")
async def track_event(
    body: SendEventRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Trackear evento en Klaviyo."""
    service = KlaviyoService()
    return await service.send_event(
        body.event_name.strip(),
        str(body.email),
        properties=body.properties,
    )
