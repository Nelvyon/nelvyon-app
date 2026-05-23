"""NELVYON multichannel helpdesk — tickets, email + WhatsApp inbox."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from services.ses_service import get_ses_service
from services.whatsapp_service import get_whatsapp_service

logger = logging.getLogger(__name__)

_SCHEMA_READY = False

TICKET_STATUSES = frozenset({"open", "pending", "resolved", "closed"})
TICKET_PRIORITIES = frozenset({"low", "medium", "high", "urgent"})
CHANNELS = frozenset({"whatsapp", "email", "web"})

_TICKET_REF_RE = re.compile(
    r"(?:ticket|nelvyon)\s*#?\s*(\d+)|\[#?(\d+)\]",
    re.IGNORECASE,
)


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, datetime):
            data[key] = val.isoformat()
        elif key == "attachments" and isinstance(val, str):
            try:
                data[key] = json.loads(val)
            except json.JSONDecodeError:
                pass
    return data


def _ticket_subject_tag(ticket_id: int) -> str:
    return f"[NELVYON Ticket #{ticket_id}]"


def _extract_ticket_id_from_subject(subject: str) -> int | None:
    for match in _TICKET_REF_RE.finditer(subject or ""):
        for group in match.groups():
            if group:
                try:
                    return int(group)
                except ValueError:
                    continue
    return None


class HelpdeskService:
    """Workspace-scoped helpdesk on `tickets` + `ticket_messages`."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "helpdesk.sql"
        if sql_path.exists() and db_manager.async_session_maker:
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("helpdesk schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _resolve_contact_id(
        self, contact_data: dict[str, Any] | None, *, email: str | None = None, phone: str | None = None
    ) -> int | None:
        contact_data = contact_data or {}
        cid = contact_data.get("contact_id")
        if cid is not None:
            try:
                return int(cid)
            except (TypeError, ValueError):
                pass

        em = (email or contact_data.get("client_email") or contact_data.get("email") or "").strip().lower()
        ph = (phone or contact_data.get("client_phone") or contact_data.get("phone") or "").strip()

        if em:
            r = await self.session.execute(
                text(
                    """
                    SELECT id FROM contacts
                    WHERE workspace_id = :workspace_id AND lower(email) = :email
                    LIMIT 1
                    """
                ),
                {"workspace_id": self.workspace_id, "email": em},
            )
            row = r.fetchone()
            if row:
                return int(row._mapping["id"])

        if ph:
            digits = "".join(c for c in ph if c.isdigit())
            if digits:
                r = await self.session.execute(
                    text(
                        """
                        SELECT id FROM contacts
                        WHERE workspace_id = :workspace_id
                          AND replace(phone, ' ', '') LIKE :phone
                        LIMIT 1
                        """
                    ),
                    {"workspace_id": self.workspace_id, "phone": f"%{digits[-9:]}"},
                )
                row = r.fetchone()
                if row:
                    return int(row._mapping["id"])
        return None

    async def _add_message(
        self,
        ticket_id: int,
        *,
        direction: str,
        channel: str,
        content: str,
        sender_name: str | None = None,
        sender_email: str | None = None,
        sender_phone: str | None = None,
        attachments: list | None = None,
    ) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                INSERT INTO ticket_messages (
                    ticket_id, direction, channel, content, attachments,
                    sender_name, sender_email, sender_phone, created_at
                )
                VALUES (
                    :ticket_id, :direction, :channel, :content, CAST(:attachments AS jsonb),
                    :sender_name, :sender_email, :sender_phone, :created_at
                )
                RETURNING *
                """
            ),
            {
                "ticket_id": ticket_id,
                "direction": direction,
                "channel": channel,
                "content": content,
                "attachments": _json_dumps(attachments or []),
                "sender_name": sender_name,
                "sender_email": sender_email,
                "sender_phone": sender_phone,
                "created_at": datetime.now(timezone.utc),
            },
        )
        return _row_to_dict(result.fetchone())

    async def create_ticket(
        self,
        channel: str,
        contact_data: dict[str, Any],
        subject: str,
        first_message: str,
        *,
        priority: str = "medium",
    ) -> dict[str, Any]:
        channel = channel.strip().lower()
        if channel not in CHANNELS:
            raise ValueError(f"channel must be one of: {', '.join(sorted(CHANNELS))}")
        priority = priority.strip().lower()
        if priority not in TICKET_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(sorted(TICKET_PRIORITIES))}")

        subject = subject.strip() or "Sin asunto"
        first_message = (first_message or "").strip()
        if not first_message:
            raise ValueError("first_message is required")

        contact_id = await self._resolve_contact_id(contact_data)
        now = datetime.now(timezone.utc)

        result = await self.session.execute(
            text(
                """
                INSERT INTO tickets (
                    workspace_id, contact_id, subject, status, priority, channel, created_at
                )
                VALUES (
                    :workspace_id, :contact_id, :subject, 'open', :priority, :channel, :created_at
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "contact_id": contact_id,
                "subject": subject,
                "priority": priority,
                "channel": channel,
                "created_at": now,
            },
        )
        ticket = _row_to_dict(result.fetchone())
        ticket_id = int(ticket["id"])

        await self._add_message(
            ticket_id,
            direction="inbound",
            channel=channel,
            content=first_message,
            sender_name=contact_data.get("client_name") or contact_data.get("name"),
            sender_email=contact_data.get("client_email") or contact_data.get("email"),
            sender_phone=contact_data.get("client_phone") or contact_data.get("phone"),
        )
        await self.session.commit()
        return await self.get_ticket(ticket_id)

    async def get_ticket(self, ticket_id: int) -> dict[str, Any]:
        result = await self.session.execute(
            text("SELECT * FROM tickets WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": ticket_id, "workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Ticket not found")
        ticket = _row_to_dict(row)
        msgs = await self.session.execute(
            text(
                "SELECT * FROM ticket_messages WHERE ticket_id = :id ORDER BY created_at ASC"
            ),
            {"id": ticket_id},
        )
        ticket["messages"] = [_row_to_dict(m) for m in msgs.fetchall()]
        return ticket

    async def list_tickets(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
        channel: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        where = "workspace_id = :workspace_id"
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "skip": skip,
            "limit": limit,
        }
        if status:
            where += " AND status = :status"
            params["status"] = status.lower()
        if priority:
            where += " AND priority = :priority"
            params["priority"] = priority.lower()
        if channel:
            where += " AND channel = :channel"
            params["channel"] = channel.lower()

        count_r = await self.session.execute(
            text(f"SELECT COUNT(*) FROM tickets WHERE {where}"), params
        )
        total = int(count_r.scalar() or 0)

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM tickets WHERE {where}
                ORDER BY created_at DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        items = [_row_to_dict(r) for r in result.fetchall()]
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def reply_to_ticket(
        self,
        ticket_id: int,
        content: str,
        channel: str | None = None,
        *,
        agent_name: str = "NELVYON Support",
    ) -> dict[str, Any]:
        ticket = await self.get_ticket(ticket_id)
        if ticket.get("status") in ("closed",):
            raise ValueError("Cannot reply to a closed ticket")

        content = content.strip()
        if not content:
            raise ValueError("content is required")

        send_channel = (channel or ticket.get("channel") or "email").strip().lower()
        delivery: dict[str, Any] = {}

        if send_channel == "email":
            to_email = None
            for msg in reversed(ticket.get("messages") or []):
                if msg.get("direction") == "inbound" and msg.get("sender_email"):
                    to_email = msg["sender_email"]
                    break
            if not to_email:
                raise ValueError("No client email on ticket for email reply")
            subject = f"Re: {_ticket_subject_tag(ticket_id)} {ticket.get('subject', '')}"
            html = f"<p>{content.replace(chr(10), '<br/>')}</p><p>— {agent_name}</p>"
            delivery = await get_ses_service().send_email(to_email, subject, html)
        elif send_channel == "whatsapp":
            to_phone = None
            for msg in reversed(ticket.get("messages") or []):
                if msg.get("direction") == "inbound" and msg.get("sender_phone"):
                    to_phone = msg["sender_phone"]
                    break
            if not to_phone:
                raise ValueError("No client phone on ticket for WhatsApp reply")
            delivery = await get_whatsapp_service().send_message(to_phone, content)
        else:
            send_channel = ticket.get("channel", "web")

        await self._add_message(
            ticket_id,
            direction="outbound",
            channel=send_channel,
            content=content,
            sender_name=agent_name,
        )
        await self.session.execute(
            text(
                """
                UPDATE tickets SET status = 'pending'
                WHERE id = :id AND workspace_id = :workspace_id AND status = 'open'
                """
            ),
            {"id": ticket_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()

        out = await self.get_ticket(ticket_id)
        out["delivery"] = delivery
        return out

    async def process_inbound_email(
        self, from_email: str, subject: str, body: str, *, sender_name: str | None = None
    ) -> dict[str, Any]:
        from_email = from_email.strip().lower()
        subject = (subject or "").strip()
        body = (body or "").strip()
        if not from_email:
            raise ValueError("from_email is required")

        ticket_id = _extract_ticket_id_from_subject(subject)
        if ticket_id:
            try:
                ticket = await self.get_ticket(ticket_id)
            except ValueError:
                ticket_id = None
            else:
                await self._add_message(
                    ticket_id,
                    direction="inbound",
                    channel="email",
                    content=body or subject,
                    sender_name=sender_name,
                    sender_email=from_email,
                )
                await self.session.execute(
                    text(
                        "UPDATE tickets SET status = 'open' WHERE id = :id AND status != 'closed'"
                    ),
                    {"id": ticket_id},
                )
                await self.session.commit()
                return {"action": "reply", "ticket": await self.get_ticket(ticket_id)}

        ticket = await self.create_ticket(
            "email",
            {"client_email": from_email, "name": sender_name or from_email},
            subject or "Email entrante",
            body or subject,
        )
        return {"action": "created", "ticket": ticket}

    async def process_inbound_whatsapp(
        self, from_phone: str, message: str, *, sender_name: str | None = None
    ) -> dict[str, Any]:
        from_phone = from_phone.strip()
        message = (message or "").strip()
        if not from_phone or not message:
            raise ValueError("from_phone and message are required")

        r = await self.session.execute(
            text(
                """
                SELECT t.id FROM tickets t
                JOIN ticket_messages m ON m.ticket_id = t.id
                WHERE t.workspace_id = :workspace_id
                  AND t.channel = 'whatsapp'
                  AND t.status NOT IN ('closed')
                  AND m.sender_phone IS NOT NULL
                  AND replace(m.sender_phone, ' ', '') LIKE :phone
                ORDER BY t.created_at DESC
                LIMIT 1
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "phone": f"%{''.join(c for c in from_phone if c.isdigit())[-9:]}",
            },
        )
        row = r.fetchone()
        if row:
            ticket_id = int(row._mapping["id"])
            await self._add_message(
                ticket_id,
                direction="inbound",
                channel="whatsapp",
                content=message,
                sender_name=sender_name,
                sender_phone=from_phone,
            )
            await self.session.execute(
                text("UPDATE tickets SET status = 'open' WHERE id = :id"),
                {"id": ticket_id},
            )
            await self.session.commit()
            return {"action": "reply", "ticket": await self.get_ticket(ticket_id)}

        ticket = await self.create_ticket(
            "whatsapp",
            {"client_phone": from_phone, "name": sender_name or from_phone},
            f"WhatsApp {from_phone}",
            message,
        )
        return {"action": "created", "ticket": ticket}

    async def process_whatsapp_webhook_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        processed = 0
        results: list[dict[str, Any]] = []
        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                for msg in value.get("messages") or []:
                    if msg.get("type") != "text":
                        continue
                    phone = str(msg.get("from", ""))
                    text_body = (msg.get("text") or {}).get("body", "")
                    profile = (value.get("contacts") or [{}])[0]
                    name = (profile.get("profile") or {}).get("name")
                    try:
                        out = await self.process_inbound_whatsapp(phone, text_body, sender_name=name)
                        results.append(out)
                        processed += 1
                    except Exception as exc:
                        logger.warning("helpdesk whatsapp inbound failed: %s", exc)
        return {"processed": processed, "results": results}

    async def process_ses_sns_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        msg_type = payload.get("Type", "")
        if msg_type == "SubscriptionConfirmation":
            logger.info("SES SNS subscription URL: %s", payload.get("SubscribeURL"))
            return {"ok": True, "type": "SubscriptionConfirmation"}

        if msg_type != "Notification":
            return {"ok": True, "type": msg_type or "unknown"}

        raw_message = payload.get("Message", "{}")
        try:
            inner = json.loads(raw_message) if isinstance(raw_message, str) else raw_message
        except json.JSONDecodeError:
            inner = {"content": str(raw_message)}

        mail = inner.get("mail", inner)
        from_email = (mail.get("source") or mail.get("from") or "").strip()
        common = mail.get("commonHeaders") or {}
        subject = common.get("subject") or inner.get("subject") or ""
        body = inner.get("content") or inner.get("body") or inner.get("text") or ""

        if not from_email:
            return {"ok": False, "error": "missing from email in SNS payload"}

        result = await self.process_inbound_email(from_email, subject, body)
        return {"ok": True, **result}

    async def assign_ticket(self, ticket_id: int, user_id: str) -> dict[str, Any]:
        user_id = user_id.strip()
        if not user_id:
            raise ValueError("user_id is required")
        await self.session.execute(
            text(
                """
                UPDATE tickets SET assigned_to = :assigned_to
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": ticket_id, "workspace_id": self.workspace_id, "assigned_to": user_id},
        )
        await self.session.commit()
        return await self.get_ticket(ticket_id)

    async def resolve_ticket(self, ticket_id: int) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        await self.session.execute(
            text(
                """
                UPDATE tickets
                SET status = 'resolved', resolved_at = :resolved_at
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": ticket_id, "workspace_id": self.workspace_id, "resolved_at": now},
        )
        await self.session.commit()
        return await self.get_ticket(ticket_id)

    async def close_ticket(self, ticket_id: int) -> dict[str, Any]:
        await self.session.execute(
            text(
                """
                UPDATE tickets SET status = 'closed'
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": ticket_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return await self.get_ticket(ticket_id)

    async def get_stats(self) -> dict[str, Any]:
        counts = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
                    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
                    COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
                    COUNT(*) AS total_count
                FROM tickets
                WHERE workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        c = counts.fetchone()
        m = c._mapping if c else {}

        rt = await self.session.execute(
            text(
                """
                SELECT AVG(
                    EXTRACT(EPOCH FROM (o.created_at - i.created_at)) / 60.0
                ) AS avg_minutes
                FROM tickets t
                JOIN ticket_messages i ON i.ticket_id = t.id AND i.direction = 'inbound'
                JOIN LATERAL (
                    SELECT created_at FROM ticket_messages
                    WHERE ticket_id = t.id AND direction = 'outbound'
                    ORDER BY created_at ASC LIMIT 1
                ) o ON TRUE
                WHERE t.workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        avg_row = rt.fetchone()
        avg_minutes = float(avg_row._mapping.get("avg_minutes") or 0) if avg_row else 0.0

        total = int(m.get("total_count") or 0)
        resolved = int(m.get("resolved_count") or 0) + int(m.get("closed_count") or 0)
        resolved_rate = round((resolved / total * 100), 2) if total > 0 else 0.0

        sla = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0 <= 24
                    ) AS within_sla,
                    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) AS resolved_with_time
                FROM tickets
                WHERE workspace_id = :workspace_id AND status IN ('resolved', 'closed')
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        sla_row = sla.fetchone()
        sla_m = sla_row._mapping if sla_row else {}
        resolved_with_time = int(sla_m.get("resolved_with_time") or 0)
        within_sla = int(sla_m.get("within_sla") or 0)
        sla_pct = round(within_sla / resolved_with_time * 100, 2) if resolved_with_time else 0.0

        return {
            "workspace_id": self.workspace_id,
            "open_count": int(m.get("open_count") or 0),
            "pending_count": int(m.get("pending_count") or 0),
            "resolved_count": int(m.get("resolved_count") or 0),
            "closed_count": int(m.get("closed_count") or 0),
            "total_count": total,
            "avg_first_response_minutes": round(avg_minutes, 2),
            "resolved_rate": resolved_rate,
            "sla_compliance_pct": sla_pct,
            "sla_target_hours": 24,
        }

    async def get_agents(self) -> list[dict[str, Any]]:
        """Agents with assigned ticket counts."""
        r = await self.session.execute(
            text(
                """
                SELECT assigned_to AS user_id,
                       COUNT(*) AS ticket_count,
                       COUNT(*) FILTER (WHERE status = 'open') AS open_count
                FROM tickets
                WHERE workspace_id = :workspace_id AND assigned_to IS NOT NULL
                GROUP BY assigned_to
                ORDER BY ticket_count DESC
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        return [
            {
                "user_id": row._mapping["user_id"],
                "ticket_count": int(row._mapping["ticket_count"]),
                "open_count": int(row._mapping["open_count"]),
            }
            for row in r.fetchall()
        ]

    async def get_categories(self) -> list[dict[str, Any]]:
        """Ticket counts grouped by channel (category proxy)."""
        r = await self.session.execute(
            text(
                """
                SELECT channel, COUNT(*) AS count
                FROM tickets
                WHERE workspace_id = :workspace_id
                GROUP BY channel
                ORDER BY count DESC
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        return [
            {"category": row._mapping["channel"], "count": int(row._mapping["count"])}
            for row in r.fetchall()
        ]


def get_helpdesk_service(session: AsyncSession, workspace_id: int) -> HelpdeskService:
    return HelpdeskService(session, workspace_id)


def default_helpdesk_workspace_id() -> int | None:
    raw = os.environ.get("HELPDESK_DEFAULT_WORKSPACE_ID", "").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None
