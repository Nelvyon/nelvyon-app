"""NELVYON reusable templates — Jinja2 rendering for email, WhatsApp, contracts, etc."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import TemplateSyntaxError, UndefinedError
from jinja2.sandbox import SandboxedEnvironment
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
TEMPLATE_TYPES = frozenset({"email", "whatsapp", "contract", "report", "invoice"})
_jinja_env = SandboxedEnvironment(autoescape=True)


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


class TemplateService:
    """Workspace-scoped template CRUD and Jinja2 rendering."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "templates.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("templates schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def create_template(
        self,
        name: str,
        type: str,
        content: str,
        *,
        subject: str | None = None,
        variables: list[str] | None = None,
        is_public: bool = False,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        type_norm = (type or "").strip().lower()
        if type_norm not in TEMPLATE_TYPES:
            raise ValueError(f"Invalid template type: {type}. Allowed: {', '.join(sorted(TEMPLATE_TYPES))}")
        if not (name or "").strip():
            raise ValueError("Template name is required")
        if not (content or "").strip():
            raise ValueError("Template content is required")

        template_id = str(uuid.uuid4())
        var_list = [v.strip() for v in (variables or []) if v and v.strip()]
        r = await self.session.execute(
            text(
                """
                INSERT INTO templates (
                    id, workspace_id, name, type, subject, content, variables, is_public
                )
                VALUES (
                    :id, :ws, :name, :type, :subject, :content,
                    CAST(:variables AS jsonb), :is_public
                )
                RETURNING id, workspace_id, name, type, subject, content, variables, is_public, created_at
                """
            ),
            {
                "id": template_id,
                "ws": self.workspace_id,
                "name": name.strip(),
                "type": type_norm,
                "subject": subject,
                "content": content,
                "variables": _json_dumps(var_list),
                "is_public": is_public,
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def get_template(self, template_id: str) -> dict[str, Any] | None:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, type, subject, content, variables, is_public, created_at, updated_at
                FROM templates
                WHERE id = :id::uuid
                  AND (workspace_id = :ws OR is_public = TRUE)
                """
            ),
            {"id": template_id, "ws": self.workspace_id},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def list_templates(
        self,
        *,
        type: str | None = None,
        include_public: bool = True,
    ) -> list[dict[str, Any]]:
        await self.ensure_schema()
        params: dict[str, Any] = {"ws": self.workspace_id}
        if include_public:
            q = """
                SELECT id, workspace_id, name, type, subject, variables, is_public, created_at, updated_at
                FROM templates
                WHERE workspace_id = :ws OR is_public = TRUE
            """
        else:
            q = """
                SELECT id, workspace_id, name, type, subject, variables, is_public, created_at, updated_at
                FROM templates
                WHERE workspace_id = :ws
            """
        if type:
            type_norm = type.strip().lower()
            if type_norm not in TEMPLATE_TYPES:
                raise ValueError(f"Invalid template type: {type}")
            q += " AND type = :type"
            params["type"] = type_norm
        q += " ORDER BY created_at DESC"
        r = await self.session.execute(text(q), params)
        return [_row(x) for x in r.fetchall()]

    async def update_template(
        self,
        template_id: str,
        *,
        name: str | None = None,
        subject: str | None = None,
        content: str | None = None,
        variables: list[str] | None = None,
        is_public: bool | None = None,
    ) -> dict[str, Any]:
        tpl = await self.get_template(template_id)
        if not tpl or tpl.get("workspace_id") != self.workspace_id:
            raise ValueError("Template not found")

        sets: list[str] = ["updated_at = NOW()"]
        params: dict[str, Any] = {"id": template_id, "ws": self.workspace_id}
        if name is not None:
            sets.append("name = :name")
            params["name"] = name.strip()
        if subject is not None:
            sets.append("subject = :subject")
            params["subject"] = subject
        if content is not None:
            sets.append("content = :content")
            params["content"] = content
        if variables is not None:
            sets.append("variables = CAST(:variables AS jsonb)")
            params["variables"] = _json_dumps([v.strip() for v in variables if v.strip()])
        if is_public is not None:
            sets.append("is_public = :is_public")
            params["is_public"] = is_public

        await self.session.execute(
            text(
                f"""
                UPDATE templates SET {', '.join(sets)}
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            params,
        )
        await self.session.commit()
        updated = await self.get_template(template_id)
        if not updated:
            raise ValueError("Template not found after update")
        return updated

    async def delete_template(self, template_id: str) -> bool:
        r = await self.session.execute(
            text(
                "DELETE FROM templates WHERE id = :id::uuid AND workspace_id = :ws"
            ),
            {"id": template_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return (r.rowcount or 0) > 0

    async def render_template(
        self,
        template_id: str,
        variables: dict[str, Any],
    ) -> dict[str, Any]:
        tpl = await self.get_template(template_id)
        if not tpl:
            raise ValueError("Template not found")

        try:
            content_tpl = _jinja_env.from_string(tpl["content"])
            rendered_content = content_tpl.render(**variables)
            rendered_subject = None
            if tpl.get("subject"):
                subject_tpl = _jinja_env.from_string(tpl["subject"])
                rendered_subject = subject_tpl.render(**variables)
        except TemplateSyntaxError as exc:
            raise ValueError(f"Template syntax error: {exc}") from exc
        except UndefinedError as exc:
            raise ValueError(f"Missing template variable: {exc}") from exc

        return {
            "template_id": template_id,
            "type": tpl.get("type"),
            "subject": rendered_subject,
            "content": rendered_content,
            "variables_used": list(variables.keys()),
        }

    async def clone_template(
        self,
        template_id: str,
        target_workspace_id: int | None = None,
    ) -> dict[str, Any]:
        tpl = await self.get_template(template_id)
        if not tpl:
            raise ValueError("Template not found")

        ws = int(target_workspace_id or self.workspace_id)
        vars_list = tpl.get("variables") or []
        if isinstance(vars_list, str):
            vars_list = json.loads(vars_list)

        full = await self.session.execute(
            text("SELECT content, subject FROM templates WHERE id = :id::uuid"),
            {"id": template_id},
        )
        row = full.fetchone()
        if not row:
            raise ValueError("Template not found")

        content = row._mapping["content"]
        subject = row._mapping.get("subject")

        clone_svc = TemplateService(self.session, ws)
        return await clone_svc.create_template(
            name=f"{tpl['name']} (copy)",
            type=tpl["type"],
            content=content,
            subject=subject,
            variables=vars_list if isinstance(vars_list, list) else [],
            is_public=False,
        )


def get_template_service(session: AsyncSession, workspace_id: int) -> TemplateService:
    return TemplateService(session, workspace_id)
