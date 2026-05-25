"""In-memory fakes for HTTP integration tests (Frente 48)."""

from __future__ import annotations

import uuid
from typing import Any


class FakeCRMService:
    """Minimal CRM fake backing /api/crm contact routes in tests."""

    _contacts: dict[int, dict[str, dict[str, Any]]] = {}

    def __init__(self, session: Any = None, workspace_id: int = 1) -> None:
        self.session = session
        self.workspace_id = int(workspace_id)
        self._contacts.setdefault(self.workspace_id, {})

    @property
    def contacts(self) -> dict[str, dict[str, Any]]:
        return self._contacts.setdefault(self.workspace_id, {})

    @classmethod
    def reset(cls) -> None:
        cls._contacts.clear()

    @staticmethod
    async def ensure_db() -> None:
        return None

    async def create_contact(self, **fields: Any) -> dict[str, Any]:
        cid = str(uuid.uuid4())
        row = {
            "id": cid,
            "workspace_id": self.workspace_id,
            "name": fields.get("name"),
            "email": fields.get("email"),
            "phone": fields.get("phone"),
            "company": fields.get("company"),
            "status": fields.get("status", "active"),
            "tags": fields.get("tags") or [],
            "metadata": fields.get("metadata") or {},
            "score": 0,
        }
        self.contacts[cid] = row
        return row

    async def list_contacts(self, *, skip: int = 0, limit: int = 50, status: str | None = None) -> dict[str, Any]:
        items = list(self.contacts.values())
        if status:
            items = [c for c in items if c.get("status") == status]
        total = len(items)
        page = items[skip : skip + limit]
        return {"total": total, "items": page, "skip": skip, "limit": limit}

    async def search_contacts(self, query: str, *, limit: int = 25) -> list[dict[str, Any]]:
        q = query.lower()
        return [c for c in self.contacts.values() if q in (c.get("name") or "").lower()][:limit]

    async def update_contact(self, contact_id: str, **fields: Any) -> dict[str, Any]:
        if contact_id not in self.contacts:
            raise ValueError("Contact not found")
        self.contacts[contact_id].update({k: v for k, v in fields.items() if v is not None})
        return self.contacts[contact_id]

    async def delete_contact(self, contact_id: str) -> bool:
        return self.contacts.pop(contact_id, None) is not None

    async def get_contact_by_id(self, contact_id: str) -> dict[str, Any]:
        if contact_id not in self.contacts:
            raise ValueError("Contact not found")
        return self.contacts[contact_id]

    async def recalculate_contact_score(self, contact_id: str) -> dict[str, Any]:
        return await self.get_contact_by_id(contact_id)


class FakeLandingService:
    def __init__(self, session: Any = None, workspace_id: int | None = 1) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.pages: dict[str, dict[str, Any]] = {}

    async def create_page(
        self,
        workspace_id: int,
        name: str,
        *,
        blocks: list | None = None,
        meta: dict | None = None,
        form_fields: list | None = None,
    ) -> dict[str, Any]:
        pid = str(uuid.uuid4())
        row = {
            "id": pid,
            "workspace_id": workspace_id,
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "status": "draft",
            "blocks": blocks or [{"type": "hero", "props": {"headline": name}}],
            "meta": meta or {"generated_by": "gpt-4o-mock"},
            "form_fields": form_fields or [],
        }
        self.pages[pid] = row
        return row

    async def get_page(self, page_id: str, workspace_id: int) -> dict[str, Any] | None:
        page = self.pages.get(page_id)
        if page and page["workspace_id"] == workspace_id:
            return page
        return None

    async def publish_page(self, page_id: str, workspace_id: int) -> dict[str, Any]:
        page = await self.get_page(page_id, workspace_id)
        if not page:
            raise ValueError("Page not found")
        page["status"] = "published"
        return page

    async def list_pages(self, workspace_id: int, status: str | None = None) -> list[dict[str, Any]]:
        items = [p for p in self.pages.values() if p["workspace_id"] == workspace_id]
        if status:
            items = [p for p in items if p.get("status") == status]
        return items


