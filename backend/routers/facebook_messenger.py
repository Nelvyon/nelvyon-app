"""F63 — Facebook Messenger API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

import json

from core.database import get_db
from core.meta_webhook_signature import verificar_firma_meta
from core.inquilino_de_webhook import (
    InquilinoNoAtribuible,
    cuenta_de_cuerpo,
    respuesta_no_atribuible,
    sesion_de_webhook,
    workspace_de_cuenta,
)
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.facebook_messenger_service import get_facebook_messenger_service

router = APIRouter(prefix="/api/fb-messenger", tags=["fb-messenger"])


class SendMessengerBody(BaseModel):
    psid: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = None


class BotToggleBody(BaseModel):
    enabled: bool


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db),
):
    svc = get_facebook_messenger_service(db, 1)
    challenge = svc.verify_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge is None:
        raise HTTPException(status_code=403, detail="Verification failed")
    return PlainTextResponse(challenge)


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    # Se lee el cuerpo CRUDO: reserializar el JSON cambia los bytes y la
    # firma dejaria de casar.
    cuerpo = await request.body()
    verificar_firma_meta("facebook", cuerpo, request.headers.get("x-hub-signature-256"))
    payload = json.loads(cuerpo)

    # `entry[].id` es la pagina de Facebook. Quien la conecto desde dentro del
    # producto decide de quien es este mensaje; antes lo decidia un `1` fijo.
    # Resolver y escribir en la misma sesion de trabajos: `oauth_tokens` tiene
    # RLS y aqui no hay usuario que satisfaga ninguna politica.
    async with await sesion_de_webhook() as sesion:
        try:
            ws = await workspace_de_cuenta(
                sesion, "facebook", cuenta_de_cuerpo("facebook", payload))
        except InquilinoNoAtribuible as exc:
            return respuesta_no_atribuible(exc)
        return await get_facebook_messenger_service(sesion, ws).handle_webhook(payload)


@router.get("/conversations")
async def list_conversations(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_facebook_messenger_service(db, ws.workspace_id).list_conversations()


@router.post("/send")
async def send_message(
    body: SendMessengerBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_facebook_messenger_service(db, ws.workspace_id).send_message(
            body.psid, body.text, conversation_id=body.conversation_id
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
    return await get_facebook_messenger_service(db, ws.workspace_id).set_bot_enabled(
        conversation_id, body.enabled
    )
