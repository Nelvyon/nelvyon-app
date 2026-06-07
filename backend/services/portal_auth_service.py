"""Portal client authentication — invites, activation, login."""
from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import create_access_token
from models.os_clients import Os_clients
from models.os_portal_invites import Os_portal_invites
from models.os_portal_users import Os_portal_users

logger = logging.getLogger(__name__)

INVITE_TTL_DAYS = 7
PORTAL_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
_PBKDF2_ITERATIONS = 260_000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, expected = stored.split("$", 2)
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS
    )
    return secrets.compare_digest(digest.hex(), expected)


class PortalAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_client(
        self, client_id: str, *, workspace_id: int
    ) -> Optional[Os_clients]:
        q = select(Os_clients).where(
            Os_clients.id == client_id,
            Os_clients.workspace_id == workspace_id,
            Os_clients.status == "active",
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def create_invite(
        self,
        *,
        workspace_id: int,
        client_id: str,
        email: str,
        created_by_user_id: str,
    ) -> Dict[str, Any]:
        client = await self._get_client(client_id, workspace_id=workspace_id)
        if not client:
            raise ValueError("client_id not found in workspace")

        normalized = _normalize_email(email)
        if not normalized:
            raise ValueError("email is required")

        existing_user = await self.db.execute(
            select(Os_portal_users).where(
                Os_portal_users.workspace_id == workspace_id,
                Os_portal_users.email == normalized,
                Os_portal_users.status == "active",
            )
        )
        if existing_user.scalar_one_or_none():
            raise ValueError("portal user already exists for this email in workspace")

        raw_token = secrets.token_urlsafe(32)
        now = _utcnow()
        invite = Os_portal_invites(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            client_id=client_id,
            email=normalized,
            token_hash=_hash_token(raw_token),
            role="viewer",
            expires_at=now + timedelta(days=INVITE_TTL_DAYS),
            created_by_user_id=created_by_user_id,
            created_at=now,
        )
        self.db.add(invite)
        await self.db.commit()
        await self.db.refresh(invite)
        logger.info(
            "Created portal invite id=%s client=%s workspace=%s",
            invite.id,
            client_id,
            workspace_id,
        )
        try:
            from services.os_notification_service import notify_portal_invite_created

            await notify_portal_invite_created(
                self.db,
                workspace_id=workspace_id,
                email=normalized,
                token=raw_token,
                client_name=client.business_name or "Cliente",
                created_by_user_id=created_by_user_id,
            )
        except Exception as exc:
            logger.warning("Portal invite email failed: %s", exc)

        return {
            "invite_id": invite.id,
            "email": normalized,
            "client_id": client_id,
            "workspace_id": workspace_id,
            "expires_at": invite.expires_at,
            "token": raw_token,
        }

    async def accept_invite(
        self,
        *,
        token: str,
        password: str,
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        raw = (token or "").strip()
        if not raw:
            raise ValueError("token is required")
        if not password or len(password) < 8:
            raise ValueError("password must be at least 8 characters")

        token_hash = _hash_token(raw)
        q = select(Os_portal_invites).where(Os_portal_invites.token_hash == token_hash)
        result = await self.db.execute(q)
        invite = result.scalar_one_or_none()
        if not invite:
            raise ValueError("invalid or expired invite token")
        if invite.accepted_at is not None:
            raise ValueError("invite already accepted")
        expires = _as_utc(invite.expires_at)
        if expires and expires < _utcnow():
            raise ValueError("invalid or expired invite token")

        normalized = invite.email
        dup = await self.db.execute(
            select(Os_portal_users).where(
                Os_portal_users.workspace_id == invite.workspace_id,
                Os_portal_users.email == normalized,
            )
        )
        if dup.scalar_one_or_none():
            raise ValueError("portal user already exists for this email")

        now = _utcnow()
        user = Os_portal_users(
            id=str(uuid.uuid4()),
            workspace_id=invite.workspace_id,
            client_id=invite.client_id,
            email=normalized,
            password_hash=_hash_password(password),
            name=(name or "").strip() or None,
            status="active",
            invite_id=invite.id,
            created_at=now,
            updated_at=now,
        )
        invite.accepted_at = now
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        access_token = self._issue_portal_token(user)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": self._user_dict(user),
        }

    async def login(self, *, email: str, password: str) -> Dict[str, Any]:
        normalized = _normalize_email(email)
        if not normalized or not password:
            raise ValueError("email and password are required")

        q = select(Os_portal_users).where(
            Os_portal_users.email == normalized,
            Os_portal_users.status == "active",
        )
        result = await self.db.execute(q)
        user = result.scalar_one_or_none()
        if not user or not _verify_password(password, user.password_hash):
            raise ValueError("invalid email or password")

        now = _utcnow()
        user.last_login_at = now
        user.updated_at = now
        await self.db.commit()
        await self.db.refresh(user)

        return {
            "access_token": self._issue_portal_token(user),
            "token_type": "bearer",
            "user": self._user_dict(user),
        }

    async def list_invites_for_client(
        self, *, workspace_id: int, client_id: str
    ) -> list[Dict[str, Any]]:
        client = await self._get_client(client_id, workspace_id=workspace_id)
        if not client:
            return []
        q = (
            select(Os_portal_invites)
            .where(
                Os_portal_invites.workspace_id == workspace_id,
                Os_portal_invites.client_id == client_id,
            )
            .order_by(Os_portal_invites.created_at.desc())
        )
        result = await self.db.execute(q)
        rows = list(result.scalars().all())
        now = _utcnow()
        items: list[Dict[str, Any]] = []
        for row in rows:
            expires = _as_utc(row.expires_at)
            if row.accepted_at is not None:
                status = "accepted"
            elif expires and expires < now:
                status = "expired"
            else:
                status = "pending"
            items.append(
                {
                    "id": row.id,
                    "email": row.email,
                    "client_id": row.client_id,
                    "expires_at": expires.isoformat() if expires else None,
                    "accepted_at": row.accepted_at.isoformat() if row.accepted_at else None,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "status": status,
                }
            )
        return items

    async def get_portal_user(
        self, portal_user_id: str, *, workspace_id: int, client_id: str
    ) -> Optional[Os_portal_users]:
        q = select(Os_portal_users).where(
            Os_portal_users.id == portal_user_id,
            Os_portal_users.workspace_id == workspace_id,
            Os_portal_users.client_id == client_id,
            Os_portal_users.status == "active",
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    def _issue_portal_token(self, user: Os_portal_users) -> str:
        return create_access_token(
            {
                "sub": user.id,
                "email": user.email,
                "name": user.name,
                "role": "portal_viewer",
                "portal": True,
                "client_id": user.client_id,
                "workspace_id": user.workspace_id,
            },
            expires_minutes=PORTAL_TOKEN_EXPIRE_MINUTES,
        )

    @staticmethod
    def _user_dict(user: Os_portal_users) -> Dict[str, Any]:
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "client_id": user.client_id,
            "workspace_id": user.workspace_id,
        }
