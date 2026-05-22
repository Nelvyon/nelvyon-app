"""Amazon SES — cold email delivery (lazy init, mock when AWS creds missing)."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

logger = logging.getLogger(__name__)

BULK_BATCH_SIZE = 50


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

        response = await asyncio.to_thread(_send)
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
                    self._send_bulk_item(to=to, subject=subject, html_body=html_body, from_email=from_email)
                )
            batch_outcomes = await asyncio.gather(*tasks, return_exceptions=True)
            for outcome in batch_outcomes:
                if isinstance(outcome, Exception):
                    failed += 1
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
        try:
            result = await self.send_email(to, subject, html_body, from_email=from_email)
            return {"ok": True, **result}
        except Exception as exc:
            return {"ok": False, "to": to, "error": str(exc)}

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

        response = await asyncio.to_thread(_verify)
        return {"mock": False, "domain": domain, "response": response}

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

        response = await asyncio.to_thread(_stats)
        return {"mock": False, "statistics": response}


_ses_service: SESService | None = None


def get_ses_service() -> SESService:
    global _ses_service
    if _ses_service is None:
        _ses_service = SESService()
    return _ses_service
