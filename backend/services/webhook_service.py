"""Outbound webhooks — register endpoints, deliver events, HMAC signatures, retries."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
MAX_ATTEMPTS = 5
SIGNATURE_HEADER = "X-Nelvyon-Signature"
EVENT_HEADER = "X-Nelvyon-Event"
DELIVERY_HEADER = "X-Nelvyon-Delivery-Id"

SUPPORTED_EVENTS = frozenset(
    {
        "contact.created",
        "contact.updated",
        "deal.created",
        "deal.stage_changed",
        "campaign.sent",
        "invoice.paid",
        "booking.created",
        "ticket.created",
        "ticket.resolved",
    }
)


def verify_signature(payload: bytes | str, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 webhook signature (format: sha256=<hex>)."""
    if not signature or not secret:
        return False
    body = payload if isinstance(payload, bytes) else payload.encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature.strip()
    if provided.startswith("sha256="):
        provided = provided[7:]
    return hmac.compare_digest(expected, provided)


def _sign_payload(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


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


class WebhookService:
    """Workspace-scoped outbound webhook delivery."""

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
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "webhooks.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("webhooks schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def register_webhook(
        self,
        url: str,
        events: list[str],
        secret: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        normalized = [e.strip() for e in events if e.strip()]
        invalid = [e for e in normalized if e not in SUPPORTED_EVENTS]
        if invalid:
            raise ValueError(f"Unsupported events: {', '.join(invalid)}")
        if not normalized:
            raise ValueError("At least one event is required")

        webhook_secret = secret or secrets.token_urlsafe(32)
        endpoint_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO webhook_endpoints (id, workspace_id, url, events, secret, active)
                VALUES (:id, :ws, :url, CAST(:events AS jsonb), :secret, TRUE)
                RETURNING id, workspace_id, url, events, active, created_at
                """
            ),
            {
                "id": endpoint_id,
                "ws": self.workspace_id,
                "url": url.strip(),
                "events": _json_dumps(normalized),
                "secret": webhook_secret,
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        row["secret"] = webhook_secret
        return row

    async def list_endpoints(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, url, events, active, created_at
                FROM webhook_endpoints
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                """
            ),
            {"ws": self.workspace_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def get_endpoint(self, endpoint_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, url, events, secret, active, created_at
                FROM webhook_endpoints
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {"id": endpoint_id, "ws": self.workspace_id},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def update_endpoint(
        self,
        endpoint_id: str,
        *,
        url: str | None = None,
        events: list[str] | None = None,
        active: bool | None = None,
    ) -> dict[str, Any]:
        ep = await self.get_endpoint(endpoint_id)
        if not ep:
            raise ValueError("Webhook endpoint not found")
        sets: list[str] = []
        params: dict[str, Any] = {"id": endpoint_id, "ws": self.workspace_id}
        if url is not None:
            sets.append("url = :url")
            params["url"] = url.strip()
        if events is not None:
            invalid = [e for e in events if e not in SUPPORTED_EVENTS]
            if invalid:
                raise ValueError(f"Unsupported events: {', '.join(invalid)}")
            sets.append("events = CAST(:events AS jsonb)")
            params["events"] = _json_dumps(events)
        if active is not None:
            sets.append("active = :active")
            params["active"] = active
        if not sets:
            return {k: v for k, v in ep.items() if k != "secret"}
        await self.session.execute(
            text(
                f"""
                UPDATE webhook_endpoints SET {', '.join(sets)}
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            params,
        )
        await self.session.commit()
        updated = await self.get_endpoint(endpoint_id)
        return {k: v for k, v in (updated or {}).items() if k != "secret"}

    async def delete_endpoint(self, endpoint_id: str) -> bool:
        r = await self.session.execute(
            text(
                "DELETE FROM webhook_endpoints WHERE id = :id::uuid AND workspace_id = :ws"
            ),
            {"id": endpoint_id, "ws": self.workspace_id},
        )
        await self.session.commit()
        return (r.rowcount or 0) > 0

    async def trigger_webhook(
        self,
        event: str,
        payload: dict[str, Any],
        *,
        workspace_id: int | None = None,
    ) -> list[dict[str, Any]]:
        """Deliver event to all matching active endpoints."""
        await self.ensure_schema()
        ws = int(workspace_id or self.workspace_id)
        if event not in SUPPORTED_EVENTS:
            raise ValueError(f"Unsupported event: {event}")

        r = await self.session.execute(
            text(
                """
                SELECT id, url, secret, events
                FROM webhook_endpoints
                WHERE workspace_id = :ws AND active = TRUE
                """
            ),
            {"ws": ws},
        )
        endpoints = r.fetchall()
        results: list[dict[str, Any]] = []
        envelope = {
            "event": event,
            "workspace_id": ws,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }

        for ep in endpoints:
            events_list = ep._mapping["events"]
            if isinstance(events_list, str):
                events_list = json.loads(events_list)
            if event not in (events_list or []):
                continue
            delivery_id = str(uuid.uuid4())
            delivery = await self._deliver(
                endpoint_id=str(ep._mapping["id"]),
                url=str(ep._mapping["url"]),
                secret=str(ep._mapping["secret"]),
                event=event,
                envelope=envelope,
                delivery_id=delivery_id,
            )
            results.append(delivery)
        return results

    async def _deliver(
        self,
        *,
        endpoint_id: str,
        url: str,
        secret: str,
        event: str,
        envelope: dict[str, Any],
        delivery_id: str,
        attempts: int = 0,
    ) -> dict[str, Any]:
        body_bytes = _json_dumps(envelope).encode("utf-8")
        signature = _sign_payload(secret, body_bytes)
        attempts += 1
        now = datetime.now(timezone.utc)
        status = "pending"
        response_code: int | None = None
        response_body: str | None = None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    url,
                    content=body_bytes,
                    headers={
                        "Content-Type": "application/json",
                        SIGNATURE_HEADER: signature,
                        EVENT_HEADER: event,
                        DELIVERY_HEADER: delivery_id,
                        "User-Agent": "Nelvyon-Webhooks/1.0",
                    },
                )
            response_code = resp.status_code
            response_body = (resp.text or "")[:2000]
            status = "success" if 200 <= resp.status_code < 300 else "failed"
        except Exception as exc:
            status = "failed"
            response_body = str(exc)[:2000]

        next_retry = None
        if status == "failed" and attempts < MAX_ATTEMPTS:
            status = "retrying"
            delay = min(3600, 2 ** attempts)
            next_retry = now + timedelta(seconds=delay)

        existing = await self.session.execute(
            text("SELECT 1 FROM webhook_deliveries WHERE id = :id::uuid"),
            {"id": delivery_id},
        )
        if existing.fetchone():
            await self.session.execute(
                text(
                    """
                    UPDATE webhook_deliveries
                    SET status = :status, attempts = :attempts,
                        response_code = :response_code, response_body = :response_body,
                        last_attempt_at = :last_attempt_at, next_retry_at = :next_retry_at
                    WHERE id = :id::uuid
                    """
                ),
                {
                    "id": delivery_id,
                    "status": status if status != "retrying" or attempts >= MAX_ATTEMPTS else "failed",
                    "attempts": attempts,
                    "response_code": response_code,
                    "response_body": response_body,
                    "last_attempt_at": now,
                    "next_retry_at": next_retry,
                },
            )
        else:
            await self.session.execute(
                text(
                    """
                    INSERT INTO webhook_deliveries (
                        id, endpoint_id, event, payload, status, attempts,
                        response_code, response_body, last_attempt_at, next_retry_at
                    )
                    VALUES (
                        :id, :endpoint_id::uuid, :event, CAST(:payload AS jsonb),
                        :status, :attempts, :response_code, :response_body,
                        :last_attempt_at, :next_retry_at
                    )
                    """
                ),
                {
                    "id": delivery_id,
                    "endpoint_id": endpoint_id,
                    "event": event,
                    "payload": _json_dumps(envelope),
                    "status": status,
                    "attempts": attempts,
                    "response_code": response_code,
                    "response_body": response_body,
                    "last_attempt_at": now,
                    "next_retry_at": next_retry,
                },
            )
        if status == "retrying" and attempts >= MAX_ATTEMPTS:
            status = "failed"
        await self.session.commit()
        return {
            "delivery_id": delivery_id,
            "endpoint_id": endpoint_id,
            "event": event,
            "status": status,
            "attempts": attempts,
            "response_code": response_code,
        }

    async def retry_failed_webhooks(self) -> dict[str, Any]:
        """Retry pending/failed deliveries with exponential backoff (max 5 attempts)."""
        await self.ensure_schema()
        now = datetime.now(timezone.utc)
        r = await self.session.execute(
            text(
                """
                SELECT d.id, d.endpoint_id, d.event, d.payload, d.attempts,
                       e.url, e.secret, e.workspace_id
                FROM webhook_deliveries d
                JOIN webhook_endpoints e ON e.id = d.endpoint_id
                WHERE d.status IN ('pending', 'failed', 'retrying')
                  AND d.attempts < :max_attempts
                  AND (d.next_retry_at IS NULL OR d.next_retry_at <= :now)
                  AND e.workspace_id = :ws
                ORDER BY d.created_at ASC
                LIMIT 50
                """
            ),
            {"max_attempts": MAX_ATTEMPTS, "now": now, "ws": self.workspace_id},
        )
        rows = r.fetchall()
        retried = 0
        succeeded = 0
        for row in rows:
            m = row._mapping
            envelope = m["payload"]
            if isinstance(envelope, str):
                envelope = json.loads(envelope)
            result = await self._deliver(
                endpoint_id=str(m["endpoint_id"]),
                url=str(m["url"]),
                secret=str(m["secret"]),
                event=str(m["event"]),
                envelope=envelope,
                delivery_id=str(m["id"]),
                attempts=int(m["attempts"] or 0),
            )
            retried += 1
            if result["status"] == "success":
                succeeded += 1
        return {"retried": retried, "succeeded": succeeded, "workspace_id": self.workspace_id}

    async def list_deliveries(
        self,
        *,
        limit: int = 50,
        endpoint_id: str | None = None,
    ) -> list[dict[str, Any]]:
        await self.ensure_schema()
        q = """
            SELECT d.id, d.endpoint_id, d.event, d.status, d.attempts,
                   d.response_code, d.last_attempt_at, d.created_at
            FROM webhook_deliveries d
            JOIN webhook_endpoints e ON e.id = d.endpoint_id
            WHERE e.workspace_id = :ws
        """
        params: dict[str, Any] = {"ws": self.workspace_id, "limit": limit}
        if endpoint_id:
            q += " AND d.endpoint_id = :endpoint_id::uuid"
            params["endpoint_id"] = endpoint_id
        q += " ORDER BY d.created_at DESC LIMIT :limit"
        r = await self.session.execute(text(q), params)
        return [_row(x) for x in r.fetchall()]


async def emit_webhook_event(
    workspace_id: int,
    event: str,
    payload: dict[str, Any],
) -> None:
    """Deliver webhook using a fresh DB session (safe for background tasks)."""
    try:
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        if not db_manager.async_session_maker:
            return
        async with db_manager.async_session_maker() as session:
            svc = WebhookService(session, workspace_id)
            await svc.trigger_webhook(event, payload, workspace_id=workspace_id)
    except Exception as exc:
        logger.warning(
            "webhook emit failed ws=%s event=%s: %s",
            workspace_id,
            event,
            exc,
        )


def schedule_webhook_event(
    workspace_id: int,
    event: str,
    payload: dict[str, Any],
) -> None:
    """Schedule webhook delivery without blocking the caller."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(emit_webhook_event(workspace_id, event, payload))
    except RuntimeError:
        pass


def get_webhook_service(session: AsyncSession, workspace_id: int) -> WebhookService:
    return WebhookService(session, workspace_id)
