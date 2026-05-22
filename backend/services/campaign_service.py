"""NELVYON campaigns — scheduler, batch send (SES / WhatsApp), deliverability tracking."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sentry_utils import capture_exception
from services.ses_service import BULK_BATCH_SIZE, get_ses_service
from services.whatsapp_service import get_whatsapp_service

logger = logging.getLogger(__name__)

CAMPAIGN_TYPES = frozenset({"email", "whatsapp", "sms"})
CAMPAIGN_STATUSES = frozenset({"draft", "scheduled", "running", "paused", "completed"})
RECIPIENT_STATUSES = frozenset({"pending", "sent", "failed", "bounced", "opened", "clicked"})

TRACKING_PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00"
    b",\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, datetime):
            data[key] = val.isoformat()
    return data


def _backend_base_url() -> str:
    base = os.environ.get("PYTHON_BACKEND_URL", "").strip().rstrip("/")
    if not base:
        base = "http://127.0.0.1:8000"
    return base


class CampaignService:
    """Workspace-scoped campaign operations on `campaigns` + `campaign_recipients`."""

    def __init__(self, session: AsyncSession, workspace_id: int, user_id: str | None = None):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self.user_id = user_id or "system"

    async def create_campaign(self, data: dict[str, Any]) -> dict[str, Any]:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("name is required")
        ctype = (data.get("type") or "email").strip().lower()
        if ctype not in CAMPAIGN_TYPES:
            raise ValueError(f"type must be one of: {', '.join(sorted(CAMPAIGN_TYPES))}")

        status = (data.get("status") or "draft").strip().lower()
        if status not in CAMPAIGN_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(CAMPAIGN_STATUSES))}")

        result = await self.session.execute(
            text(
                """
                INSERT INTO campaigns (
                    user_id, workspace_id, name, type, status, subject, content,
                    from_name, from_email, scheduled_at, sent_count, open_count, click_count, created_at
                )
                VALUES (
                    :user_id, :workspace_id, :name, :type, :status, :subject, :content,
                    :from_name, :from_email, :scheduled_at, 0, 0, 0, :created_at
                )
                RETURNING *
                """
            ),
            {
                "user_id": self.user_id,
                "workspace_id": self.workspace_id,
                "name": name,
                "type": ctype,
                "status": status,
                "subject": data.get("subject"),
                "content": data.get("content"),
                "from_name": data.get("from_name"),
                "from_email": data.get("from_email"),
                "scheduled_at": data.get("scheduled_at"),
                "created_at": datetime.now(timezone.utc),
            },
        )
        campaign = _row_to_dict(result.fetchone())
        contact_ids = data.get("contact_ids") or []
        if contact_ids:
            await self._add_recipients_for_contacts(int(campaign["id"]), contact_ids)
        await self.session.commit()
        return await self.get_campaign(int(campaign["id"]))

    async def update_campaign(self, campaign_id: int, data: dict[str, Any]) -> dict[str, Any]:
        campaign = await self._get_campaign_row(campaign_id)
        if campaign.get("status") in ("running",):
            raise ValueError("Cannot update a campaign while it is running")

        allowed = {
            "name",
            "type",
            "status",
            "subject",
            "content",
            "from_name",
            "from_email",
            "scheduled_at",
        }
        sets: list[str] = []
        params: dict[str, Any] = {"id": campaign_id, "workspace_id": self.workspace_id}
        for key, val in data.items():
            if key not in allowed or val is None:
                continue
            if key == "type":
                val = str(val).strip().lower()
                if val not in CAMPAIGN_TYPES:
                    raise ValueError(f"type must be one of: {', '.join(sorted(CAMPAIGN_TYPES))}")
            if key == "status":
                val = str(val).strip().lower()
                if val not in CAMPAIGN_STATUSES:
                    raise ValueError(f"status must be one of: {', '.join(sorted(CAMPAIGN_STATUSES))}")
            sets.append(f"{key} = :{key}")
            params[key] = val

        if not sets:
            return _row_to_dict(campaign)

        await self.session.execute(
            text(f"UPDATE campaigns SET {', '.join(sets)} WHERE id = :id AND workspace_id = :workspace_id"),
            params,
        )
        await self.session.commit()
        return await self.get_campaign(campaign_id)

    async def schedule_campaign(self, campaign_id: int, scheduled_at: datetime) -> dict[str, Any]:
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        await self.session.execute(
            text(
                """
                UPDATE campaigns
                SET status = 'scheduled', scheduled_at = :scheduled_at
                WHERE id = :id AND workspace_id = :workspace_id
                  AND status IN ('draft', 'paused')
                """
            ),
            {"id": campaign_id, "workspace_id": self.workspace_id, "scheduled_at": scheduled_at},
        )
        await self.session.commit()
        return await self.get_campaign(campaign_id)

    async def pause_campaign(self, campaign_id: int) -> dict[str, Any]:
        await self.session.execute(
            text(
                """
                UPDATE campaigns SET status = 'paused'
                WHERE id = :id AND workspace_id = :workspace_id
                  AND status IN ('scheduled', 'running')
                """
            ),
            {"id": campaign_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return await self.get_campaign(campaign_id)

    async def cancel_campaign(self, campaign_id: int) -> dict[str, Any]:
        await self.session.execute(
            text(
                """
                UPDATE campaigns
                SET status = 'draft', scheduled_at = NULL
                WHERE id = :id AND workspace_id = :workspace_id
                  AND status IN ('scheduled', 'paused', 'draft')
                """
            ),
            {"id": campaign_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return await self.get_campaign(campaign_id)

    async def get_campaign(self, campaign_id: int) -> dict[str, Any]:
        row = await self._get_campaign_row(campaign_id)
        out = _row_to_dict(row)
        out["recipients"] = await self._list_recipients(campaign_id)
        return out

    async def list_campaigns(self, skip: int = 0, limit: int = 20) -> dict[str, Any]:
        count_r = await self.session.execute(
            text("SELECT COUNT(*) FROM campaigns WHERE workspace_id = :workspace_id"),
            {"workspace_id": self.workspace_id},
        )
        total = int(count_r.scalar() or 0)
        result = await self.session.execute(
            text(
                """
                SELECT * FROM campaigns
                WHERE workspace_id = :workspace_id
                ORDER BY id DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            {"workspace_id": self.workspace_id, "skip": skip, "limit": limit},
        )
        items = [_row_to_dict(r) for r in result.fetchall()]
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def delete_campaign(self, campaign_id: int) -> bool:
        await self._get_campaign_row(campaign_id)
        await self.session.execute(
            text("DELETE FROM campaign_recipients WHERE campaign_id = :id"),
            {"id": campaign_id},
        )
        result = await self.session.execute(
            text("DELETE FROM campaigns WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": campaign_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return (result.rowcount or 0) > 0

    async def send_campaign(self, campaign_id: int) -> dict[str, Any]:
        campaign = await self._get_campaign_row(campaign_id)
        status = (campaign.get("status") or "").lower()
        if status == "paused":
            raise ValueError("Campaign is paused")
        if status == "completed":
            raise ValueError("Campaign already completed")

        await self.session.execute(
            text(
                "UPDATE campaigns SET status = 'running' WHERE id = :id AND workspace_id = :workspace_id"
            ),
            {"id": campaign_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()

        await self._ensure_recipients(campaign_id)
        recipients = await self._pending_recipients(campaign_id)
        ctype = (campaign.get("type") or "email").lower()
        sent_total = 0
        failed_total = 0

        for offset in range(0, len(recipients), BULK_BATCH_SIZE):
            batch = recipients[offset : offset + BULK_BATCH_SIZE]
            if ctype == "email":
                batch_sent, batch_failed = await self._send_email_batch(campaign, batch)
            elif ctype in ("whatsapp", "sms"):
                batch_sent, batch_failed = await self._send_whatsapp_batch(campaign, batch)
            else:
                raise ValueError(f"Unsupported campaign type: {ctype}")
            sent_total += batch_sent
            failed_total += batch_failed

        final_status = "completed" if sent_total > 0 else "draft"
        await self.session.execute(
            text(
                """
                UPDATE campaigns
                SET status = :status,
                    sent_count = COALESCE(sent_count, 0) + :sent,
                    recipients_count = :recipients_count
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {
                "id": campaign_id,
                "workspace_id": self.workspace_id,
                "status": final_status,
                "sent": sent_total,
                "recipients_count": len(recipients),
            },
        )
        await self.session.commit()

        return {
            "campaign_id": campaign_id,
            "status": final_status,
            "recipients_count": len(recipients),
            "sent_count": sent_total,
            "failed_count": failed_total,
        }

    async def process_scheduled_campaigns(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id FROM campaigns
                WHERE status = 'scheduled'
                  AND scheduled_at IS NOT NULL
                  AND scheduled_at <= :now
                ORDER BY scheduled_at ASC
                LIMIT 50
                """
            ),
            {"now": now},
        )
        rows = result.fetchall()
        processed: list[dict[str, Any]] = []
        for row in rows:
            cid = int(row._mapping["id"])
            ws = int(row._mapping["workspace_id"])
            svc = CampaignService(self.session, ws)
            try:
                outcome = await svc.send_campaign(cid)
                processed.append({"campaign_id": cid, "ok": True, **outcome})
            except Exception as exc:
                capture_exception(exc, service="campaign", method="process_scheduled_campaigns")
                logger.exception("Scheduled campaign %s failed: %s", cid, exc)
                processed.append({"campaign_id": cid, "ok": False, "error": str(exc)})
        return {"processed": len(processed), "results": processed}

    async def track_open(self, campaign_id: int, recipient_id: int) -> None:
        now = datetime.now(timezone.utc)
        prior = await self.session.execute(
            text(
                """
                SELECT opened_at FROM campaign_recipients
                WHERE id = :recipient_id AND campaign_id = :campaign_id
                """
            ),
            {"recipient_id": recipient_id, "campaign_id": campaign_id},
        )
        row = prior.fetchone()
        if not row:
            return
        first_open = row._mapping.get("opened_at") is None

        await self.session.execute(
            text(
                """
                UPDATE campaign_recipients
                SET status = 'opened', opened_at = COALESCE(opened_at, :now)
                WHERE id = :recipient_id AND campaign_id = :campaign_id
                  AND status IN ('sent', 'opened', 'clicked')
                """
            ),
            {"recipient_id": recipient_id, "campaign_id": campaign_id, "now": now},
        )
        if first_open:
            await self.session.execute(
                text(
                    "UPDATE campaigns SET open_count = COALESCE(open_count, 0) + 1 WHERE id = :campaign_id"
                ),
                {"campaign_id": campaign_id},
            )
        await self.session.commit()

    async def track_click(self, campaign_id: int, recipient_id: int) -> None:
        now = datetime.now(timezone.utc)
        prior = await self.session.execute(
            text(
                """
                SELECT clicked_at, opened_at FROM campaign_recipients
                WHERE id = :recipient_id AND campaign_id = :campaign_id
                """
            ),
            {"recipient_id": recipient_id, "campaign_id": campaign_id},
        )
        row = prior.fetchone()
        if not row:
            return
        first_click = row._mapping.get("clicked_at") is None
        first_open = row._mapping.get("opened_at") is None

        await self.session.execute(
            text(
                """
                UPDATE campaign_recipients
                SET status = 'clicked',
                    clicked_at = COALESCE(clicked_at, :now),
                    opened_at = COALESCE(opened_at, :now)
                WHERE id = :recipient_id AND campaign_id = :campaign_id
                  AND status IN ('sent', 'opened', 'clicked')
                """
            ),
            {"recipient_id": recipient_id, "campaign_id": campaign_id, "now": now},
        )
        if first_click:
            await self.session.execute(
                text(
                    "UPDATE campaigns SET click_count = COALESCE(click_count, 0) + 1 WHERE id = :campaign_id"
                ),
                {"campaign_id": campaign_id},
            )
        if first_open:
            await self.session.execute(
                text(
                    "UPDATE campaigns SET open_count = COALESCE(open_count, 0) + 1 WHERE id = :campaign_id"
                ),
                {"campaign_id": campaign_id},
            )
        await self.session.commit()

    async def get_stats(self, campaign_id: int) -> dict[str, Any]:
        campaign = await self._get_campaign_row(campaign_id)
        counts = await self.session.execute(
            text(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'sent') AS sent_only,
                    COUNT(*) FILTER (WHERE status IN ('sent','opened','clicked')) AS delivered,
                    COUNT(*) FILTER (WHERE status = 'opened') AS opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') AS clicked,
                    COUNT(*) FILTER (WHERE status = 'bounced') AS bounced,
                    COUNT(*) FILTER (WHERE status = 'failed') AS failed
                FROM campaign_recipients
                WHERE campaign_id = :campaign_id
                """
            ),
            {"campaign_id": campaign_id},
        )
        c = counts.fetchone()
        total = int(c.total or 0) if c else 0
        delivered = int(c.delivered or 0) if c else 0
        opened = int(c.opened or 0) if c else 0
        clicked = int(c.clicked or 0) if c else 0
        bounced = int(c.bounced or 0) if c else 0
        sent = int(campaign.get("sent_count") or 0) or delivered

        return {
            "campaign_id": campaign_id,
            "name": campaign.get("name"),
            "status": campaign.get("status"),
            "sent_count": sent,
            "open_count": int(campaign.get("open_count") or 0),
            "click_count": int(campaign.get("click_count") or 0),
            "recipients_total": total,
            "open_rate": round((opened / sent * 100), 2) if sent > 0 else 0.0,
            "click_rate": round((clicked / sent * 100), 2) if sent > 0 else 0.0,
            "bounce_rate": round((bounced / sent * 100), 2) if sent > 0 else 0.0,
            "failed_count": int(c.failed or 0) if c else 0,
        }

    # ─── internal ───────────────────────────────────────────────────────────

    async def _get_campaign_row(self, campaign_id: int) -> Any:
        result = await self.session.execute(
            text("SELECT * FROM campaigns WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": campaign_id, "workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Campaign not found")
        return row

    async def _list_recipients(self, campaign_id: int) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                "SELECT * FROM campaign_recipients WHERE campaign_id = :id ORDER BY id ASC"
            ),
            {"id": campaign_id},
        )
        return [_row_to_dict(r) for r in result.fetchall()]

    async def _pending_recipients(self, campaign_id: int) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM campaign_recipients
                WHERE campaign_id = :id AND status = 'pending'
                ORDER BY id ASC
                """
            ),
            {"id": campaign_id},
        )
        return [_row_to_dict(r) for r in result.fetchall()]

    async def _ensure_recipients(self, campaign_id: int) -> None:
        count_r = await self.session.execute(
            text("SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = :id"),
            {"id": campaign_id},
        )
        if int(count_r.scalar() or 0) > 0:
            return
        contacts = await self.session.execute(
            text(
                """
                SELECT id, email, phone FROM contacts
                WHERE workspace_id = :workspace_id
                  AND (
                    (email IS NOT NULL AND email != '')
                    OR (phone IS NOT NULL AND phone != '')
                  )
                ORDER BY id ASC
                LIMIT 5000
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        for row in contacts.fetchall():
            m = row._mapping
            await self.session.execute(
                text(
                    """
                    INSERT INTO campaign_recipients (campaign_id, contact_id, email, phone, status)
                    VALUES (:campaign_id, :contact_id, :email, :phone, 'pending')
                    """
                ),
                {
                    "campaign_id": campaign_id,
                    "contact_id": m.get("id"),
                    "email": m.get("email"),
                    "phone": m.get("phone"),
                },
            )
        await self.session.commit()

    async def _add_recipients_for_contacts(self, campaign_id: int, contact_ids: list[int]) -> None:
        for cid in contact_ids:
            try:
                contact_id = int(cid)
            except (TypeError, ValueError):
                continue
            r = await self.session.execute(
                text(
                    """
                    SELECT id, email, phone FROM contacts
                    WHERE id = :id AND workspace_id = :workspace_id
                    """
                ),
                {"id": contact_id, "workspace_id": self.workspace_id},
            )
            row = r.fetchone()
            if not row:
                continue
            m = row._mapping
            await self.session.execute(
                text(
                    """
                    INSERT INTO campaign_recipients (campaign_id, contact_id, email, phone, status)
                    VALUES (:campaign_id, :contact_id, :email, :phone, 'pending')
                    """
                ),
                {
                    "campaign_id": campaign_id,
                    "contact_id": contact_id,
                    "email": m.get("email"),
                    "phone": m.get("phone"),
                },
            )

    def _inject_tracking(self, html: str, campaign_id: int, recipient_id: int) -> str:
        base = _backend_base_url()
        pixel = (
            f'<img src="{base}/api/campaigns/track/open/{campaign_id}/{recipient_id}" '
            'width="1" height="1" alt="" style="display:none" />'
        )
        if "</body>" in html.lower():
            return re.sub(r"</body>", f"{pixel}</body>", html, count=1, flags=re.IGNORECASE)
        return html + pixel

    def _wrap_links_for_tracking(self, html: str, campaign_id: int, recipient_id: int) -> str:
        base = _backend_base_url()

        def repl(match: re.Match[str]) -> str:
            url = match.group(1)
            if "/api/campaigns/track/" in url:
                return match.group(0)
            tracked = (
                f"{base}/api/campaigns/track/click/{campaign_id}/{recipient_id}"
                f"?url={quote(url, safe='')}"
            )
            return f'href="{tracked}"'

        return re.sub(r'href="([^"]+)"', repl, html)

    async def _send_email_batch(self, campaign: Any, batch: list[dict[str, Any]]) -> tuple[int, int]:
        ses = get_ses_service()
        subject = (campaign.get("subject") or campaign.get("name") or "Campaign").strip()
        body_base = campaign.get("content") or "<p>Hola desde NELVYON</p>"
        from_email = campaign.get("from_email")
        sent = 0
        failed = 0
        now = datetime.now(timezone.utc)

        for rec in batch:
            rid = int(rec["id"])
            cid = int(rec["campaign_id"])
            to = (rec.get("email") or "").strip()
            if not to:
                await self._mark_recipient(rid, "failed", now)
                failed += 1
                continue
            html = self._inject_tracking(
                self._wrap_links_for_tracking(body_base, cid, rid), cid, rid
            )
            try:
                result = await ses.send_email(to, subject, html, from_email=from_email)
                status = "sent" if result.get("message_id") else "failed"
                await self._mark_recipient(rid, status, now)
                if status == "sent":
                    sent += 1
                else:
                    failed += 1
            except Exception as exc:
                capture_exception(exc, service="campaign", method="_send_email_batch", to=to)
                logger.warning("Campaign email to %s failed: %s", to, exc)
                await self._mark_recipient(rid, "failed", now)
                failed += 1

        return sent, failed

    async def _send_whatsapp_batch(self, campaign: Any, batch: list[dict[str, Any]]) -> tuple[int, int]:
        wa = get_whatsapp_service()
        message = (campaign.get("content") or campaign.get("subject") or campaign.get("name") or "").strip()
        if not message:
            message = "Mensaje de campaña NELVYON"
        sent = 0
        failed = 0
        now = datetime.now(timezone.utc)

        for rec in batch:
            rid = int(rec["id"])
            phone = (rec.get("phone") or "").strip()
            if not phone:
                await self._mark_recipient(rid, "failed", now)
                failed += 1
                continue
            try:
                result = await wa.send_message(phone, message)
                status = "sent" if result.get("message_id") else "failed"
                await self._mark_recipient(rid, status, now)
                if status == "sent":
                    sent += 1
                else:
                    failed += 1
            except Exception as exc:
                capture_exception(exc, service="campaign", method="_send_whatsapp_batch", phone=phone)
                logger.warning("Campaign WhatsApp to %s failed: %s", phone, exc)
                await self._mark_recipient(rid, "failed", now)
                failed += 1

        return sent, failed

    async def _mark_recipient(self, recipient_id: int, status: str, now: datetime) -> None:
        await self.session.execute(
            text(
                """
                UPDATE campaign_recipients
                SET status = :status, sent_at = COALESCE(sent_at, :now)
                WHERE id = :id
                """
            ),
            {"id": recipient_id, "status": status, "now": now},
        )
