"""WhatsApp Business Cloud API — send, templates, media, webhooks."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace
from services.helpdesk_service import default_helpdesk_workspace_id, get_helpdesk_service
from services.whatsapp_service import get_whatsapp_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


class SendMessageRequest(BaseModel):
    to_phone: str = Field(..., min_length=8, max_length=20)
    message_text: str = Field(..., min_length=1, max_length=4096)


class SendTemplateRequest(BaseModel):
    to_phone: str = Field(..., min_length=8, max_length=20)
    template_name: str = Field(..., min_length=1, max_length=512)
    language_code: str = Field(..., min_length=2, max_length=10)
    components: List[Dict[str, Any]] = Field(default_factory=list)


class SendMediaRequest(BaseModel):
    to_phone: str = Field(..., min_length=8, max_length=20)
    media_url: str = Field(..., min_length=8, max_length=2048)
    media_type: str = Field(..., description="image | video | document")
    caption: Optional[str] = Field(None, max_length=1024)


@router.post("/send")
async def send_message(
    body: SendMessageRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Send a WhatsApp text message."""
    service = get_whatsapp_service()
    try:
        return await service.send_message(body.to_phone, body.message_text)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"WhatsApp send failed: {e}",
        ) from e


@router.post("/template")
async def send_template(
    body: SendTemplateRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Send an approved WhatsApp message template."""
    service = get_whatsapp_service()
    try:
        return await service.send_template(
            body.to_phone,
            body.template_name,
            body.language_code,
            components=body.components or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"WhatsApp template send failed: {e}",
        ) from e


@router.post("/media")
async def send_media(
    body: SendMediaRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Send image, video, or document via public URL."""
    service = get_whatsapp_service()
    try:
        return await service.send_media(
            body.to_phone,
            body.media_url,
            body.media_type,
            caption=body.caption,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"WhatsApp media send failed: {e}",
        ) from e


@router.get("/status/{message_id}")
async def get_message_status(
    message_id: str,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Query message status (delivery updates also arrive via webhook)."""
    service = get_whatsapp_service()
    try:
        return await service.get_message_status(message_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"WhatsApp status lookup failed: {e}",
        ) from e


@router.get("/webhook")
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """Meta webhook verification (subscribe challenge)."""
    service = get_whatsapp_service()
    challenge = await service.verify_webhook_subscription(
        hub_mode, hub_verify_token, hub_challenge
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")
    return PlainTextResponse(content=challenge)


@router.post("/webhook")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Receive inbound messages and delivery status updates from Meta."""
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from e

    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expected JSON object")

    service = get_whatsapp_service()
    result = await service.process_incoming_webhook(payload)

    ws_id = default_helpdesk_workspace_id()
    if ws_id is not None:
        try:
            hd = get_helpdesk_service(db, ws_id)
            helpdesk_out = await hd.process_whatsapp_webhook_payload(payload)
            result["helpdesk"] = helpdesk_out
        except Exception as exc:
            result["helpdesk_error"] = str(exc)

    return result
