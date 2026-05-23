"""NELVYON Forms & Surveys — builder, public submit, CRM sync, NPS analysis."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.crm_service import CRMService
from services.ses_service import get_ses_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
FIELD_TYPES = frozenset(
    {"text", "email", "phone", "select", "multiselect", "radio", "checkbox", "rating", "date", "file", "nps", "csat"}
)


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _slugify(text_val: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (text_val or "").lower()).strip("-")[:40]
    return base or "form"


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


class FormsService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "forms.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def _unique_slug(self, title: str) -> str:
        base = _slugify(title)[:30]
        for attempt in range(25):
            candidate = base if attempt == 0 else f"{base}-{uuid.uuid4().hex[:4]}"
            exists = await self.session.execute(
                text("SELECT 1 FROM forms WHERE slug = :slug LIMIT 1"),
                {"slug": candidate},
            )
            if not exists.mappings().first():
                return candidate
        return f"{base}-{uuid.uuid4().hex[:6]}"

    async def create_form(
        self,
        workspace_id: int,
        title: str,
        description: str = "",
        fields: list[dict[str, Any]] | None = None,
        settings: dict[str, Any] | None = None,
        kind: str = "form",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        default_settings = {
            "submit_button_text": "Enviar",
            "success_message": "¡Gracias! Hemos recibido tu respuesta.",
            "redirect_url": "",
            "notify_email": "",
            "save_to_crm": False,
        }
        result = await self.session.execute(
            text(
                """
                INSERT INTO forms (workspace_id, title, description, kind, fields, settings)
                VALUES (:ws, :title, :desc, :kind, CAST(:fields AS jsonb), CAST(:settings AS jsonb))
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "title": title.strip(),
                "desc": description or "",
                "kind": kind,
                "fields": _json_dumps(fields or []),
                "settings": _json_dumps({**default_settings, **(settings or {})}),
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def create_survey(
        self,
        workspace_id: int,
        title: str,
        questions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        fields = []
        for i, q in enumerate(questions):
            qtype = str(q.get("type", "rating")).lower()
            if qtype not in FIELD_TYPES:
                qtype = "rating"
            fields.append(
                {
                    "id": q.get("id") or f"q{i}",
                    "type": qtype,
                    "label": q.get("label", f"Pregunta {i + 1}"),
                    "required": bool(q.get("required", True)),
                    "options": q.get("options", []),
                }
            )
        return await self.create_form(
            workspace_id,
            title,
            description="Encuesta",
            fields=fields,
            settings={"submit_button_text": "Enviar encuesta"},
            kind="survey",
        )

    async def get_form(self, form_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": form_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(text(f"SELECT * FROM forms WHERE {where}"), params)
        row = result.mappings().first()
        if not row:
            raise ValueError("Form not found")
        return _row(row)

    async def list_forms(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT id, title, description, slug, kind, status, views_count, submissions_count, created_at
                FROM forms WHERE workspace_id = :ws ORDER BY created_at DESC
                """
            ),
            {"ws": ws},
        )
        items = []
        for r in result.mappings().all():
            item = _row(r)
            views = int(item.get("views_count") or 0)
            subs = int(item.get("submissions_count") or 0)
            item["conversion_rate"] = round((subs / views) * 100, 2) if views else 0.0
            items.append(item)
        return items

    async def update_form(self, form_id: str, **fields: Any) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        current = await self.get_form(form_id)
        result = await self.session.execute(
            text(
                """
                UPDATE forms SET
                    title = :title, description = :desc,
                    fields = CAST(:fields AS jsonb), settings = CAST(:settings AS jsonb)
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": form_id,
                "ws": self.workspace_id,
                "title": fields.get("title", current["title"]),
                "desc": fields.get("description", current.get("description")),
                "fields": _json_dumps(fields.get("fields", current.get("fields") or [])),
                "settings": _json_dumps(fields.get("settings", current.get("settings") or {})),
            },
        )
        await self.session.commit()
        return _row(result.mappings().first())

    async def delete_form(self, form_id: str) -> bool:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text("DELETE FROM forms WHERE id = CAST(:id AS uuid) AND workspace_id = :ws RETURNING id"),
            {"id": form_id, "ws": self.workspace_id},
        )
        ok = result.mappings().first() is not None
        await self.session.commit()
        return ok

    async def publish_form(self, form_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        form = await self.get_form(form_id)
        slug = form.get("slug") or await self._unique_slug(form["title"])
        result = await self.session.execute(
            text(
                """
                UPDATE forms SET status = 'published', slug = :slug
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {"id": form_id, "ws": self.workspace_id, "slug": slug},
        )
        row = _row(result.mappings().first())
        row["public_url"] = f"/form/{slug}"
        row["embed_snippet"] = f'<iframe src="/form/{slug}" width="100%" height="600" frameborder="0"></iframe>'
        await self.session.commit()
        return row

    async def get_public_form(self, slug: str) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text("SELECT * FROM forms WHERE slug = :slug AND status = 'published'"),
            {"slug": slug},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Form not found")
        form = _row(row)
        ws = int(form["workspace_id"])
        await self._set_tenant(ws)
        await self.session.execute(
            text("UPDATE forms SET views_count = views_count + 1 WHERE id = CAST(:id AS uuid)"),
            {"id": form["id"]},
        )
        await self.session.commit()
        return {
            "id": form["id"],
            "title": form["title"],
            "description": form.get("description"),
            "fields": form.get("fields"),
            "settings": form.get("settings"),
            "kind": form.get("kind"),
        }

    async def submit_form(
        self,
        form_id: str,
        responses: dict[str, Any],
        visitor_info: dict[str, Any] | None = None,
        completion_seconds: int | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text("SELECT * FROM forms WHERE id = CAST(:id AS uuid) AND status = 'published'"),
            {"id": form_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Form not available")
        form = _row(row)
        ws = int(form["workspace_id"])
        await self._set_tenant(ws)
        settings = form.get("settings") or {}
        if isinstance(settings, str):
            settings = json.loads(settings)

        ins = await self.session.execute(
            text(
                """
                INSERT INTO form_responses (form_id, workspace_id, responses, visitor_info, completion_seconds)
                VALUES (CAST(:fid AS uuid), :ws, CAST(:resp AS jsonb), CAST(:visitor AS jsonb), :secs)
                RETURNING *
                """
            ),
            {
                "fid": form_id,
                "ws": ws,
                "resp": _json_dumps(responses),
                "visitor": _json_dumps(visitor_info or {}),
                "secs": completion_seconds,
            },
        )
        response_row = _row(ins.mappings().first())
        await self.session.execute(
            text(
                """
                UPDATE forms SET submissions_count = submissions_count + 1
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": form_id},
        )

        if settings.get("save_to_crm"):
            email = responses.get("email") or visitor_info.get("email") if visitor_info else None
            if not email:
                for v in responses.values():
                    if isinstance(v, str) and "@" in v:
                        email = v
                        break
            if email:
                try:
                    crm = CRMService(self.session, ws)
                    name = str(responses.get("name") or visitor_info.get("name") if visitor_info else email.split("@")[0])
                    await crm.create_contact(name=name, email=str(email).lower(), tags=["form-submission"])
                except Exception as exc:
                    logger.warning("CRM save from form failed: %s", exc)

        notify = settings.get("notify_email")
        if notify:
            try:
                ses = get_ses_service()
                await ses.send_email(
                    str(notify),
                    f"Nueva respuesta — {form.get('title')}",
                    f"<p>Nueva respuesta recibida:</p><pre>{_json_dumps(responses)}</pre>",
                )
            except Exception as exc:
                logger.warning("Form notify email failed: %s", exc)

        await self.session.commit()
        return {
            "id": response_row["id"],
            "success_message": settings.get("success_message", "¡Gracias!"),
            "redirect_url": settings.get("redirect_url") or "",
        }

    async def get_responses(self, form_id: str) -> list[dict[str, Any]]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        await self.get_form(form_id)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM form_responses
                WHERE form_id = CAST(:id AS uuid)
                ORDER BY submitted_at DESC
                """
            ),
            {"id": form_id},
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_form_stats(self, form_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        form = await self.get_form(form_id)
        avg = await self.session.execute(
            text(
                """
                SELECT AVG(completion_seconds) FROM form_responses
                WHERE form_id = CAST(:id AS uuid) AND completion_seconds IS NOT NULL
                """
            ),
            {"id": form_id},
        )
        views = int(form.get("views_count") or 0)
        subs = int(form.get("submissions_count") or 0)
        return {
            "form_id": form_id,
            "views": views,
            "submissions": subs,
            "conversion_rate": round((subs / views) * 100, 2) if views else 0.0,
            "avg_completion_seconds": round(float(avg.scalar_one() or 0), 1),
        }

    async def get_survey_results(self, survey_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        form = await self.get_form(survey_id)
        if form.get("kind") != "survey":
            raise ValueError("Not a survey")
        responses = await self.get_responses(survey_id)
        nps_scores: list[int] = []
        for r in responses:
            resp = r.get("responses") or {}
            if isinstance(resp, str):
                resp = json.loads(resp)
            for k, v in resp.items():
                if "nps" in str(k).lower() or k.startswith("q"):
                    try:
                        score = int(v)
                        if 0 <= score <= 10:
                            nps_scores.append(score)
                    except (TypeError, ValueError):
                        pass
        promoters = sum(1 for s in nps_scores if s >= 9)
        detractors = sum(1 for s in nps_scores if s <= 6)
        total = len(nps_scores)
        nps = round(((promoters - detractors) / total) * 100, 1) if total else 0.0

        sentiment = ""
        client = _openai_client()
        if client and responses:
            try:
                sample = [r.get("responses") for r in responses[:20]]
                resp_ai = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "Analiza sentimiento de encuestas en español (2 párrafos)."},
                        {"role": "user", "content": _json_dumps(sample)},
                    ],
                    temperature=0.4,
                    max_tokens=300,
                )
                sentiment = (resp_ai.choices[0].message.content or "").strip()
            except Exception as exc:
                logger.warning("Survey sentiment failed: %s", exc)

        return {
            "survey_id": survey_id,
            "responses_count": len(responses),
            "nps_score": nps,
            "nps_breakdown": {"promoters": promoters, "detractors": detractors, "total": total},
            "sentiment_analysis": sentiment,
            "responses": responses,
        }


def get_forms_service(session: AsyncSession, workspace_id: int | None = None) -> FormsService:
    return FormsService(session, workspace_id)
