"""F63 — TikTok DM API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.inquilino_de_webhook import (
    InquilinoNoAtribuible,
    cuenta_de_cuerpo,
    respuesta_no_atribuible,
    sesion_de_webhook,
    workspace_de_cuenta,
)
from core.webhook_shared_secret import verificar_secreto_compartido
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.tiktok_dm_service import get_tiktok_dm_service

router = APIRouter(prefix="/api/tiktok-dm", tags=["tiktok-dm"])


class SendTikTokDMBody(BaseModel):
    open_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = None


class BotToggleBody(BaseModel):
    enabled: bool


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """DM entrante de TikTok.

    TikTok no publica esquema de firma para este webhook, asi que se exige el
    secreto compartido configurado al dar de alta la URL en su panel — el mismo
    patron que el repositorio ya usa en `/webhook/trigger/{webhook_key}`.
    Inventarse una firma que el proveedor no enviaria seria peor que inutil.

    Sin esto, cualquiera podia inyectar DMs en la bandeja con el remitente que
    quisiera.
    """
    verificar_secreto_compartido("tiktok", request)
    payload = await request.json()

    # Antes: `1` fijo, y todos los DM de todos los inquilinos al mismo workspace.
    async with await sesion_de_webhook() as sesion:
        try:
            ws = await workspace_de_cuenta(
                sesion, "tiktok", cuenta_de_cuerpo("tiktok", payload))
        except InquilinoNoAtribuible as exc:
            return respuesta_no_atribuible(exc)
        return await get_tiktok_dm_service(sesion, ws).handle_webhook(payload)


@router.get("/conversations")
async def list_conversations(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_dm_service(db, ws.workspace_id).list_conversations()


@router.post("/send")
async def send_dm(
    body: SendTikTokDMBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_tiktok_dm_service(db, ws.workspace_id).send_message(
            body.open_id, body.text, conversation_id=body.conversation_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/conversations/{conversation_id}/bot")
async def toggle_bot(
    conversation_id: str,
    body: BotToggleBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    return await get_tiktok_dm_service(db, ws.workspace_id).set_bot_enabled(
        conversation_id, body.enabled
    )
