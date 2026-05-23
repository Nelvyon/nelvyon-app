"""Embeddable chatbot API — builder (auth) + public widget chat."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from services.chatbot_service import ChatbotService, get_chatbot_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

chatbot_router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])
router = chatbot_router


class ChatbotConfigBody(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    avatar_url: Optional[str] = None
    color_primario: str = Field(default="#6366f1", max_length=32)
    mensaje_bienvenida: str = Field(default="¡Hola! ¿En qué puedo ayudarte?", max_length=2000)
    idioma: str = Field(default="es", max_length=16)
    comportamiento: str = Field(default="soporte", pattern="^(soporte|ventas|leads|faq)$")
    base_conocimiento: str = Field(default="", max_length=50000)
    escalada_a_humano: bool = True
    is_active: Optional[bool] = None


class PublicChatBody(BaseModel):
    embed_token: Optional[str] = None
    chatbot_id: Optional[str] = None
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4000)
    visitor_info: dict[str, Any] = Field(default_factory=dict)


def _svc(db: AsyncSession, ws: WorkspaceContext | None = None) -> ChatbotService:
    wid = ws.workspace_id if ws else None
    return get_chatbot_service(db, wid)


@chatbot_router.post("/chat")
async def public_chat(
    body: PublicChatBody,
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    svc = get_chatbot_service(db)
    try:
        if body.embed_token:
            bot = await svc.get_by_embed_token(body.embed_token)
        elif body.chatbot_id:
            bot = await svc.get_chatbot(body.chatbot_id)
        else:
            raise HTTPException(status_code=400, detail="embed_token or chatbot_id required")
        await TenantService(db).set_tenant_context(int(bot["workspace_id"]))
        svc = get_chatbot_service(db, int(bot["workspace_id"]))
        return await svc.chat(
            bot["id"],
            body.session_id or "",
            body.message,
            body.visitor_info,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@chatbot_router.get("/widget/{embed_token}")
async def public_widget_config(
    embed_token: str,
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    svc = get_chatbot_service(db)
    try:
        bot = await svc.get_by_embed_token(embed_token)
        return svc.get_public_widget_config(bot)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@chatbot_router.post("/", status_code=201)
async def create_chatbot(
    body: ChatbotConfigBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    return await _svc(db, ws).create_chatbot(ws.workspace_id, body.model_dump())


@chatbot_router.get("/")
async def list_chatbots(
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    bots = await _svc(db, ws).list_chatbots(ws.workspace_id)
    stats = await _svc(db, ws).get_global_stats(ws.workspace_id)
    return {"items": bots, "global_stats": stats}


@chatbot_router.get("/{chatbot_id}")
async def get_chatbot(
    chatbot_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    try:
        return await _svc(db, ws).get_chatbot(chatbot_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@chatbot_router.put("/{chatbot_id}")
async def update_chatbot(
    chatbot_id: str,
    body: ChatbotConfigBody,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    try:
        return await _svc(db, ws).update_chatbot(chatbot_id, body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@chatbot_router.delete("/{chatbot_id}")
async def delete_chatbot(
    chatbot_id: str,
    ws: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    ok = await _svc(db, ws).delete_chatbot(chatbot_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    return {"ok": True}


@chatbot_router.get("/{chatbot_id}/conversations")
async def list_conversations(
    chatbot_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    items = await _svc(db, ws).get_conversations(chatbot_id)
    return {"items": items}


@chatbot_router.get("/{chatbot_id}/conversations/{session_id}")
async def conversation_detail(
    chatbot_id: str,
    session_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    try:
        return await _svc(db, ws).get_conversation_detail(session_id, chatbot_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@chatbot_router.get("/{chatbot_id}/stats")
async def chatbot_stats(
    chatbot_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    await ChatbotService.ensure_schema()
    return await _svc(db, ws).get_stats(chatbot_id)
