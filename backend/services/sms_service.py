"""NELVYON SMS Marketing — Twilio send, campaigns, opt-out, inbound replies."""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

TWILIO_API = "https://api.twilio.com/2010-04-01"
STOP_KEYWORDS = frozenset({"stop", "unsubscribe", "cancel", "end", "quit", "baja"})

_SCHEMA_READY = False


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


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        raise ValueError("Invalid phone number")
    return f"+{digits}"


class SmsService:
    """Workspace-scoped SMS via Twilio REST API."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
        self.from_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
        self._configured = bool(self.account_sid and self.auth_token and self.from_number)

    @property
    def is_configured(self) -> bool:
        return self._configured

    def _pending_auth(self, action: str = "send SMS") -> dict[str, Any]:
        return {
            "status": "pending_auth",
            "pending_auth": True,
            "mock": True,
            "message": (
                "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                f"and TWILIO_PHONE_NUMBER to {action}."
            ),
        }

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from pathlib import Path

        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "sms_campaigns.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _twilio_send(self, to_number: str, message: str) -> dict[str, Any]:
        if not self._configured:
            return self._pending_auth()

        to = _normalize_phone(to_number)
        url = f"{TWILIO_API}/Accounts/{self.account_sid}/Messages.json"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={"To": to, "From": self.from_number, "Body": message[:1600]},
            )
        if resp.status_code >= 400:
            detail = resp.text[:500]
            logger.warning("Twilio SMS failed HTTP %s: %s", resp.status_code, detail)
            return {"status": "failed", "error_message": detail, "twilio_sid": None}
        data = resp.json()
        return {
            "status": data.get("status", "queued"),
            "twilio_sid": data.get("sid"),
            "error_message": None,
        }

    async def check_optout(self, phone_number: str) -> bool:
        await self.ensure_schema()
        normalized = _normalize_phone(phone_number)
        result = await self.session.execute(
            text(
                """
                SELECT 1 FROM sms_optouts
                WHERE workspace_id = :ws AND (
                    phone_number = :phone OR phone_number = :digits
                )
                LIMIT 1
                """
            ),
            {"ws": self.workspace_id, "phone": normalized, "digits": re.sub(r"\D", "", phone_number)},
        )
        return result.fetchone() is not None

    async def opt_out(self, phone_number: str) -> dict[str, Any]:
        await self.ensure_schema()
        normalized = _normalize_phone(phone_number)
        await self.session.execute(
            text(
                """
                INSERT INTO sms_optouts (phone_number, workspace_id)
                VALUES (:phone, :ws)
                ON CONFLICT (phone_number, workspace_id) DO NOTHING
                """
            ),
            {"phone": normalized, "ws": self.workspace_id},
        )
        await self.session.commit()
        return {"opted_out": True, "phone_number": normalized}

    async def send_sms(
        self,
        to_number: str,
        message: str,
        *,
        campaign_id: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if await self.check_optout(to_number):
            return {"status": "opt_out", "skipped": True, "message": "Recipient opted out"}

        msg_id = str(uuid.uuid4())
        if not self._configured:
            pending = self._pending_auth()
            await self.session.execute(
                text(
                    """
                    INSERT INTO sms_messages (
                        id, campaign_id, workspace_id, to_number, message, status, error_message
                    )
                    VALUES (
                        CAST(:id AS uuid), CAST(:cid AS uuid), :ws, :to_number, :message,
                        'failed', :error
                    )
                    """
                ),
                {
                    "id": msg_id,
                    "cid": campaign_id,
                    "ws": self.workspace_id,
                    "to_number": to_number,
                    "message": message,
                    "error": pending["message"],
                },
            )
            await self.session.commit()
            return {**pending, "id": msg_id}

        result = await self._twilio_send(to_number, message)
        now = datetime.now(timezone.utc)
        status = "sent" if result.get("twilio_sid") else "failed"
        await self.session.execute(
            text(
                """
                INSERT INTO sms_messages (
                    id, campaign_id, workspace_id, to_number, message, status,
                    twilio_sid, sent_at, error_message
                )
                VALUES (
                    CAST(:id AS uuid), CAST(:cid AS uuid), :ws, :to_number, :message, :status,
                    :sid, :sent_at, :error
                )
                """
            ),
            {
                "id": msg_id,
                "cid": campaign_id,
                "ws": self.workspace_id,
                "to_number": _normalize_phone(to_number),
                "message": message,
                "status": status,
                "sid": result.get("twilio_sid"),
                "sent_at": now if status == "sent" else None,
                "error": result.get("error_message"),
            },
        )
        await self.session.commit()
        return {"id": msg_id, "status": status, **result}

    async def create_campaign(
        self,
        name: str,
        message: str,
        scheduled_at: datetime | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        status = "scheduled" if scheduled_at else "draft"
        if not self._configured:
            status = "pending_auth"
        result = await self.session.execute(
            text(
                """
                INSERT INTO sms_campaigns (
                    workspace_id, name, message, status, scheduled_at
                )
                VALUES (:ws, :name, :message, :status, :scheduled_at)
                RETURNING *
                """
            ),
            {
                "ws": self.workspace_id,
                "name": name.strip(),
                "message": message.strip(),
                "status": status,
                "scheduled_at": scheduled_at,
            },
        )
        row = _row(result.fetchone())
        await self.session.commit()
        return row

    async def list_campaigns(self, *, limit: int = 50, skip: int = 0) -> dict[str, Any]:
        await self.ensure_schema()
        total_r = await self.session.execute(
            text("SELECT COUNT(*) FROM sms_campaigns WHERE workspace_id = :ws"),
            {"ws": self.workspace_id},
        )
        total = int(total_r.scalar() or 0)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM sms_campaigns
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :skip
                """
            ),
            {"ws": self.workspace_id, "limit": limit, "skip": skip},
        )
        return {"items": [_row(r) for r in result.fetchall()], "total": total}

    async def get_campaign(self, campaign_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text(
                """
                SELECT * FROM sms_campaigns
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {"id": campaign_id, "ws": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Campaign not found")
        return _row(row)

    async def get_campaign_stats(self, campaign_id: str) -> dict[str, Any]:
        campaign = await self.get_campaign(campaign_id)
        return {
            "campaign_id": campaign_id,
            "sent_count": campaign.get("sent_count", 0),
            "delivered_count": campaign.get("delivered_count", 0),
            "failed_count": campaign.get("failed_count", 0),
            "reply_count": campaign.get("reply_count", 0),
            "status": campaign.get("status"),
        }

    async def _resolve_contact_phones(self, contact_ids: list[str]) -> list[str]:
        if not contact_ids:
            return []
        phones: list[str] = []
        for cid in contact_ids:
            result = await self.session.execute(
                text(
                    """
                    SELECT phone FROM crm_contacts
                    WHERE id = CAST(:id AS uuid) AND workspace_id = :ws AND phone IS NOT NULL
                    """
                ),
                {"id": cid, "ws": self.workspace_id},
            )
            row = result.fetchone()
            if row and row._mapping.get("phone"):
                phones.append(str(row._mapping["phone"]))
        return phones

    async def send_campaign(
        self,
        campaign_id: str,
        contact_ids: list[str],
    ) -> dict[str, Any]:
        await self.ensure_schema()
        campaign = await self.get_campaign(campaign_id)
        if not self._configured:
            await self.session.execute(
                text(
                    """
                    UPDATE sms_campaigns SET status = 'pending_auth'
                    WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                    """
                ),
                {"id": campaign_id, "ws": self.workspace_id},
            )
            await self.session.commit()
            return self._pending_auth("send SMS campaigns")

        message = str(campaign.get("message") or "")
        phones = await self._resolve_contact_phones(contact_ids)
        if not phones:
            raise ValueError("No valid contact phone numbers found")

        await self.session.execute(
            text(
                """
                UPDATE sms_campaigns SET status = 'sending'
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {"id": campaign_id, "ws": self.workspace_id},
        )

        sent = failed = 0
        for phone in phones:
            if await self.check_optout(phone):
                failed += 1
                continue
            r = await self.send_sms(phone, message, campaign_id=campaign_id)
            if r.get("status") in ("sent", "queued", "delivered"):
                sent += 1
            else:
                failed += 1

        final_status = "sent"
        await self.session.execute(
            text(
                """
                UPDATE sms_campaigns
                SET status = :status,
                    sent_count = sent_count + :sent,
                    failed_count = failed_count + :failed
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                """
            ),
            {"id": campaign_id, "ws": self.workspace_id, "status": final_status, "sent": sent, "failed": failed},
        )
        await self.session.commit()
        return {"campaign_id": campaign_id, "sent": sent, "failed": failed, "status": final_status}

    async def handle_reply(
        self,
        from_number: str,
        message: str,
        *,
        twilio_sid: str | None = None,
        workspace_id: int | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        body = (message or "").strip()
        normalized = _normalize_phone(from_number)

        if body.lower() in STOP_KEYWORDS:
            svc = SmsService(self.session, ws)
            await svc.opt_out(normalized)
            return {"handled": True, "opt_out": True}

        # Match recent outbound message for reply attribution
        match = await self.session.execute(
            text(
                """
                SELECT campaign_id FROM sms_messages
                WHERE workspace_id = :ws AND to_number = :phone
                  AND status IN ('sent', 'delivered')
                ORDER BY sent_at DESC NULLS LAST
                LIMIT 1
                """
            ),
            {"ws": ws, "phone": normalized},
        )
        match_row = match.fetchone()
        campaign_id = str(match_row._mapping["campaign_id"]) if match_row and match_row._mapping.get("campaign_id") else None

        await self.session.execute(
            text(
                """
                INSERT INTO sms_conversations (
                    workspace_id, from_number, message, twilio_sid, campaign_id
                )
                VALUES (:ws, :from_number, :message, :sid, CAST(:cid AS uuid))
                """
            ),
            {
                "ws": ws,
                "from_number": normalized,
                "message": body,
                "sid": twilio_sid,
                "cid": campaign_id,
            },
        )
        if campaign_id:
            await self.session.execute(
                text(
                    """
                    UPDATE sms_campaigns SET reply_count = reply_count + 1
                    WHERE id = CAST(:id AS uuid) AND workspace_id = :ws
                    """
                ),
                {"id": campaign_id, "ws": ws},
            )
        await self.session.commit()

        try:
            from services.omnichannel_service import ingest_omnichannel_inbound

            await ingest_omnichannel_inbound(
                self.session,
                ws,
                "sms",
                body,
                participant_phone=normalized,
                metadata={"twilio_sid": twilio_sid, "campaign_id": campaign_id},
            )
        except Exception as exc:
            logger.debug("omnichannel sms ingest skipped: %s", exc)

        return {"handled": True, "from_number": normalized, "campaign_id": campaign_id}

    async def get_global_stats(self) -> dict[str, Any]:
        await self.ensure_schema()
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        sent_r = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM sms_messages
                WHERE workspace_id = :ws AND status IN ('sent', 'delivered')
                  AND COALESCE(sent_at, created_at) >= :month_start
                """
            ),
            {"ws": self.workspace_id, "month_start": month_start},
        )
        delivered_r = await self.session.execute(
            text(
                """
                SELECT COUNT(*) FROM sms_messages
                WHERE workspace_id = :ws AND status = 'delivered'
                  AND COALESCE(delivered_at, sent_at, created_at) >= :month_start
                """
            ),
            {"ws": self.workspace_id, "month_start": month_start},
        )
        optout_r = await self.session.execute(
            text("SELECT COUNT(*) FROM sms_optouts WHERE workspace_id = :ws"),
            {"ws": self.workspace_id},
        )
        sent = int(sent_r.scalar() or 0)
        delivered = int(delivered_r.scalar() or 0)
        optouts = int(optout_r.scalar() or 0)
        rate = round((delivered / sent) * 100, 1) if sent else 0.0
        return {
            "sent_this_month": sent,
            "delivered_this_month": delivered,
            "delivery_rate": rate,
            "opt_outs": optouts,
            "twilio_configured": self._configured,
        }


def get_sms_service(session: AsyncSession, workspace_id: int) -> SmsService:
    return SmsService(session, workspace_id)
