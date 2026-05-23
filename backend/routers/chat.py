"""NELVYON live chat API — widget, conversations, WebSocket real-time."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager, get_db
from core.tenant_context import get_tenant_context
from dependencies.auth import bearer_scheme, get_access_token, get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_admin
from schemas.auth import UserResponse
from services.livechat_pubsub import publish_event, set_agent_presence, subscribe_events
from services.livechat_service import get_livechat_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

livechat_router = APIRouter(prefix="/api/chat", tags=["livechat"])


class CreateConversationBody(BaseModel):
    tenant_id: int
    visitor_id: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_email: Optional[str] = None
    page_url: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SendMessageBody(BaseModel):
    sender_type: str = Field(..., pattern="^(visitor|agent|bot)$")
    content: str = Field(..., min_length=1, max_length=8000)
    sender_id: Optional[str] = None


class AssignAgentBody(BaseModel):
    agent_id: str


class CloseConversationBody(BaseModel):
    resolution_note: Optional[str] = None
    csat_score: Optional[int] = Field(None, ge=1, le=5)


class WidgetConfigBody(BaseModel):
    color: Optional[str] = None
    welcome_message: Optional[str] = None
    agent_name: Optional[str] = None
    avatar_url: Optional[str] = None
    position: Optional[str] = None
    active: Optional[bool] = None


class PresenceBody(BaseModel):
    status: str = Field(..., pattern="^(online|offline|away)$")


def _tid(ws: WorkspaceContext | None = None, fallback: int | None = None) -> int:
    ctx = get_tenant_context()
    if ctx is not None:
        return int(ctx)
    if ws and ws.workspace_id:
        return int(ws.workspace_id)
    if fallback is not None:
        return int(fallback)
    raise HTTPException(status_code=400, detail="tenant_id required")


def _visitor_cookie_name(tenant_id: int) -> str:
    return f"nelvyon_chat_vid_{tenant_id}"


def _resolve_visitor_id(request: Request, tenant_id: int, body_visitor: str | None) -> str:
    if body_visitor:
        return body_visitor.strip()
    cookie = request.cookies.get(_visitor_cookie_name(tenant_id))
    if cookie:
        return cookie
    return f"vis_{uuid.uuid4().hex[:16]}"


@livechat_router.post("/conversations", status_code=201)
async def create_conversation(
    body: CreateConversationBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public — start chat from embedded widget."""
    visitor_id = _resolve_visitor_id(request, body.tenant_id, body.visitor_id)
    svc = get_livechat_service(db, body.tenant_id)
    try:
        conv = await svc.create_conversation(
            body.tenant_id,
            visitor_id,
            page_url=body.page_url,
            metadata=body.metadata,
            visitor_name=body.visitor_name,
            visitor_email=body.visitor_email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    resp = JSONResponse(content=conv, status_code=201)
    resp.set_cookie(
        key=_visitor_cookie_name(body.tenant_id),
        value=visitor_id,
        max_age=60 * 60 * 24 * 365,
        httponly=True,
        samesite="lax",
    )
    return resp


@livechat_router.get("/conversations")
async def list_conversations(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    await TenantService(db).set_tenant_context(tid)
    return await get_livechat_service(db, tid).get_conversations(
        tid, status=status, page=page, page_size=page_size
    )


@livechat_router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    svc = get_livechat_service(db, tid)
    conv = await svc.get_conversation(conversation_id, tenant_id=tid)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@livechat_router.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_chat_message(
    conversation_id: str,
    body: SendMessageBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public for visitors; agents require Bearer/cookie + X-Workspace-Id."""
    svc = get_livechat_service(db)
    conv = await svc.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    tid = int(conv["tenant_id"])
    sender_type = body.sender_type
    sender_id = body.sender_id

    if sender_type == "visitor":
        vid = _resolve_visitor_id(request, tid, None)
        if vid != conv.get("visitor_id"):
            raise HTTPException(status_code=403, detail="Visitor mismatch")
        sender_id = vid
    else:
        try:
            credentials = await bearer_scheme(request)
            session_cookie = request.cookies.get("nelvyon_session")
            token = await get_access_token(
                request,
                credentials=credentials,
                nelvyon_session=session_cookie,
            )
            user = await get_current_user(request, token=token, db=db)
        except HTTPException as exc:
            raise HTTPException(status_code=401, detail="Agent authentication required") from exc
        ws_header = request.headers.get("x-workspace-id") or request.headers.get("x-tenant-id")
        if ws_header and int(ws_header) != tid:
            raise HTTPException(status_code=403, detail="Workspace mismatch")
        sender_id = sender_id or str(user.id)

    try:
        return await svc.send_message(
            conversation_id,
            sender_type,
            body.content,
            sender_id=sender_id,
            tenant_id=tid,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@livechat_router.get("/conversations/{conversation_id}/messages")
async def get_chat_messages(
    conversation_id: str,
    request: Request,
    tenant_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Public for widget visitor (cookie) or admin."""
    svc = get_livechat_service(db)
    conv = await svc.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    tid = int(conv["tenant_id"])
    if tenant_id is not None and int(tenant_id) != tid:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    vid = request.cookies.get(_visitor_cookie_name(tid))
    if vid and vid != conv.get("visitor_id"):
        auth = request.headers.get("authorization")
        if not auth:
            raise HTTPException(status_code=403, detail="Forbidden")
    return {"messages": await svc.get_messages(conversation_id)}


@livechat_router.post("/conversations/{conversation_id}/assign")
async def assign_conversation_agent(
    conversation_id: str,
    body: AssignAgentBody,
    ws: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    try:
        return await get_livechat_service(db, tid).assign_agent(
            conversation_id, body.agent_id or str(current_user.id), tenant_id=tid
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@livechat_router.post("/conversations/{conversation_id}/close")
async def close_conversation(
    conversation_id: str,
    body: CloseConversationBody,
    ws: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    try:
        return await get_livechat_service(db, tid).close_conversation(
            conversation_id,
            body.resolution_note,
            tenant_id=tid,
            csat_score=body.csat_score,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@livechat_router.get("/widget-config")
async def get_widget_config_public(
    tenant: int = Query(..., alias="tenant"),
    db: AsyncSession = Depends(get_db),
):
    """Public widget configuration."""
    return await get_livechat_service(db, tenant).get_widget_config(tenant)


@livechat_router.put("/widget-config")
async def update_widget_config(
    body: WidgetConfigBody,
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    payload = body.model_dump(exclude_none=True)
    return await get_livechat_service(db, tid).update_widget_config(tid, payload)


@livechat_router.get("/stats")
async def get_chat_stats(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    ws: WorkspaceContext = Depends(require_workspace_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = _tid(ws)
    return await get_livechat_service(db, tid).get_stats(
        tid, date_from=date_from, date_to=date_to
    )


@livechat_router.post("/presence")
async def update_agent_presence(
    body: PresenceBody,
    ws: WorkspaceContext = Depends(require_workspace),
    current_user: UserResponse = Depends(get_current_user),
):
    tid = _tid(ws)
    await set_agent_presence(tid, str(current_user.id), body.status)
    await publish_event(
        f"tenant:{tid}",
        {
            "type": "presence",
            "agent_id": str(current_user.id),
            "status": body.status,
        },
    )
    return {"agent_id": str(current_user.id), "status": body.status}


@livechat_router.get("/widget.js")
async def embed_widget_script(request: Request):
    """Public vanilla JS embed for any website."""
    base = str(request.base_url).rstrip("/")
    script = f"""(function() {{
  var NELVYON_CHAT_BASE = "{base}";
  var scriptEl = document.currentScript;
  var tenantId = (scriptEl && scriptEl.getAttribute("data-tenant")) ||
    (new URL(scriptEl.src)).searchParams.get("tenant");
  if (!tenantId) {{ console.error("[NelvyonChat] data-tenant required"); return; }}

  var visitorId = localStorage.getItem("nelvyon_vid_" + tenantId);
  if (!visitorId) {{
    visitorId = "vis_" + Math.random().toString(36).slice(2, 14);
    localStorage.setItem("nelvyon_vid_" + tenantId, visitorId);
  }}

  var state = {{ open: false, conversationId: null, config: {{}} }};
  var ws = null;
  var reconnectDelay = 1000;
  var typingTimer = null;

  function api(path, opts) {{
    opts = opts || {{}};
    opts.credentials = "include";
    opts.headers = opts.headers || {{}};
    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {{
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }}
    return fetch(NELVYON_CHAT_BASE + path, opts).then(function(r) {{
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }});
  }}

  function loadConfig() {{
    return api("/api/chat/widget-config?tenant=" + tenantId).then(function(c) {{
      state.config = c;
    }});
  }}

  function connectWs() {{
    if (!state.conversationId || ws) return;
    var proto = location.protocol === "https:" ? "wss:" : "ws:";
    var url = proto + "//" + location.host + "/api/chat/ws/" + state.conversationId;
    if (NELVYON_CHAT_BASE.indexOf("http") === 0) {{
      url = NELVYON_CHAT_BASE.replace(/^http/, "ws") + "/api/chat/ws/" + state.conversationId;
    }}
    ws = new WebSocket(url);
    ws.onmessage = function(ev) {{
      try {{
        var data = JSON.parse(ev.data);
        if (data.type === "message") appendMessage(data.message);
        if (data.type === "typing") showTyping(data.sender_type);
        if (data.type === "stop_typing") hideTyping();
      }} catch (e) {{}}
    }};
    ws.onclose = function() {{
      ws = null;
      setTimeout(connectWs, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    }};
    ws.onopen = function() {{ reconnectDelay = 1000; }};
  }}

  function appendMessage(msg) {{
    var el = document.getElementById("nelvyon-chat-messages");
    if (!el) return;
    var div = document.createElement("div");
    div.className = "nelvyon-msg nelvyon-" + msg.sender_type;
    div.textContent = msg.content;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }}

  function showTyping(who) {{
    var el = document.getElementById("nelvyon-typing");
    if (el) el.textContent = who === "agent" ? "Agente escribiendo…" : "…";
  }}
  function hideTyping() {{
    var el = document.getElementById("nelvyon-typing");
    if (el) el.textContent = "";
  }}

  function sendTyping() {{
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({{ type: "typing", sender_type: "visitor" }}));
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function() {{
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({{ type: "stop_typing", sender_type: "visitor" }}));
    }}, 1500);
  }}

  function ensureConversation() {{
    if (state.conversationId) return Promise.resolve(state.conversationId);
    return api("/api/chat/conversations", {{
      method: "POST",
      body: {{
        tenant_id: parseInt(tenantId, 10),
        visitor_id: visitorId,
        page_url: location.href,
        metadata: {{ referrer: document.referrer }}
      }}
    }}).then(function(c) {{
      state.conversationId = c.id;
      connectWs();
      return c.id;
    }});
  }}

  function sendMessage(text) {{
    return ensureConversation().then(function(cid) {{
      return api("/api/chat/conversations/" + cid + "/messages", {{
        method: "POST",
        body: {{ sender_type: "visitor", content: text, sender_id: visitorId }}
      }}).then(function(msg) {{
        appendMessage(msg);
      }});
    }});
  }}

  function buildUI() {{
    var color = (state.config && state.config.color) || "#6366f1";
    var pos = (state.config && state.config.position) || "bottom-right";
    var root = document.createElement("div");
    root.id = "nelvyon-chat-root";
    root.innerHTML = '<button id="nelvyon-chat-btn" style="position:fixed;' +
      (pos.indexOf("left") >= 0 ? "left:20px;" : "right:20px;") +
      'bottom:20px;width:56px;height:56px;border-radius:50%;border:none;background:' + color +
      ';color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);z-index:99999;">💬</button>' +
      '<div id="nelvyon-chat-panel" style="display:none;position:fixed;' +
      (pos.indexOf("left") >= 0 ? "left:20px;" : "right:20px;") +
      'bottom:90px;width:340px;max-width:calc(100vw - 40px);height:420px;background:#fff;border-radius:12px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.15);z-index:99999;flex-direction:column;font-family:system-ui,sans-serif;">' +
      '<div style="padding:12px 16px;background:' + color + ';color:#fff;border-radius:12px 12px 0 0;font-weight:600;">' +
      ((state.config && state.config.agent_name) || "Chat") + '</div>' +
      '<div id="nelvyon-chat-messages" style="flex:1;overflow-y:auto;padding:12px;font-size:14px;"></div>' +
      '<div id="nelvyon-typing" style="padding:0 12px;font-size:12px;color:#64748b;min-height:18px;"></div>' +
      '<div style="padding:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;">' +
      '<input id="nelvyon-chat-input" type="text" placeholder="Escribe un mensaje…" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;" />' +
      '<button id="nelvyon-chat-send" style="padding:8px 16px;background:' + color + ';color:#fff;border:none;border-radius:8px;cursor:pointer;">Enviar</button>' +
      '</div></div>';
    document.body.appendChild(root);
    document.getElementById("nelvyon-chat-btn").onclick = function() {{
      state.open = !state.open;
      var panel = document.getElementById("nelvyon-chat-panel");
      panel.style.display = state.open ? "flex" : "none";
      if (state.open) ensureConversation();
    }};
    var input = document.getElementById("nelvyon-chat-input");
    input.addEventListener("input", sendTyping);
    document.getElementById("nelvyon-chat-send").onclick = function() {{
      var v = input.value.trim();
      if (!v) return;
      input.value = "";
      sendMessage(v);
    }};
    input.addEventListener("keydown", function(e) {{
      if (e.key === "Enter") document.getElementById("nelvyon-chat-send").click();
    }});
  }}

  loadConfig().then(buildUI);
}})();
"""
    return Response(content=script, media_type="application/javascript")


@livechat_router.websocket("/ws/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str):
    """Real-time chat via Redis Pub/Sub."""
    await websocket.accept()
    if not db_manager.async_session_maker:
        await db_manager.ensure_initialized()

    async with db_manager.async_session_maker() as session:
        svc = get_livechat_service(session)
        conv = await svc.get_conversation(conversation_id)
        if not conv:
            await websocket.close(code=4004)
            return

    async def _forward_pubsub():
        try:
            async for event in subscribe_events(conversation_id):
                await websocket.send_json(event)
        except Exception:
            pass

    forward_task = None
    try:
        import asyncio

        forward_task = asyncio.create_task(_forward_pubsub())
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            etype = data.get("type")
            if etype in ("typing", "stop_typing"):
                await publish_event(
                    conversation_id,
                    {
                        "type": etype,
                        "sender_type": data.get("sender_type", "visitor"),
                    },
                )
            elif etype == "message" and data.get("content"):
                async with db_manager.async_session_maker() as session:
                    svc = get_livechat_service(session)
                    await svc.send_message(
                        conversation_id,
                        data.get("sender_type", "visitor"),
                        data["content"],
                        sender_id=data.get("sender_id"),
                    )
    except WebSocketDisconnect:
        pass
    finally:
        if forward_task:
            forward_task.cancel()
