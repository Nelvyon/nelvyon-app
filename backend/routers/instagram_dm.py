"""F63 — Instagram DM webhook + dashboard API."""

from __future__ import annotations

from typing import Any

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
from services.instagram_dm_service import get_instagram_dm_service

router = APIRouter(prefix="/api/instagram-dm", tags=["instagram-dm"])


class SendDMBody(BaseModel):
    recipient_id: str = Field(..., min_length=1)
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
    svc = get_instagram_dm_service(db, 1)
    challenge = svc.verify_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge is None:
        raise HTTPException(status_code=403, detail="Verification failed")
    return PlainTextResponse(challenge)


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    # Se lee el cuerpo CRUDO: reserializar el JSON cambia los bytes y la
    # firma dejaria de casar.
    cuerpo = await request.body()
    verificar_firma_meta("instagram", cuerpo, request.headers.get("x-hub-signature-256"))
    payload = json.loads(cuerpo)

    # La firma demuestra que el cuerpo viene de Meta. NO dice de quien es: eso
    # sale de la cuenta que Meta nombra dentro del cuerpo firmado, buscada en las
    # integraciones que conecto un usuario autenticado. Antes habia un `1` fijo y
    # los DM de todos los inquilinos caian en el mismo workspace.
    # Resolver Y escribir van en la MISMA sesion de trabajos. `oauth_tokens`
    # tiene RLS y este webhook no tiene usuario: consultarla con el rol de la
    # aplicacion devolveria cero filas —sin error— y todo webhook legitimo
    # quedaria «no atribuible». Un aislamiento que se cae hacia «no se de quien
    # es» tambien deja de funcionar, solo que sin ruido.
    async with await sesion_de_webhook() as sesion:
        try:
            ws = await workspace_de_cuenta(
                sesion, "instagram", cuenta_de_cuerpo("instagram", payload))
        except InquilinoNoAtribuible as exc:
            return respuesta_no_atribuible(exc)
        return await get_instagram_dm_service(sesion, ws).handle_webhook(payload)


@router.get("/conversations")
async def list_conversations(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_instagram_dm_service(db, ws.workspace_id).list_conversations()


@router.post("/send")
async def send_dm(
    body: SendDMBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_instagram_dm_service(db, ws.workspace_id).send_message(
            body.recipient_id, body.text, conversation_id=body.conversation_id
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
    return await get_instagram_dm_service(db, ws.workspace_id).set_bot_enabled(
        conversation_id, body.enabled
    )
