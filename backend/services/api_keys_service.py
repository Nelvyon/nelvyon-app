"""Public API keys — secure nlv_ keys with scopes for enterprise integrations."""

from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.webhook_service import WebhookService

logger = logging.getLogger(__name__)

KEY_PREFIX = "nlv_"
VALID_SCOPES = frozenset(
    {"read", "write", "admin", "webhooks", "campaigns", "crm", "analytics"}
)


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


class APIKeysService:
    """Workspace-scoped API key management."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    async def create_api_key(
        self,
        workspace_id: int,
        name: str,
        scopes: list[str],
        expires_at: datetime | None = None,
    ) -> dict[str, Any]:
        await WebhookService.ensure_schema()
        normalized_scopes = [s.strip().lower() for s in scopes if s.strip()]
        invalid = [s for s in normalized_scopes if s not in VALID_SCOPES]
        if invalid:
            raise ValueError(f"Invalid scopes: {', '.join(invalid)}")
        if not normalized_scopes:
            raise ValueError("At least one scope is required")

        raw_key = KEY_PREFIX + secrets.token_urlsafe(32)
        key_hash = _hash_key(raw_key)
        key_id = str(uuid.uuid4())
        display_prefix = raw_key[:12] + "..."

        r = await self.session.execute(
            text(
                """
                INSERT INTO api_keys (
                    id, workspace_id, name, key_prefix, key_hash, scopes, expires_at
                )
                VALUES (
                    :id, :ws, :name, :prefix, :hash, CAST(:scopes AS jsonb), :expires_at
                )
                RETURNING id, workspace_id, name, key_prefix, scopes, expires_at, created_at
                """
            ),
            {
                "id": key_id,
                "ws": workspace_id,
                "name": name.strip(),
                "prefix": display_prefix,
                "hash": key_hash,
                "scopes": __import__("json").dumps(normalized_scopes),
                "expires_at": expires_at,
            },
        )
        await self.session.commit()
        row = _row(r.fetchone())
        row["api_key"] = raw_key
        return row

    async def revoke_api_key(self, key_id: str, workspace_id: int | None = None) -> bool:
        ws = workspace_id if workspace_id is not None else self.workspace_id
        q = "UPDATE api_keys SET revoked_at = NOW() WHERE id = :id::uuid"
        params: dict[str, Any] = {"id": key_id}
        if ws is not None:
            q += " AND workspace_id = :ws"
            params["ws"] = ws
        r = await self.session.execute(text(q), params)
        await self.session.commit()
        return (r.rowcount or 0) > 0

    async def validate_api_key(self, key: str) -> dict[str, Any] | None:
        """Authenticate by raw API key; returns key metadata or None."""
        if not key or not key.startswith(KEY_PREFIX):
            return None
        await WebhookService.ensure_schema()
        key_hash = _hash_key(key)
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, scopes, expires_at, revoked_at
                FROM api_keys
                WHERE key_hash = :hash
                LIMIT 1
                """
            ),
            {"hash": key_hash},
        )
        row = r.fetchone()
        if not row:
            return None
        data = _row(row)
        if data.get("revoked_at"):
            return None
        expires = data.get("expires_at")
        if expires:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                return None
        await self.session.execute(
            text("UPDATE api_keys SET last_used_at = NOW() WHERE id = :id::uuid"),
            {"id": data["id"]},
        )
        await self.session.commit()
        scopes = data.get("scopes")
        if isinstance(scopes, str):
            import json
            scopes = json.loads(scopes)
        data["scopes"] = scopes or []
        return data

    async def list_api_keys(self, workspace_id: int) -> list[dict[str, Any]]:
        await WebhookService.ensure_schema()
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, key_prefix, scopes,
                       expires_at, revoked_at, last_used_at, created_at
                FROM api_keys
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                """
            ),
            {"ws": workspace_id},
        )
        return [_row(x) for x in r.fetchall()]

    async def get_api_key(self, key_id: str, workspace_id: int) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, key_prefix, scopes,
                       expires_at, revoked_at, last_used_at, created_at
                FROM api_keys
                WHERE id = :id::uuid AND workspace_id = :ws
                """
            ),
            {"id": key_id, "ws": workspace_id},
        )
        row = r.fetchone()
        return _row(row) if row else None


def get_api_keys_service(session: AsyncSession, workspace_id: int | None = None) -> APIKeysService:
    return APIKeysService(session, workspace_id)
