"""Web Push (PWA) notifications via VAPID + pywebpush."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager

logger = logging.getLogger(__name__)

_DEFAULT_VAPID_EMAIL = "mailto:dev@nelvyon.com"
_generated_vapid: dict[str, str] | None = None
_SCHEMA_READY = False


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, datetime):
            data[key] = val.isoformat()
    return data


class PushService:
    """Workspace-scoped Web Push on ``push_subscriptions``."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)
        self._private_key: str | None = None
        self._public_key: str | None = None
        self._vapid_email: str = _DEFAULT_VAPID_EMAIL
        self._mock = False
        self._vapid_ready = False
        self._init_attempted = False

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "push_subscriptions.sql"
        if sql_path.exists() and db_manager.async_session_maker:
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("push schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    @staticmethod
    def generate_vapid_keys() -> dict[str, str]:
        """Generate a VAPID key pair (PEM private + URL-safe public)."""
        global _generated_vapid
        if _generated_vapid:
            return dict(_generated_vapid)

        try:
            from py_vapid import Vapid

            vapid = Vapid()
            vapid.generate_keys()
            private_key = vapid.private_pem().decode("utf-8")
            public_key = vapid.public_key
            if isinstance(public_key, bytes):
                public_key = public_key.decode("utf-8")
        except Exception as exc:
            logger.warning("py_vapid unavailable, using mock VAPID keys: %s", exc)
            private_key = "mock-private-key"
            public_key = "mock-public-key"

        _generated_vapid = {
            "private_key": private_key,
            "public_key": public_key,
        }
        return dict(_generated_vapid)

    def _ensure_vapid(self) -> None:
        if self._vapid_ready:
            return
        self._init_attempted = True

        private = (os.environ.get("VAPID_PRIVATE_KEY") or "").strip()
        public = (os.environ.get("VAPID_PUBLIC_KEY") or "").strip()
        email = (os.environ.get("VAPID_EMAIL") or "").strip() or "dev@nelvyon.com"

        if not private or not public:
            keys = self.generate_vapid_keys()
            private = keys["private_key"]
            public = keys["public_key"]
            self._mock = private.startswith("mock-")
            logger.warning(
                "VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY not set — using %s keys. "
                "Add generated keys to Railway env for production push delivery.",
                "mock" if self._mock else "auto-generated",
            )
        else:
            self._mock = False

        self._private_key = private
        self._public_key = public
        self._vapid_email = email if email.startswith("mailto:") else f"mailto:{email}"
        self._vapid_ready = True

    @property
    def is_mock(self) -> bool:
        self._ensure_vapid()
        return self._mock

    def get_public_key(self) -> str:
        self._ensure_vapid()
        assert self._public_key is not None
        return self._public_key

    def _extract_subscription_keys(self, subscription_data: dict[str, Any]) -> dict[str, str]:
        endpoint = (subscription_data.get("endpoint") or "").strip()
        keys = subscription_data.get("keys") or {}
        p256dh = (keys.get("p256dh") or subscription_data.get("p256dh") or "").strip()
        auth = (keys.get("auth") or subscription_data.get("auth") or "").strip()
        if not endpoint or not p256dh or not auth:
            raise ValueError("subscription_data must include endpoint and keys.p256dh / keys.auth")
        return {"endpoint": endpoint, "p256dh": p256dh, "auth": auth}

    async def subscribe(
        self,
        user_id: str,
        subscription_data: dict[str, Any],
        *,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        user_id = str(user_id).strip()
        if not user_id:
            raise ValueError("user_id is required")
        keys = self._extract_subscription_keys(subscription_data)

        await self.session.execute(
            text(
                """
                INSERT INTO push_subscriptions (
                    workspace_id, user_id, endpoint, p256dh, auth, user_agent, created_at
                ) VALUES (
                    :workspace_id, :user_id, :endpoint, :p256dh, :auth, :user_agent, :created_at
                )
                ON CONFLICT (workspace_id, user_id, endpoint) DO UPDATE SET
                    p256dh = EXCLUDED.p256dh,
                    auth = EXCLUDED.auth,
                    user_agent = EXCLUDED.user_agent
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "user_id": user_id,
                "endpoint": keys["endpoint"],
                "p256dh": keys["p256dh"],
                "auth": keys["auth"],
                "user_agent": user_agent,
                "created_at": datetime.now(timezone.utc),
            },
        )
        await self.session.commit()
        return {
            "ok": True,
            "workspace_id": self.workspace_id,
            "user_id": user_id,
            "endpoint": keys["endpoint"],
        }

    async def unsubscribe(self, user_id: str, endpoint: str) -> dict[str, Any]:
        user_id = str(user_id).strip()
        endpoint = endpoint.strip()
        if not user_id or not endpoint:
            raise ValueError("user_id and endpoint are required")

        result = await self.session.execute(
            text(
                """
                DELETE FROM push_subscriptions
                WHERE workspace_id = :workspace_id
                  AND user_id = :user_id
                  AND endpoint = :endpoint
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "user_id": user_id,
                "endpoint": endpoint,
            },
        )
        await self.session.commit()
        removed = result.rowcount or 0
        return {"ok": True, "removed": removed}

    async def _list_subscriptions_for_user(self, user_id: str) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, user_id, endpoint, p256dh, auth, user_agent, created_at
                FROM push_subscriptions
                WHERE workspace_id = :workspace_id AND user_id = :user_id
                """
            ),
            {"workspace_id": self.workspace_id, "user_id": str(user_id).strip()},
        )
        return [_row_to_dict(row) for row in result.fetchall()]

    async def _list_subscriptions_for_workspace(self) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, user_id, endpoint, p256dh, auth, user_agent, created_at
                FROM push_subscriptions
                WHERE workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        return [_row_to_dict(row) for row in result.fetchall()]

    def _build_payload(
        self,
        title: str,
        body: str,
        url: str | None = None,
        icon: str | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "title": title,
            "body": body,
        }
        if url:
            payload["url"] = url
        if icon:
            payload["icon"] = icon
        return json.dumps(payload, ensure_ascii=False)

    def _send_sync(self, subscription: dict[str, Any], data: str) -> dict[str, Any]:
        self._ensure_vapid()
        if self._mock:
            logger.info(
                "[PUSH MOCK] to user=%s endpoint=%s data=%s",
                subscription.get("user_id"),
                (subscription.get("endpoint") or "")[:60],
                data[:120],
            )
            return {"ok": True, "mock": True, "endpoint": subscription.get("endpoint")}

        try:
            from pywebpush import WebPushException, webpush
        except ImportError as exc:
            logger.warning("pywebpush not installed — mock send: %s", exc)
            return {"ok": True, "mock": True, "reason": "pywebpush_missing"}

        subscription_info = {
            "endpoint": subscription["endpoint"],
            "keys": {
                "p256dh": subscription["p256dh"],
                "auth": subscription["auth"],
            },
        }

        try:
            response = webpush(
                subscription_info=subscription_info,
                data=data,
                vapid_private_key=self._private_key,
                vapid_claims={"sub": self._vapid_email},
                ttl=86400,
            )
            status = getattr(response, "status_code", 201)
            return {"ok": True, "status_code": status, "endpoint": subscription["endpoint"]}
        except WebPushException as exc:
            status = getattr(exc, "response", None)
            code = getattr(status, "status_code", None) if status is not None else None
            return {
                "ok": False,
                "endpoint": subscription["endpoint"],
                "error": str(exc),
                "status_code": code,
                "gone": code == 410,
            }
        except Exception as exc:
            return {
                "ok": False,
                "endpoint": subscription.get("endpoint"),
                "error": str(exc),
            }

    async def _send_to_subscription(
        self, subscription: dict[str, Any], data: str
    ) -> dict[str, Any]:
        result = await asyncio.to_thread(self._send_sync, subscription, data)
        if result.get("gone"):
            await self.unsubscribe(
                str(subscription.get("user_id", "")),
                str(subscription.get("endpoint", "")),
            )
        return result

    async def send_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        url: str | None = None,
        icon: str | None = None,
    ) -> dict[str, Any]:
        subs = await self._list_subscriptions_for_user(user_id)
        if not subs:
            return {
                "ok": True,
                "user_id": user_id,
                "sent": 0,
                "failed": 0,
                "results": [],
                "message": "no subscriptions",
            }

        data = self._build_payload(title, body, url=url, icon=icon)
        results = []
        sent = 0
        failed = 0
        for sub in subs:
            out = await self._send_to_subscription(sub, data)
            results.append(out)
            if out.get("ok"):
                sent += 1
            else:
                failed += 1

        return {
            "ok": failed == 0,
            "user_id": user_id,
            "sent": sent,
            "failed": failed,
            "results": results,
        }

    async def send_to_workspace(
        self,
        title: str,
        body: str,
        url: str | None = None,
        icon: str | None = None,
    ) -> dict[str, Any]:
        subs = await self._list_subscriptions_for_workspace()
        if not subs:
            return {
                "ok": True,
                "workspace_id": self.workspace_id,
                "sent": 0,
                "failed": 0,
                "users": 0,
                "results": [],
                "message": "no subscriptions",
            }

        data = self._build_payload(title, body, url=url, icon=icon)
        results = []
        sent = 0
        failed = 0
        users = {s.get("user_id") for s in subs}

        for sub in subs:
            out = await self._send_to_subscription(sub, data)
            results.append(out)
            if out.get("ok"):
                sent += 1
            else:
                failed += 1

        return {
            "ok": failed == 0,
            "workspace_id": self.workspace_id,
            "users": len(users),
            "sent": sent,
            "failed": failed,
            "results": results,
        }

    async def list_subscribers(self, *, limit: int = 200) -> list[dict[str, Any]]:
        """List push subscribers for the workspace."""
        await self.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT user_id, endpoint, user_agent, created_at, updated_at
                FROM push_subscriptions
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"ws": self.workspace_id, "limit": limit},
        )
        return [_row_to_dict(row) for row in r.fetchall()]


def get_push_service(session: AsyncSession, workspace_id: int) -> PushService:
    return PushService(session, workspace_id)
