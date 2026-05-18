"""
Campaign Sender Service — Resolves recipients from contacts and sends emails in batch.
Tracks open/click metrics per campaign. Uses EmailService for actual delivery.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.campaigns import Campaigns
from models.contacts import Contacts
from services.email_service import EmailService

logger = logging.getLogger(__name__)


class CampaignSenderService:
    """Handles campaign sending logic: resolve recipients, send emails, track metrics."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService(db)

    def _normalize_segment_filters(self, segment_filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Normalize supported recipient filters to a stable shape."""
        raw = segment_filters or {}
        status = (raw.get("status") or "").strip()
        source = (raw.get("source") or "").strip()
        tags_raw = (raw.get("tags") or "").strip()

        score_min = raw.get("score_min")
        score_max = raw.get("score_max")

        def _to_int(v: Any) -> Optional[int]:
            if v is None or v == "":
                return None
            try:
                return int(v)
            except (TypeError, ValueError):
                raise ValueError("score filters must be integers")

        score_min_i = _to_int(score_min)
        score_max_i = _to_int(score_max)
        if score_min_i is not None and score_max_i is not None and score_min_i > score_max_i:
            raise ValueError("score_min cannot be greater than score_max")

        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
        return {
            "status": status or None,
            "source": source or None,
            "tags": tags,
            "score_min": score_min_i,
            "score_max": score_max_i,
        }

    def _build_contacts_query(
        self, user_id: str, workspace_id: int, normalized_filters: Optional[Dict[str, Any]] = None
    ):
        """Single source of truth for recipient resolution used by preview and send."""
        f = normalized_filters or {}
        q = select(Contacts).where(
            Contacts.user_id == user_id,
            Contacts.workspace_id == workspace_id,
            Contacts.email.isnot(None),
            Contacts.email != "",
        )

        if f.get("status"):
            q = q.where(Contacts.status.ilike(f["status"]))
        if f.get("source"):
            q = q.where(Contacts.source.ilike(f["source"]))
        if f.get("score_min") is not None:
            q = q.where(Contacts.score >= f["score_min"])
        if f.get("score_max") is not None:
            q = q.where(Contacts.score <= f["score_max"])
        if f.get("tags"):
            q = q.where(or_(*[Contacts.tags.ilike(f"%{tag}%") for tag in f["tags"]]))

        return q

    async def send_campaign(
        self,
        campaign_id: int,
        user_id: str,
        workspace_id: int,
        segment_filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send a campaign to all contacts belonging to the user.
        Updates campaign status and metrics.
        """
        # 1. Load campaign
        q = select(Campaigns).where(
            Campaigns.id == campaign_id,
            Campaigns.user_id == user_id,
            Campaigns.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found in this workspace")

        if campaign.status == "sending":
            raise ValueError("Campaign is already being sent")

        # 2. Mark as sending
        campaign.status = "sending"
        await self.db.commit()

        # 3. Resolve recipients — campaign segment in active workspace
        normalized_filters = self._normalize_segment_filters(segment_filters)
        contacts_q = self._build_contacts_query(user_id, workspace_id, normalized_filters)
        contacts_result = await self.db.execute(contacts_q)
        contacts = contacts_result.scalars().all()

        if not contacts:
            campaign.status = "failed"
            await self.db.commit()
            return {
                "campaign_id": campaign_id,
                "status": "failed",
                "error": "No contacts with email found",
                "sent_count": 0,
                "recipients_count": 0,
                "applied_filters": normalized_filters,
            }

        # 4. Build email content from campaign
        subject = campaign.subject or campaign.name or "Campaign"
        body_html = campaign.content or self._build_default_html(campaign)

        # 5. Send to each contact
        sent_count = 0
        failed_count = 0
        results: List[Dict[str, Any]] = []

        for contact in contacts:
            try:
                email_result = await self.email_service.send_email(
                    user_id=user_id,
                    to_email=contact.email,
                    to_name=f"{contact.first_name or ''} {contact.last_name or ''}".strip(),
                    subject=subject,
                    body_html=body_html,
                    email_type="campaign",
                    workspace_id=workspace_id,
                )
                if email_result["status"] in ("sent", "no_api_key", "pending"):
                    sent_count += 1
                else:
                    failed_count += 1
                results.append(email_result)
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to send to {contact.email}: {e}")
                results.append({"to": contact.email, "status": "error", "message": str(e)})

        # 6. Update campaign metrics
        campaign.status = "sent" if sent_count > 0 else "failed"
        campaign.recipients_count = len(contacts)
        campaign.sent_count = sent_count
        campaign.scheduled_at = datetime.now(timezone.utc)
        await self.db.commit()

        return {
            "campaign_id": campaign_id,
            "status": campaign.status,
            "recipients_count": len(contacts),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "sendgrid_configured": self.email_service.has_sendgrid,
            "applied_filters": normalized_filters,
            "results_summary": results[:5],  # First 5 for preview
        }

    async def get_campaign_stats(self, campaign_id: int, user_id: str, workspace_id: int) -> Dict[str, Any]:
        """Get detailed stats for a campaign."""
        q = select(Campaigns).where(
            Campaigns.id == campaign_id,
            Campaigns.user_id == user_id,
            Campaigns.workspace_id == workspace_id,
        )
        result = await self.db.execute(q)
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise ValueError("Campaign not found")

        recipients = campaign.recipients_count or 0
        sent = campaign.sent_count or 0
        opens = campaign.open_count or 0
        clicks = campaign.click_count or 0

        return {
            "campaign_id": campaign_id,
            "name": campaign.name,
            "status": campaign.status,
            "recipients_count": recipients,
            "sent_count": sent,
            "open_count": opens,
            "click_count": clicks,
            "open_rate": round((opens / sent * 100), 1) if sent > 0 else 0,
            "click_rate": round((clicks / sent * 100), 1) if sent > 0 else 0,
            "reply_count": campaign.reply_count or 0,
        }

    async def preview_recipients(
        self,
        user_id: str,
        workspace_id: int,
        segment_filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Preview how many contacts will receive the campaign."""
        normalized_filters = self._normalize_segment_filters(segment_filters)
        contacts_q = self._build_contacts_query(user_id, workspace_id, normalized_filters)

        count_q = select(func.count()).select_from(contacts_q.subquery())
        count = (await self.db.execute(count_q)).scalar() or 0

        # Get first 5 for preview using same filter logic as send.
        preview_q = contacts_q.limit(5)
        preview_result = await self.db.execute(preview_q)
        previews = preview_result.scalars().all()

        return {
            "total_recipients": count,
            "applied_filters": normalized_filters,
            "preview": [
                {
                    "name": f"{(c.first_name or '').strip()} {(c.last_name or '').strip()}".strip() or "—",
                    "email": c.email,
                    "status": c.status,
                    "source": c.source,
                    "tags": c.tags,
                    "score": c.score,
                }
                for c in previews
            ],
        }

    def _build_default_html(self, campaign: Campaigns) -> str:
        """Build a default HTML email from campaign data."""
        return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">{campaign.name or 'Campaign'}</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border-radius: 8px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    {campaign.content or 'Gracias por ser parte de nuestra comunidad. Tenemos novedades emocionantes para ti.'}
                </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <a href="https://nelvyon.com" style="background: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver más
                </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                Enviado con NELVYON · Si no deseas recibir más emails, responde a este correo.
            </p>
        </div>
        """