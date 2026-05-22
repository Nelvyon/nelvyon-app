"""NELVYON GDPR — export, deletion, consent, anonymization."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_GDPR_SCHEMA_READY = False
_ANON_EMAIL_DOMAIN = "anonymized.nelvyon.local"


def _json_default(obj: Any) -> str:
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


def _rows_to_list(rows: Any) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in rows]


class GDPRService:
    """Workspace-scoped GDPR operations."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    async def ensure_schema() -> None:
        global _GDPR_SCHEMA_READY
        if _GDPR_SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "gdpr.sql"
        if not sql_path.exists():
            logger.warning("gdpr.sql not found at %s", sql_path)
            return
        raw = sql_path.read_text(encoding="utf-8")
        statements = [s.strip() for s in raw.split(";") if s.strip()]
        async with db_manager.async_session_maker() as session:
            for stmt in statements:
                try:
                    await session.execute(text(stmt))
                except Exception as exc:
                    if "already exists" not in str(exc).lower():
                        logger.debug("GDPR schema stmt skipped: %s", exc)
            await session.commit()
        _GDPR_SCHEMA_READY = True

    async def _resolve_subject_email(self, user_id: str) -> str | None:
        r = await self.session.execute(
            text("SELECT email FROM users WHERE id = :uid LIMIT 1"),
            {"uid": user_id},
        )
        row = r.fetchone()
        if row and row._mapping.get("email"):
            return str(row._mapping["email"]).strip().lower()
        return None

    async def export_user_data(self, user_id: str) -> dict[str, Any]:
        """Export all workspace data linked to a user (by id and email)."""
        await self.ensure_schema()
        email = await self._resolve_subject_email(user_id)
        exported_at = datetime.now(timezone.utc).isoformat()

        legacy_contacts = await self._fetch_legacy_contacts(user_id, email)
        crm_contacts = await self._fetch_crm_contacts(email)
        contact_ids_legacy = [c["id"] for c in legacy_contacts]
        crm_ids = [c["id"] for c in crm_contacts]

        deals = await self._fetch_crm_deals(crm_ids)
        activities = await self._fetch_crm_activities(crm_ids)
        campaigns = await self._fetch_campaigns()
        campaign_recipients = await self._fetch_campaign_recipients(email)
        invoices = await self._fetch_invoices(email)
        bookings = await self._fetch_bookings(email)
        tickets = await self._fetch_tickets(contact_ids_legacy, email)
        consents = await self._fetch_consents_for_subject(user_id, crm_ids, contact_ids_legacy)
        members = await self._fetch_workspace_members(user_id)
        settings = await self._fetch_user_settings(user_id)

        return {
            "exported_at": exported_at,
            "workspace_id": self.workspace_id,
            "user_id": user_id,
            "email": email,
            "user": await self._fetch_user_profile(user_id),
            "legacy_contacts": legacy_contacts,
            "crm_contacts": crm_contacts,
            "crm_deals": deals,
            "crm_activities": activities,
            "campaigns": campaigns,
            "campaign_recipients": campaign_recipients,
            "invoices": invoices,
            "bookings": bookings,
            "tickets": tickets,
            "consent_records": consents,
            "workspace_members": members,
            "nelvyon_user_settings": settings,
        }

    async def delete_user_data(self, user_id: str) -> dict[str, Any]:
        """Right to be forgotten — delete/anonymize PII and record the request."""
        await self.ensure_schema()
        subject_key = str(user_id)
        req_id = str(uuid.uuid4())

        await self.session.execute(
            text(
                """
                INSERT INTO data_deletion_requests (
                    id, workspace_id, contact_id, status, requested_at
                )
                VALUES (
                    :id, :workspace_id, :contact_id, 'processing', NOW()
                )
                """
            ),
            {
                "id": req_id,
                "workspace_id": self.workspace_id,
                "contact_id": subject_key,
            },
        )

        email = await self._resolve_subject_email(user_id)
        legacy = await self._fetch_legacy_contacts(user_id, email)
        for row in legacy:
            await self._delete_legacy_contact(int(row["id"]))

        crm = await self._fetch_crm_contacts(email)
        for row in crm:
            await self.anonymize_contact(str(row["id"]))

        if email:
            await self._purge_by_email(email)

        await self.session.execute(
            text(
                """
                UPDATE data_deletion_requests
                SET status = 'completed', completed_at = NOW()
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": req_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()

        return {
            "request_id": req_id,
            "status": "completed",
            "user_id": user_id,
            "workspace_id": self.workspace_id,
        }

    async def anonymize_contact(self, contact_id: str) -> dict[str, Any]:
        """Replace PII on a CRM contact while keeping aggregate metrics."""
        anon_id = str(uuid.uuid4())[:8]
        anon_email = f"anon-{anon_id}@{_ANON_EMAIL_DOMAIN}"
        anon_name = f"Anonymized Contact {anon_id}"

        r = await self.session.execute(
            text(
                """
                UPDATE crm_contacts
                SET name = :name,
                    email = :email,
                    phone = NULL,
                    company = NULL,
                    metadata = '{}'::jsonb,
                    updated_at = NOW()
                WHERE id = :id::uuid AND workspace_id = :workspace_id
                RETURNING id, score, status, created_at
                """
            ),
            {
                "id": contact_id,
                "workspace_id": self.workspace_id,
                "name": anon_name,
                "email": anon_email,
            },
        )
        row = r.fetchone()
        if not row:
            raise ValueError("Contact not found")

        await self.session.execute(
            text(
                """
                UPDATE crm_deals
                SET notes = NULL, updated_at = NOW()
                WHERE contact_id = :id::uuid AND workspace_id = :workspace_id
                """
            ),
            {"id": contact_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return dict(row._mapping)

    async def record_consent(
        self,
        contact_id: str,
        consent_type: str,
        granted: bool,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                INSERT INTO consent_records (
                    workspace_id, contact_id, consent_type, granted,
                    ip_address, user_agent
                )
                VALUES (
                    :workspace_id, :contact_id, :consent_type, :granted,
                    :ip_address, :user_agent
                )
                RETURNING id, workspace_id, contact_id, consent_type, granted,
                          ip_address, user_agent, created_at
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "contact_id": str(contact_id),
                "consent_type": consent_type,
                "granted": granted,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )
        await self.session.commit()
        row = r.fetchone()
        return dict(row._mapping) if row else {}

    async def get_consent(self, contact_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT consent_type, granted, ip_address, user_agent, created_at
                FROM consent_records
                WHERE workspace_id = :workspace_id AND contact_id = :contact_id
                ORDER BY created_at DESC
                """
            ),
            {"workspace_id": self.workspace_id, "contact_id": str(contact_id)},
        )
        rows = _rows_to_list(r)
        latest: dict[str, Any] = {}
        for row in rows:
            ctype = row.get("consent_type")
            if ctype and ctype not in latest:
                latest[ctype] = {
                    "granted": row.get("granted"),
                    "recorded_at": row.get("created_at"),
                    "ip_address": row.get("ip_address"),
                }
        return {
            "contact_id": str(contact_id),
            "workspace_id": self.workspace_id,
            "consents": latest,
            "history_count": len(rows),
        }

    async def get_pending_deletions(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, contact_id, status, requested_at, completed_at
                FROM data_deletion_requests
                WHERE status = 'pending'
                ORDER BY requested_at ASC
                """
            ),
        )
        return _rows_to_list(r)

    # ─── Private fetch helpers ───────────────────────────────────────────────

    async def _fetch_user_profile(self, user_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                "SELECT id, email, name, role, created_at, last_login FROM users WHERE id = :uid"
            ),
            {"uid": user_id},
        )
        row = r.fetchone()
        return dict(row._mapping) if row else None

    async def _fetch_legacy_contacts(
        self, user_id: str, email: str | None
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "workspace_id": self.workspace_id,
            "user_id": user_id,
        }
        if email:
            q = """
                SELECT * FROM contacts
                WHERE workspace_id = :workspace_id
                  AND (user_id = :user_id OR lower(email) = :email)
            """
            params["email"] = email
        else:
            q = """
                SELECT * FROM contacts
                WHERE workspace_id = :workspace_id AND user_id = :user_id
            """
        try:
            r = await self.session.execute(text(q), params)
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_crm_contacts(self, email: str | None) -> list[dict[str, Any]]:
        if not email:
            return []
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT * FROM crm_contacts
                    WHERE workspace_id = :workspace_id AND lower(email) = :email
                    """
                ),
                {"workspace_id": self.workspace_id, "email": email},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_crm_deals(self, contact_ids: list[str]) -> list[dict[str, Any]]:
        if not contact_ids:
            return []
        r = await self.session.execute(
            text(
                """
                SELECT * FROM crm_deals
                WHERE workspace_id = :workspace_id
                  AND contact_id::text = ANY(:ids)
                """
            ),
            {"workspace_id": self.workspace_id, "ids": contact_ids},
        )
        return _rows_to_list(r)

    async def _fetch_crm_activities(self, contact_ids: list[str]) -> list[dict[str, Any]]:
        if not contact_ids:
            return []
        r = await self.session.execute(
            text(
                """
                SELECT * FROM crm_activities
                WHERE workspace_id = :workspace_id
                  AND contact_id::text = ANY(:ids)
                """
            ),
            {"workspace_id": self.workspace_id, "ids": contact_ids},
        )
        return _rows_to_list(r)

    async def _fetch_campaigns(self) -> list[dict[str, Any]]:
        try:
            r = await self.session.execute(
                text(
                    "SELECT * FROM campaigns WHERE workspace_id = :workspace_id LIMIT 500"
                ),
                {"workspace_id": self.workspace_id},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_campaign_recipients(self, email: str | None) -> list[dict[str, Any]]:
        if not email:
            return []
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT cr.* FROM campaign_recipients cr
                    JOIN campaigns c ON c.id = cr.campaign_id
                    WHERE c.workspace_id = :workspace_id
                      AND lower(cr.email) = :email
                    """
                ),
                {"workspace_id": self.workspace_id, "email": email},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_invoices(self, email: str | None) -> list[dict[str, Any]]:
        if not email:
            return []
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT * FROM invoices
                    WHERE workspace_id = :workspace_id
                      AND lower(client_email) = :email
                    """
                ),
                {"workspace_id": self.workspace_id, "email": email},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_bookings(self, email: str | None) -> list[dict[str, Any]]:
        if not email:
            return []
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT * FROM bookings
                    WHERE workspace_id = :workspace_id
                      AND lower(client_email) = :email
                    """
                ),
                {"workspace_id": self.workspace_id, "email": email},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_tickets(
        self, legacy_contact_ids: list[int], email: str | None
    ) -> list[dict[str, Any]]:
        try:
            if legacy_contact_ids:
                r = await self.session.execute(
                    text(
                        """
                        SELECT t.*, (
                            SELECT json_agg(m) FROM ticket_messages m WHERE m.ticket_id = t.id
                        ) AS messages
                        FROM tickets t
                        WHERE t.workspace_id = :workspace_id
                          AND t.contact_id = ANY(:cids)
                        """
                    ),
                    {
                        "workspace_id": self.workspace_id,
                        "cids": legacy_contact_ids,
                    },
                )
                return _rows_to_list(r)
            if email:
                r = await self.session.execute(
                    text(
                        """
                        SELECT DISTINCT t.* FROM tickets t
                        JOIN ticket_messages m ON m.ticket_id = t.id
                        WHERE t.workspace_id = :workspace_id
                          AND lower(m.sender_email) = :email
                        """
                    ),
                    {"workspace_id": self.workspace_id, "email": email},
                )
                return _rows_to_list(r)
        except Exception:
            pass
        return []

    async def _fetch_consents_for_subject(
        self,
        user_id: str,
        crm_ids: list[str],
        legacy_ids: list[int],
    ) -> list[dict[str, Any]]:
        keys = [str(user_id)] + [str(i) for i in legacy_ids] + crm_ids
        if not keys:
            return []
        r = await self.session.execute(
            text(
                """
                SELECT * FROM consent_records
                WHERE workspace_id = :workspace_id
                  AND contact_id = ANY(:keys)
                ORDER BY created_at DESC
                """
            ),
            {"workspace_id": self.workspace_id, "keys": keys},
        )
        return _rows_to_list(r)

    async def _fetch_workspace_members(self, user_id: str) -> list[dict[str, Any]]:
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT * FROM workspace_members
                    WHERE workspace_id = :workspace_id AND user_id = :user_id
                    """
                ),
                {"workspace_id": self.workspace_id, "user_id": user_id},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _fetch_user_settings(self, user_id: str) -> list[dict[str, Any]]:
        try:
            r = await self.session.execute(
                text(
                    """
                    SELECT * FROM nelvyon_user_settings
                    WHERE workspace_id = :workspace_id AND user_id = :user_id
                    """
                ),
                {"workspace_id": self.workspace_id, "user_id": user_id},
            )
            return _rows_to_list(r)
        except Exception:
            return []

    async def _delete_legacy_contact(self, contact_id: int) -> None:
        try:
            await self.session.execute(
                text(
                    "DELETE FROM contacts WHERE id = :id AND workspace_id = :workspace_id"
                ),
                {"id": contact_id, "workspace_id": self.workspace_id},
            )
        except Exception as exc:
            logger.warning("legacy contact delete skipped: %s", exc)

    async def _purge_by_email(self, email: str) -> None:
        em = email.lower()
        for stmt, params in [
            (
                "DELETE FROM campaign_recipients WHERE lower(email) = :email",
                {"email": em},
            ),
            (
                """
                UPDATE invoices
                SET client_name = 'Anonymized', client_email = NULL,
                    client_nif = NULL, client_address = NULL, notes = NULL
                WHERE workspace_id = :workspace_id AND lower(client_email) = :email
                """,
                {"workspace_id": self.workspace_id, "email": em},
            ),
            (
                "DELETE FROM bookings WHERE workspace_id = :ws AND lower(client_email) = :email",
                {"ws": self.workspace_id, "email": em},
            ),
        ]:
            try:
                await self.session.execute(text(stmt), params)
            except Exception as exc:
                logger.debug("purge stmt skipped: %s", exc)


def get_gdpr_service(session: AsyncSession, workspace_id: int) -> GDPRService:
    return GDPRService(session, workspace_id)