class FakeChatbotService:
    _store: dict[int, dict[str, Any]] = {}

    def __init__(self, session: Any = None, workspace_id: int | None = 1) -> None:
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None
        if self.workspace_id not in self._store:
            self._store[self.workspace_id] = {"bots": {}, "conversations": {}}

    @classmethod
    async def ensure_schema(cls) -> None:
        return None

    @property
    def _data(self) -> dict[str, Any]:
        return self._store.setdefault(self.workspace_id or 0, {"bots": {}, "conversations": {}})

    async def create_chatbot(self, workspace_id: int, config: dict[str, Any]) -> dict[str, Any]:
        bid = str(uuid.uuid4())
        token = str(uuid.uuid4())
        bot = {
            "id": bid,
            "workspace_id": workspace_id,
            "name": config.get("nombre", "Bot"),
            "config": config,
            "embed_token": token,
            "is_active": True,
        }
        self._data["bots"][bid] = bot
        return bot

    async def get_chatbot(self, chatbot_id: str) -> dict[str, Any]:
        bot = self._data["bots"].get(chatbot_id)
        if not bot:
            raise ValueError("Chatbot not found")
        return bot

    async def get_by_embed_token(self, embed_token: str) -> dict[str, Any]:
        for bot in self._data["bots"].values():
            if bot["embed_token"] == embed_token:
                return bot
        raise ValueError("Chatbot not found")

    async def update_chatbot(self, chatbot_id: str, config: dict[str, Any]) -> dict[str, Any]:
        bot = await self.get_chatbot(chatbot_id)
        bot["config"] = {**bot.get("config", {}), **config}
        if "nombre" in config:
            bot["name"] = config["nombre"]
        return bot

    async def chat(
        self,
        chatbot_id: str,
        session_id: str,
        message: str,
        visitor_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.get_chatbot(chatbot_id)
        sid = session_id or str(uuid.uuid4())
        conv_key = f"{chatbot_id}:{sid}"
        conv = self._data["conversations"].setdefault(
            conv_key,
            {"session_id": sid, "chatbot_id": chatbot_id, "messages": []},
        )
        conv["messages"].append({"role": "user", "content": message})
        reply = "Mocked AI response"
        conv["messages"].append({"role": "assistant", "content": reply})
        return {"session_id": sid, "reply": reply, "messages": conv["messages"]}

    async def get_conversations(self, chatbot_id: str) -> list[dict[str, Any]]:
        return [
            v for k, v in self._data["conversations"].items() if v.get("chatbot_id") == chatbot_id
        ]

    def get_public_widget_config(self, bot: dict[str, Any]) -> dict[str, Any]:
        return {"name": bot["name"], "embed_token": bot["embed_token"]}

    async def list_chatbots(self, workspace_id: int) -> list[dict[str, Any]]:
        return [b for b in self._data["bots"].values() if b["workspace_id"] == workspace_id]

    async def get_global_stats(self, workspace_id: int) -> dict[str, Any]:
        return {"total_conversations": len(self._data["conversations"])}

    async def delete_chatbot(self, chatbot_id: str) -> bool:
        return self._data["bots"].pop(chatbot_id, None) is not None

    async def get_conversation_detail(self, session_id: str, chatbot_id: str) -> dict[str, Any]:
        conv = self._data["conversations"].get(f"{chatbot_id}:{session_id}")
        if not conv:
            raise ValueError("Conversation not found")
        return conv

    async def get_stats(self, chatbot_id: str) -> dict[str, Any]:
        count = sum(1 for v in self._data["conversations"].values() if v.get("chatbot_id") == chatbot_id)
        return {"conversations": count}


class FakeFormsService:
    _store: dict[int, dict[str, Any]] = {}

    def __init__(self, session: Any = None, workspace_id: int | None = 1) -> None:
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        return None

    @property
    def _data(self) -> dict[str, Any]:
        return self._store.setdefault(self.workspace_id or 0, {"forms": {}, "responses": []})

    async def create_form(
        self,
        workspace_id: int,
        title: str,
        description: str = "",
        fields: list | None = None,
        settings: dict | None = None,
        kind: str = "form",
    ) -> dict[str, Any]:
        fid = str(uuid.uuid4())
        form = {
            "id": fid,
            "workspace_id": workspace_id,
            "title": title,
            "description": description,
            "fields": fields or [{"name": "email", "type": "email"}],
            "settings": settings or {},
            "status": "draft",
            "submissions_count": 0,
        }
        self._data["forms"][fid] = form
        return form

    async def get_form(self, form_id: str) -> dict[str, Any]:
        form = self._data["forms"].get(form_id)
        if not form:
            raise ValueError("Form not found")
        return form

    async def submit_form(
        self,
        form_id: str,
        responses: dict[str, Any],
        visitor_info: dict[str, Any] | None = None,
        completion_seconds: int | None = None,
    ) -> dict[str, Any]:
        form = await self.get_form(form_id)
        form["status"] = "published"
        rid = str(uuid.uuid4())
        row = {
            "id": rid,
            "form_id": form_id,
            "responses": responses,
            "visitor_info": visitor_info or {},
        }
        self._data["responses"].append(row)
        form["submissions_count"] = form.get("submissions_count", 0) + 1
        return row

    async def get_responses(self, form_id: str) -> list[dict[str, Any]]:
        await self.get_form(form_id)
        return [r for r in self._data["responses"] if r["form_id"] == form_id]

    async def list_forms(self, workspace_id: int) -> list[dict[str, Any]]:
        return [f for f in self._data["forms"].values() if f["workspace_id"] == workspace_id]

    async def update_form(self, form_id: str, **fields: Any) -> dict[str, Any]:
        form = await self.get_form(form_id)
        form.update({k: v for k, v in fields.items() if v is not None})
        return form

    async def delete_form(self, form_id: str) -> bool:
        return self._data["forms"].pop(form_id, None) is not None

    async def publish_form(self, form_id: str) -> dict[str, Any]:
        form = await self.get_form(form_id)
        form["status"] = "published"
        return form

    async def get_public_form(self, slug: str) -> dict[str, Any]:
        for form in self._data["forms"].values():
            if form.get("slug") == slug or form.get("title", "").lower().replace(" ", "-") == slug:
                return form
        raise ValueError("Form not found")

    async def get_form_stats(self, form_id: str) -> dict[str, Any]:
        form = await self.get_form(form_id)
        return {"submissions_count": form.get("submissions_count", 0)}


class FakeWebinarService:
    _store: dict[int, dict[str, Any]] = {}

    def __init__(self, session: Any = None, workspace_id: int | None = 1) -> None:
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        return None

    @property
    def _data(self) -> dict[str, Any]:
        return self._store.setdefault(self.workspace_id or 0, {"webinars": {}, "registrations": []})

    async def create_webinar(self, workspace_id: int, **fields: Any) -> dict[str, Any]:
        wid = str(uuid.uuid4())
        row = {
            "id": wid,
            "workspace_id": workspace_id,
            "title": fields.get("title", "Webinar"),
            "description": fields.get("description", ""),
            "status": "draft",
            "slug": fields.get("title", "webinar").lower().replace(" ", "-"),
            "is_free": fields.get("is_free", True),
        }
        self._data["webinars"][wid] = row
        return row

    async def get_webinar(self, webinar_id: str) -> dict[str, Any]:
        wb = self._data["webinars"].get(webinar_id)
        if not wb:
            raise ValueError("Webinar not found")
        return wb

    async def register_attendee(
        self,
        webinar_id: str,
        email: str,
        name: str = "",
        payment_intent_id: str | None = None,
        checkout_session_id: str | None = None,
    ) -> dict[str, Any]:
        await self.get_webinar(webinar_id)
        reg = {"id": str(uuid.uuid4()), "webinar_id": webinar_id, "email": email, "name": name}
        self._data["registrations"].append(reg)
        return reg

    async def get_stats(self, webinar_id: str) -> dict[str, Any]:
        await self.get_webinar(webinar_id)
        regs = [r for r in self._data["registrations"] if r["webinar_id"] == webinar_id]
        return {"registrations": len(regs), "attendees": regs}

    async def list_webinars(self, workspace_id: int) -> list[dict[str, Any]]:
        return [w for w in self._data["webinars"].values() if w["workspace_id"] == workspace_id]

    async def get_workspace_summary(self, workspace_id: int) -> dict[str, Any]:
        return {"total": len(await self.list_webinars(workspace_id))}

    async def update_webinar(self, webinar_id: str, **fields: Any) -> dict[str, Any]:
        wb = await self.get_webinar(webinar_id)
        wb.update({k: v for k, v in fields.items() if v is not None})
        return wb

    async def delete_webinar(self, webinar_id: str) -> bool:
        return self._data["webinars"].pop(webinar_id, None) is not None

    async def publish_webinar(self, webinar_id: str) -> dict[str, Any]:
        wb = await self.get_webinar(webinar_id)
        wb["status"] = "published"
        return wb

    async def list_public_webinars(self) -> list[dict[str, Any]]:
        return [w for w in self._data["webinars"].values() if w.get("status") == "published"]

    async def get_public_webinar(self, slug: str) -> dict[str, Any]:
        for wb in self._data["webinars"].values():
            if wb.get("slug") == slug:
                return wb
        raise ValueError("Webinar not found")


class FakeStoreService:
    _store: dict[int, dict[str, Any]] = {}

    def __init__(self, session: Any = None, workspace_id: int | None = 1) -> None:
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @property
    def _data(self) -> dict[str, Any]:
        return self._store.setdefault(self.workspace_id or 0, {"projects": {}})

    async def create_store_project(self, workspace_id: int, store_info: dict[str, Any]) -> dict[str, Any]:
        pid = str(uuid.uuid4())
        row = {
            "id": pid,
            "workspace_id": workspace_id,
            "name": store_info.get("store_name", "Store"),
            "store_info": store_info,
            "status": "pending",
        }
        self._data["projects"][pid] = row
        return row

    async def get_project(self, project_id: str, workspace_id: int) -> dict[str, Any] | None:
        proj = self._data["projects"].get(project_id)
        if proj and proj["workspace_id"] == workspace_id:
            return proj
        return None

    async def list_projects(self, workspace_id: int) -> list[dict[str, Any]]:
        return [p for p in self._data["projects"].values() if p["workspace_id"] == workspace_id]

    async def mark_generating(self, project_id: str) -> None:
        proj = self._data["projects"].get(project_id)
        if proj:
            proj["status"] = "generating"

    async def publish_store(self, project_id: str, workspace_id: int) -> dict[str, Any]:
        proj = await self.get_project(project_id, workspace_id)
        if not proj:
            raise ValueError("Project not found")
        proj["status"] = "published"
        return proj
