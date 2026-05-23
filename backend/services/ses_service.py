"""Amazon SES — cold email delivery (lazy init, mock when AWS creds missing)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from typing import Any

from sqlalchemy import text

from core.sentry_utils import capture_exception

logger = logging.getLogger(__name__)

BULK_BATCH_SIZE = 50
BULK_MAX_RETRIES = 3
TRANSIENT_SES_ERROR_CODES = frozenset(
    {
        "Throttling",
        "ThrottlingException",
        "ServiceUnavailable",
        "ServiceUnavailableException",
        "RequestTimeout",
        "RequestTimeoutException",
        "TooManyRequestsException",
        "InternalFailure",
        "InternalError",
    }
)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_transient_ses_error(exc: Exception) -> bool:
    try:
        from botocore.exceptions import ClientError

        if isinstance(exc, ClientError):
            code = exc.response.get("Error", {}).get("Code", "")
            return code in TRANSIENT_SES_ERROR_CODES or "Throttl" in code
    except ImportError:
        pass
    msg = str(exc).lower()
    return "throttl" in msg or "timeout" in msg or "503" in msg


class SESService:
    """SES client wrapper; initializes on first use."""

    def __init__(self) -> None:
        self._client: Any | None = None
        self._mock = False
        self._init_attempted = False
        self.default_from_email = os.environ.get("SES_FROM_EMAIL", "").strip()
        self.region = os.environ.get("AWS_REGION", "eu-west-1").strip() or "eu-west-1"

    def _ensure_client(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        access_key = os.environ.get("AWS_ACCESS_KEY_ID", "").strip()
        secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip()

        if not access_key or not secret_key:
            self._mock = True
            logger.info("SESService: AWS credentials not set — running in mock mode")
            return

        try:
            import boto3

            self._client = boto3.client(
                "ses",
                region_name=self.region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
            )
            logger.info("SESService: boto3 SES client ready (region=%s)", self.region)
        except Exception as exc:
            self._mock = True
            capture_exception(exc, service="ses", phase="client_init")
            logger.warning("SESService: failed to create SES client — mock mode: %s", exc)

    @property
    def is_mock(self) -> bool:
        self._ensure_client()
        return self._mock

    def _resolve_from_email(self, from_email: str | None) -> str:
        resolved = (from_email or self.default_from_email or "").strip()
        if not resolved:
            raise ValueError("SES_FROM_EMAIL or from_email is required")
        return resolved

    async def _db_session(self):
        from core.database import db_manager

        await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            raise RuntimeError("Database not initialized")
        return db_manager.async_session_maker()

    async def is_suppressed(self, email: str) -> bool:
        addr = _normalize_email(email)
        if not addr:
            return False
        session_maker = await self._db_session()
        async with session_maker() as session:
            result = await session.execute(
                text("SELECT 1 FROM ses_suppressions WHERE lower(email) = :email LIMIT 1"),
                {"email": addr},
            )
            return result.fetchone() is not None

    async def add_suppression(self, email: str, reason: str) -> dict[str, Any]:
        addr = _normalize_email(email)
        if not addr:
            raise ValueError("email is required")
        reason = reason.strip().lower()
        if reason not in ("bounce", "complaint"):
            raise ValueError("reason must be bounce or complaint")

        session_maker = await self._db_session()
        async with session_maker() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO ses_suppressions (email, reason, created_at)
                    VALUES (:email, :reason, NOW())
                    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason
                    """
                ),
                {"email": addr, "reason": reason},
            )
            await session.commit()
        return {"ok": True, "email": addr, "reason": reason}

    async def list_suppressions(self, *, limit: int = 200) -> list[dict[str, Any]]:
        limit = max(1, min(int(limit), 500))
        session_maker = await self._db_session()
        async with session_maker() as session:
            result = await session.execute(
                text(
                    """
                    SELECT id, email, reason, created_at
                    FROM ses_suppressions
                    ORDER BY created_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )
            rows = []
            for row in result.fetchall():
                data = dict(row._mapping)
                if data.get("created_at") is not None:
                    data["created_at"] = data["created_at"].isoformat()
                rows.append(data)
            return rows

    async def bounce_handler(self, notification: dict[str, Any]) -> dict[str, Any]:
        """Process SES SNS bounce/complaint notifications."""
        msg_type = notification.get("Type", "")
        if msg_type == "SubscriptionConfirmation":
            logger.info("SES SNS subscription URL: %s", notification.get("SubscribeURL"))
            return {"ok": True, "type": "SubscriptionConfirmation"}

        if msg_type != "Notification":
            return {"ok": True, "type": msg_type or "unknown"}

        raw_message = notification.get("Message", "{}")
        try:
            inner = json.loads(raw_message) if isinstance(raw_message, str) else raw_message
        except json.JSONDecodeError:
            inner = {"raw": str(raw_message)}

        notif_type = (inner.get("notificationType") or "").strip()
        suppressed: list[dict[str, Any]] = []

        if notif_type == "Bounce":
            bounce = inner.get("bounce") or {}
            bounce_type = (bounce.get("bounceType") or "").strip()
            for recipient in bounce.get("bouncedRecipients") or []:
                email = (recipient.get("emailAddress") or "").strip()
                if not email:
                    continue
                if bounce_type == "Permanent":
                    out = await self.add_suppression(email, "bounce")
                    suppressed.append(out)
        elif notif_type == "Complaint":
            complaint = inner.get("complaint") or {}
            for recipient in complaint.get("complainedRecipients") or []:
                email = (recipient.get("emailAddress") or "").strip()
                if not email:
                    continue
                out = await self.add_suppression(email, "complaint")
                suppressed.append(out)

        return {
            "ok": True,
            "notification_type": notif_type,
            "suppressed_count": len(suppressed),
            "suppressed": suppressed,
        }

    async def get_sending_quota(self) -> dict[str, Any]:
        self._ensure_client()
        if self._mock:
            return {
                "mock": True,
                "max_24_hour_send": 50000,
                "max_send_rate": 14,
                "sent_last_24_hours": 0,
            }

        def _quota() -> dict[str, Any]:
            assert self._client is not None
            return self._client.get_send_quota()

        try:
            response = await asyncio.to_thread(_quota)
            return {"mock": False, **response}
        except Exception as exc:
            capture_exception(exc, service="ses", method="get_sending_quota")
            raise

    async def verify_email_identity(self, email: str) -> dict[str, Any]:
        self._ensure_client()
        addr = email.strip()
        if not addr:
            raise ValueError("email is required")

        if self._mock:
            logger.info("[SES MOCK] verify_email_identity %s", addr)
            return {
                "mock": True,
                "email": addr,
                "message": "Email verification simulated (AWS credentials not configured)",
            }

        def _verify() -> dict[str, Any]:
            assert self._client is not None
            return self._client.verify_email_identity(EmailAddress=addr)

        try:
            response = await asyncio.to_thread(_verify)
            return {"mock": False, "email": addr, "response": response}
        except Exception as exc:
            capture_exception(exc, service="ses", method="verify_email_identity")
            raise

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        from_email: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_client()
        source = self._resolve_from_email(from_email)
        to_addr = to.strip()
        if not to_addr:
            raise ValueError("Recipient email (to) is required")

        if await self.is_suppressed(to_addr):
            return {
                "mock": self._mock,
                "suppressed": True,
                "to": to_addr,
                "error": "Recipient is on SES suppression list",
            }

        if self._mock:
            message_id = f"mock-{uuid.uuid4().hex}"
            logger.info("[SES MOCK] send to=%s subject=%s", to_addr, subject[:80])
            return {
                "mock": True,
                "message_id": message_id,
                "to": to_addr,
                "from": source,
                "subject": subject,
            }

        def _send() -> dict[str, Any]:
            assert self._client is not None
            return self._client.send_email(
                Source=source,
                Destination={"ToAddresses": [to_addr]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
                },
            )

        try:
            response = await asyncio.to_thread(_send)
        except Exception as exc:
            capture_exception(exc, service="ses", method="send_email", to=to_addr)
            raise

        return {
            "mock": False,
            "message_id": response.get("MessageId"),
            "to": to_addr,
            "from": source,
            "response": response,
        }

    async def send_bulk_emails(self, recipients: list[dict[str, Any]]) -> dict[str, Any]:
        if not recipients:
            return {"total": 0, "sent": 0, "failed": 0, "results": []}

        results: list[dict[str, Any]] = []
        sent = 0
        failed = 0

        for offset in range(0, len(recipients), BULK_BATCH_SIZE):
            batch = recipients[offset : offset + BULK_BATCH_SIZE]
            tasks = []
            for item in batch:
                to = str(item.get("to", "")).strip()
                subject = str(item.get("subject", "")).strip()
                html_body = str(item.get("html_body", item.get("body", ""))).strip()
                from_email = item.get("from_email")
                if from_email is not None:
                    from_email = str(from_email).strip() or None
                tasks.append(
                    self._send_bulk_item(
                        to=to, subject=subject, html_body=html_body, from_email=from_email
                    )
                )
            batch_outcomes = await asyncio.gather(*tasks, return_exceptions=True)
            for outcome in batch_outcomes:
                if isinstance(outcome, Exception):
                    failed += 1
                    capture_exception(outcome, service="ses", method="send_bulk_emails")
                    results.append({"ok": False, "error": str(outcome)})
                elif outcome.get("ok"):
                    sent += 1
                    results.append(outcome)
                else:
                    failed += 1
                    results.append(outcome)

        return {
            "total": len(recipients),
            "sent": sent,
            "failed": failed,
            "mock": self.is_mock,
            "results": results,
        }

    async def _send_bulk_item(
        self,
        *,
        to: str,
        subject: str,
        html_body: str,
        from_email: str | None,
    ) -> dict[str, Any]:
        if not to or not subject or not html_body:
            return {"ok": False, "error": "to, subject, and html_body are required"}

        last_error: Exception | None = None
        for attempt in range(1, BULK_MAX_RETRIES + 1):
            try:
                result = await self.send_email(to, subject, html_body, from_email=from_email)
                if result.get("suppressed"):
                    return {"ok": False, "to": to, "suppressed": True, **result}
                return {"ok": True, **result}
            except Exception as exc:
                last_error = exc
                if attempt < BULK_MAX_RETRIES and _is_transient_ses_error(exc):
                    await asyncio.sleep(0.5 * attempt)
                    continue
                capture_exception(exc, service="ses", method="_send_bulk_item", to=to, attempt=attempt)
                return {"ok": False, "to": to, "error": str(exc), "attempts": attempt}

        return {"ok": False, "to": to, "error": str(last_error or "unknown")}

    async def verify_domain(self, domain: str) -> dict[str, Any]:
        self._ensure_client()
        domain = domain.strip().lower()
        if not domain:
            raise ValueError("domain is required")

        if self._mock:
            logger.info("[SES MOCK] verify_domain %s", domain)
            return {
                "mock": True,
                "domain": domain,
                "verification_token": f"mock-token-{domain}",
                "message": "Domain verification simulated (AWS credentials not configured)",
            }

        def _verify() -> dict[str, Any]:
            assert self._client is not None
            return self._client.verify_domain_identity(Domain=domain)

        try:
            response = await asyncio.to_thread(_verify)
            return {"mock": False, "domain": domain, "response": response}
        except Exception as exc:
            capture_exception(exc, service="ses", method="verify_domain")
            raise

    async def get_sending_stats(self) -> dict[str, Any]:
        self._ensure_client()

        if self._mock:
            return {
                "mock": True,
                "send_data_points": [],
                "message": "SES statistics unavailable in mock mode",
            }

        def _stats() -> dict[str, Any]:
            assert self._client is not None
            return self._client.get_send_statistics()

        try:
            response = await asyncio.to_thread(_stats)
            return {"mock": False, "statistics": response}
        except Exception as exc:
            capture_exception(exc, service="ses", method="get_sending_stats")
            raise

    async def get_reputation(self) -> dict[str, Any]:
        """SES reputation: bounce/complaint rates from stats + local suppressions."""
        stats = await self.get_sending_stats()
        suppression_count = 0
        try:
            session_maker = await self._db_session()
            async with session_maker() as session:
                r = await session.execute(text("SELECT COUNT(*) AS cnt FROM ses_suppressions"))
                row = r.fetchone()
                suppression_count = int(row._mapping["cnt"]) if row else 0
        except Exception:
            suppression_count = 0

        if self._mock or stats.get("mock"):
            return {
                "mock": True,
                "suppression_count": suppression_count,
                "bounce_rate_pct": 0.0,
                "complaint_rate_pct": 0.0,
                "reputation_status": "pending_auth",
            }

        points = stats.get("statistics", {}).get("SendDataPoints", [])
        bounces = sum(p.get("Bounces", 0) for p in points)
        complaints = sum(p.get("Complaints", 0) for p in points)
        deliveries = sum(p.get("DeliveryAttempts", 0) for p in points) or 1
        return {
            "mock": False,
            "suppression_count": suppression_count,
            "bounce_rate_pct": round(bounces / deliveries * 100, 3),
            "complaint_rate_pct": round(complaints / deliveries * 100, 3),
            "reputation_status": "healthy" if complaints / deliveries < 0.001 else "review",
            "period_points": len(points),
        }


_ses_service: SESService | None = None


def get_ses_service() -> SESService:
    global _ses_service
    if _ses_service is None:
        _ses_service = SESService()
    return _ses_service
