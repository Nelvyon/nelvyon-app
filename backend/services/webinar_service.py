"""NELVYON Webinars — scheduling, Stripe tickets, Zoom, SES confirmations."""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from services.ses_service import get_ses_service
from services.tenant_service import TenantService
from services.zoom_service import get_zoom_service

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
WEBINAR_STATUSES = frozenset({"draft", "published", "live", "ended"})


def _json_dumps(obj: Any) -> str:
    import json

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


def _ensure_stripe_key() -> bool:
    key = (settings.stripe_secret_key or os.environ.get("STRIPE_SECRET_KEY", "")).strip()
    if not key:
        return False
    stripe.api_key = key
    return True


def _slugify(text_val: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (text_val or "").lower()).strip("-")[:40]
    return base or "webinar"


class WebinarService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "webinars.sql"
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
                text("SELECT 1 FROM webinars WHERE slug = :slug LIMIT 1"),
                {"slug": candidate},
            )
            if not exists.mappings().first():
                return candidate
        return f"{base}-{uuid.uuid4().hex[:6]}"

    async def create_webinar(
        self,
        workspace_id: int,
        title: str,
        description: str = "",
        scheduled_at: str | datetime | None = None,
        duration_minutes: int = 60,
        host_name: str = "",
        thumbnail_url: str | None = None,
        is_free: bool = True,
        price_cents: int = 0,
        max_attendees: int | None = None,
        idioma: str = "es",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        title = (title or "").strip()
        if not title:
            raise ValueError("title is required")
        when = scheduled_at or datetime.now(timezone.utc)
        if isinstance(when, str):
            when = datetime.fromisoformat(when.replace("Z", "+00:00"))
        slug = await self._unique_slug(title)
        free = bool(is_free) or int(price_cents) <= 0
        result = await self.session.execute(
            text(
                """
                INSERT INTO webinars (
                    workspace_id, title, description, slug, scheduled_at, duration_minutes,
                    host_name, thumbnail_url, is_free, price_cents, max_attendees, idioma
                )
                VALUES (
                    :ws, :title, :desc, :slug, :when, :dur,
                    :host, :thumb, :free, :price, :max, :idioma
                )
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "title": title,
                "desc": description or "",
                "slug": slug,
                "when": when,
                "dur": max(1, int(duration_minutes)),
                "host": host_name or "",
                "thumb": thumbnail_url,
                "free": free,
                "price": 0 if free else max(0, int(price_cents)),
                "max": max_attendees,
                "idioma": idioma or "es",
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def get_webinar(self, webinar_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        params: dict[str, Any] = {"id": webinar_id}
        where = "id = CAST(:id AS uuid)"
        if self.workspace_id is not None:
            await self._set_tenant(self.workspace_id)
            where += " AND workspace_id = :ws"
            params["ws"] = self.workspace_id
        result = await self.session.execute(text(f"SELECT * FROM webinars WHERE {where}"), params)
        row = result.mappings().first()
        if not row:
            raise ValueError("Webinar not found")
        return _row(row)

    async def list_webinars(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT w.*,
                    COUNT(r.id) AS registrations_count
                FROM webinars w
                LEFT JOIN webinar_registrations r ON r.webinar_id = w.id
                WHERE w.workspace_id = :ws
                GROUP BY w.id
                ORDER BY w.scheduled_at DESC
                """
            ),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]

    async def update_webinar(self, webinar_id: str, **fields: Any) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        current = await self.get_webinar(webinar_id)
        if current.get("status") not in ("draft", "published"):
            raise ValueError("Cannot update live or ended webinar")
        result = await self.session.execute(
            text(
                """
                UPDATE webinars SET
                    title = :title, description = :desc, scheduled_at = :when,
                    duration_minutes = :dur, host_name = :host, thumbnail_url = :thumb,
                    is_free = :free, price_cents = :price, max_attendees = :max, idioma = :idioma
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": webinar_id,
                "ws": self.workspace_id,
                "title": fields.get("title", current["title"]),
                "desc": fields.get("description", current.get("description")),
                "when": fields.get("scheduled_at", current.get("scheduled_at")),
                "dur": int(fields.get("duration_minutes", current.get("duration_minutes", 60))),
                "host": fields.get("host_name", current.get("host_name")),
                "thumb": fields.get("thumbnail_url", current.get("thumbnail_url")),
                "free": bool(fields.get("is_free", current.get("is_free"))),
                "price": int(fields.get("price_cents", current.get("price_cents", 0))),
                "max": fields.get("max_attendees", current.get("max_attendees")),
                "idioma": fields.get("idioma", current.get("idioma", "es")),
            },
        )
        await self.session.commit()
        return _row(result.mappings().first())

    async def delete_webinar(self, webinar_id: str) -> bool:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text("DELETE FROM webinars WHERE id = CAST(:id AS uuid) AND workspace_id = :ws RETURNING id"),
            {"id": webinar_id, "ws": self.workspace_id},
        )
        ok = result.mappings().first() is not None
        await self.session.commit()
        return ok

    async def publish_webinar(self, webinar_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        webinar = await self.get_webinar(webinar_id)
        price_cents = int(webinar.get("price_cents") or 0)
        is_free = bool(webinar.get("is_free")) or price_cents <= 0
        stripe_product_id = webinar.get("stripe_product_id")
        stripe_price_id = webinar.get("stripe_price_id")
        status = "published"

        if not is_free and price_cents > 0:
            if _ensure_stripe_key():
                try:
                    if not stripe_product_id:
                        sp = await stripe.Product.create_async(
                            name=webinar["title"],
                            description=(webinar.get("description") or "")[:500] or None,
                            metadata={
                                "webinar_id": webinar_id,
                                "workspace_id": str(webinar["workspace_id"]),
                                "slug": webinar.get("slug", ""),
                            },
                        )
                        stripe_product_id = sp.id
                    pr = await stripe.Price.create_async(
                        product=stripe_product_id,
                        unit_amount=price_cents,
                        currency="eur",
                    )
                    stripe_price_id = pr.id
                except stripe.StripeError as exc:
                    logger.warning("Webinar Stripe publish failed: %s", exc)
                    status = "published"
            else:
                logger.info("Stripe not configured — publishing webinar without payment")

        slug = webinar.get("slug") or await self._unique_slug(webinar["title"])
        public_path = f"/webinar/{slug}"
        result = await self.session.execute(
            text(
                """
                UPDATE webinars SET
                    status = :status,
                    stripe_product_id = :sp,
                    stripe_price_id = :pr,
                    slug = :slug
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {
                "id": webinar_id,
                "ws": self.workspace_id,
                "status": status,
                "sp": stripe_product_id,
                "pr": stripe_price_id,
                "slug": slug,
            },
        )
        row = _row(result.mappings().first())
        row["public_url"] = public_path
        await self.session.commit()
        return row

    async def _get_public_by_slug(self, slug: str) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM webinars
                WHERE slug = :slug AND status IN ('published', 'live', 'ended')
                """
            ),
            {"slug": slug},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Webinar not found")
        return _row(row)

    async def list_public_webinars(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT id, title, description, slug, scheduled_at, duration_minutes,
                       host_name, thumbnail_url, is_free, price_cents, status, idioma
                FROM webinars
                WHERE status IN ('published', 'live')
                ORDER BY scheduled_at ASC
                LIMIT 100
                """
            ),
        )
        return [_row(r) for r in result.mappings().all()]

    async def get_public_webinar(self, slug: str) -> dict[str, Any]:
        await self.ensure_schema()
        webinar = await self._get_public_by_slug(slug)
        count = await self.session.execute(
            text("SELECT COUNT(*) FROM webinar_registrations WHERE webinar_id = CAST(:id AS uuid)"),
            {"id": webinar["id"]},
        )
        webinar["registrations_count"] = int(count.scalar_one() or 0)
        return webinar

    async def create_checkout_session(
        self,
        webinar_id: str,
        email: str,
        name: str | None,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM webinars
                WHERE id = CAST(:id AS uuid) AND status IN ('published', 'live')
                """
            ),
            {"id": webinar_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Webinar not found")
        webinar = _row(row)
        price_cents = int(webinar.get("price_cents") or 0)
        if bool(webinar.get("is_free")) or price_cents <= 0:
            raise ValueError("Webinar is free")
        if not webinar.get("stripe_price_id"):
            raise ValueError("Payment not configured")
        if not _ensure_stripe_key():
            return {"status": "pending_stripe", "checkout_url": None}
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[{"price": webinar["stripe_price_id"], "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=email.strip(),
            metadata={
                "webinar_id": webinar_id,
                "email": email.strip().lower(),
                "name": (name or "").strip(),
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}

    async def _send_email(self, to_email: str, subject: str, html: str) -> None:
        try:
            ses = get_ses_service()
            await ses.send_email(to_email, subject, html)
        except Exception as exc:
            logger.warning("Webinar email failed to %s: %s", to_email, exc)

    def _confirmation_html(self, webinar: dict[str, Any], name: str, email: str) -> str:
        when = str(webinar.get("scheduled_at", ""))[:16]
        slug = webinar.get("slug", "")
        join = webinar.get("join_url") or f"/webinar/{slug}/live"
        return (
            f"<p>Hola {name or email},</p>"
            f"<p>Tu registro al webinar <strong>{webinar.get('title')}</strong> está confirmado.</p>"
            f"<ul>"
            f"<li><strong>Fecha:</strong> {when}</li>"
            f"<li><strong>Host:</strong> {webinar.get('host_name', '')}</li>"
            f"<li><strong>Duración:</strong> {webinar.get('duration_minutes')} min</li>"
            f"</ul>"
            f"<p>Enlace: <a href=\"{join}\">{join}</a></p>"
            f"<p>NELVYON</p>"
        )

    def _reminder_html(self, webinar: dict[str, Any], name: str) -> str:
        when = str(webinar.get("scheduled_at", ""))[:16]
        slug = webinar.get("slug", "")
        join = webinar.get("join_url") or f"/webinar/{slug}/live"
        return (
            f"<p>Hola {name},</p>"
            f"<p>Recordatorio: el webinar <strong>{webinar.get('title')}</strong> comienza el {when}.</p>"
            f"<p>Únete aquí: <a href=\"{join}\">{join}</a></p>"
            f"<p>NELVYON</p>"
        )

    async def register_attendee(
        self,
        webinar_id: str,
        email: str,
        name: str = "",
        payment_intent_id: str | None = None,
        checkout_session_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT * FROM webinars
                WHERE id = CAST(:id AS uuid) AND status IN ('published', 'live')
                """
            ),
            {"id": webinar_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Webinar not available for registration")
        webinar = _row(row)
        ws = int(webinar["workspace_id"])
        await self._set_tenant(ws)

        price_cents = int(webinar.get("price_cents") or 0)
        is_free = bool(webinar.get("is_free")) or price_cents <= 0
        if not is_free and price_cents > 0 and not payment_intent_id and not checkout_session_id:
            raise ValueError("Payment required")

        if checkout_session_id and _ensure_stripe_key():
            try:
                cs = await stripe.checkout.Session.retrieve_async(checkout_session_id)
                if cs.payment_status != "paid":
                    raise ValueError("Payment not completed")
                payment_intent_id = str(cs.payment_intent or checkout_session_id)
            except stripe.StripeError as exc:
                logger.warning("Stripe session verify failed: %s", exc)

        max_att = webinar.get("max_attendees")
        if max_att:
            cnt = await self.session.execute(
                text("SELECT COUNT(*) FROM webinar_registrations WHERE webinar_id = CAST(:id AS uuid)"),
                {"id": webinar_id},
            )
            if int(cnt.scalar_one() or 0) >= int(max_att):
                raise ValueError("Webinar is full")

        email_l = email.strip().lower()
        ins = await self.session.execute(
            text(
                """
                INSERT INTO webinar_registrations (webinar_id, workspace_id, email, name, payment_intent_id)
                VALUES (CAST(:wid AS uuid), :ws, :email, :name, :pi)
                ON CONFLICT (webinar_id, email) DO UPDATE SET
                    name = EXCLUDED.name,
                    payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, webinar_registrations.payment_intent_id)
                RETURNING *
                """
            ),
            {
                "wid": webinar_id,
                "ws": ws,
                "email": email_l,
                "name": (name or "").strip(),
                "pi": payment_intent_id,
            },
        )
        reg = _row(ins.mappings().first())
        await self.session.commit()
        await self._send_email(
            email_l,
            f"Registro confirmado — {webinar.get('title')}",
            self._confirmation_html(webinar, name, email_l),
        )
        return reg

    async def start_webinar(self, webinar_id: str, base_url: str = "") -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        webinar = await self.get_webinar(webinar_id)
        slug = webinar.get("slug") or "webinar"
        join_url = f"{base_url.rstrip('/')}/webinar/{slug}/live" if base_url else f"/webinar/{slug}/live"
        zoom_meeting_id = webinar.get("zoom_meeting_id")

        try:
            zoom = get_zoom_service()
            when = webinar.get("scheduled_at")
            if isinstance(when, str):
                when = datetime.fromisoformat(when.replace("Z", "+00:00"))
            meeting = await zoom.create_meeting(
                topic=webinar["title"],
                start_time=when if isinstance(when, datetime) else datetime.now(timezone.utc),
                duration=int(webinar.get("duration_minutes") or 60),
                agenda=webinar.get("description") or "",
            )
            if meeting.get("join_url"):
                join_url = meeting["join_url"]
                zoom_meeting_id = str(meeting.get("id") or meeting.get("meeting_id") or "")
        except Exception as exc:
            logger.info("Zoom unavailable, using internal live URL: %s", exc)

        result = await self.session.execute(
            text(
                """
                UPDATE webinars SET status = 'live', join_url = :join, zoom_meeting_id = :zoom
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {"id": webinar_id, "ws": self.workspace_id, "join": join_url, "zoom": zoom_meeting_id},
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def end_webinar(self, webinar_id: str, recording_url: str | None = None) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text(
                """
                UPDATE webinars SET status = 'ended', recording_url = COALESCE(:rec, recording_url)
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                RETURNING *
                """
            ),
            {"id": webinar_id, "ws": self.workspace_id, "rec": recording_url},
        )
        row = _row(result.mappings().first())
        if not row:
            raise ValueError("Webinar not found")
        await self.session.commit()
        return row

    async def get_stats(self, webinar_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        webinar = await self.get_webinar(webinar_id)
        stats = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS registered,
                    COUNT(*) FILTER (WHERE attended) AS attended,
                    COUNT(*) FILTER (WHERE payment_intent_id IS NOT NULL) AS paid
                FROM webinar_registrations
                WHERE webinar_id = CAST(:id AS uuid)
                """
            ),
            {"id": webinar_id},
        )
        s = stats.mappings().first()
        registered = int(s["registered"] or 0)
        attended = int(s["attended"] or 0)
        paid = int(s["paid"] or 0)
        price = int(webinar.get("price_cents") or 0)
        revenue_cents = paid * price if price > 0 else 0
        conversion_rate = round((attended / registered) * 100, 2) if registered else 0.0
        return {
            "webinar_id": webinar_id,
            "registered": registered,
            "attended": attended,
            "paid_registrations": paid,
            "revenue_cents": revenue_cents,
            "conversion_rate": conversion_rate,
            "status": webinar.get("status"),
        }

    async def send_reminder(self, webinar_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        webinar = await self.get_webinar(webinar_id)
        regs = await self.session.execute(
            text(
                """
                SELECT email, name FROM webinar_registrations
                WHERE webinar_id = CAST(:id AS uuid)
                """
            ),
            {"id": webinar_id},
        )
        sent = 0
        for r in regs.mappings().all():
            await self._send_email(
                str(r["email"]),
                f"Recordatorio — {webinar.get('title')}",
                self._reminder_html(webinar, str(r.get("name") or r["email"])),
            )
            sent += 1
        return {"webinar_id": webinar_id, "reminders_sent": sent}

    async def mark_attended(self, webinar_id: str, email: str) -> dict[str, Any]:
        await self.ensure_schema()
        webinar = await self.get_webinar(webinar_id)
        ws = int(webinar["workspace_id"])
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                UPDATE webinar_registrations SET attended = true
                WHERE webinar_id = CAST(:id AS uuid) AND lower(email) = :email
                RETURNING *
                """
            ),
            {"id": webinar_id, "email": email.strip().lower()},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Registration not found")
        await self.session.commit()
        return _row(row)

    async def get_chat_messages(self, slug: str, since: str | None = None) -> list[dict[str, Any]]:
        await self.ensure_schema()
        webinar = await self._get_public_by_slug(slug)
        params: dict[str, Any] = {"wid": webinar["id"]}
        where = "webinar_id = CAST(:wid AS uuid)"
        if since:
            where += " AND created_at > CAST(:since AS timestamptz)"
            params["since"] = since
        result = await self.session.execute(
            text(f"SELECT * FROM webinar_chat_messages WHERE {where} ORDER BY created_at ASC LIMIT 200"),
            params,
        )
        return [_row(r) for r in result.mappings().all()]

    async def post_chat_message(self, slug: str, email: str, name: str, message: str) -> dict[str, Any]:
        await self.ensure_schema()
        webinar = await self._get_public_by_slug(slug)
        if webinar.get("status") not in ("live", "published"):
            raise ValueError("Chat not available")
        ws = int(webinar["workspace_id"])
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                INSERT INTO webinar_chat_messages (webinar_id, workspace_id, email, name, message)
                VALUES (CAST(:wid AS uuid), :ws, :email, :name, :msg)
                RETURNING *
                """
            ),
            {
                "wid": webinar["id"],
                "ws": ws,
                "email": email.strip().lower(),
                "name": (name or email).strip(),
                "msg": message.strip()[:2000],
            },
        )
        row = _row(result.mappings().first())
        await self.session.commit()
        return row

    async def get_workspace_summary(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        stats = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status IN ('published', 'live')) AS active_webinars,
                    COUNT(*) AS total_webinars,
                    COALESCE(SUM(
                        CASE WHEN NOT is_free THEN price_cents * (
                            SELECT COUNT(*) FROM webinar_registrations r
                            WHERE r.webinar_id = w.id AND r.payment_intent_id IS NOT NULL
                        ) ELSE 0 END
                    ), 0) AS revenue_cents
                FROM webinars w
                WHERE w.workspace_id = :ws
                """
            ),
            {"ws": ws},
        )
        s = _row(stats.mappings().first())
        regs = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM webinar_registrations r
                JOIN webinars w ON w.id = r.webinar_id
                WHERE w.workspace_id = :ws
                """
            ),
            {"ws": ws},
        )
        next_w = await self.session.execute(
            text(
                """
                SELECT * FROM webinars
                WHERE workspace_id = :ws AND status IN ('published', 'live')
                  AND scheduled_at >= NOW()
                ORDER BY scheduled_at ASC LIMIT 1
                """
            ),
            {"ws": ws},
        )
        nxt = _row(next_w.mappings().first()) if next_w.mappings().first() else None
        return {
            "active_webinars": int(s.get("active_webinars") or 0),
            "total_registrations": int(regs.scalar_one() or 0),
            "revenue_cents": int(s.get("revenue_cents") or 0),
            "next_webinar": nxt,
        }


def get_webinar_service(session: AsyncSession, workspace_id: int | None = None) -> WebinarService:
    return WebinarService(session, workspace_id)
