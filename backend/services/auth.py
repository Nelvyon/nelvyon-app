import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from core.auth import create_access_token
from core.config import settings
from core.database import db_manager
from models.auth import OIDCState, User
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _split_id_list(raw: str) -> set[str]:
    if not raw or not str(raw).strip():
        return set()
    return {x.strip() for x in str(raw).split(",") if x.strip()}


def resolve_platform_role(platform_sub: str) -> str:
    """
    Map platform user id to application role.
    Order: primary ADMIN_USER_ID (owner) -> SUPER_ADMIN_USER_IDS -> default user.
    Owner and listed IDs receive super_admin so JWT aligns with frontend OS routes (requireSuperAdmin).
    """
    admin_id = getattr(settings, "admin_user_id", None)
    if admin_id is not None and str(platform_sub) == str(admin_id):
        return "super_admin"
    super_ids = _split_id_list(getattr(settings, "super_admin_user_ids", "") or "")
    if str(platform_sub) in super_ids:
        return "super_admin"
    return "user"


def should_run_admin_bootstrap() -> bool:
    """Seed admin user only in non-prod, or when explicitly allowed."""
    if os.getenv("MGX_IGNORE_INIT_ADMIN"):
        return False
    if settings.is_production and not settings.allow_admin_bootstrap:
        logger.info("Skipping admin user bootstrap (production without ALLOW_ADMIN_BOOTSTRAP)")
        return False
    return True


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_user(self, platform_sub: str, email: str, name: Optional[str] = None) -> User:
        """Get existing user or create new one."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_or_create_user - platform_sub: {platform_sub}")
        # Try to find existing user
        result = await self.db.execute(select(User).where(User.id == platform_sub))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        resolved_role = resolve_platform_role(platform_sub)

        if user:
            # Update user info; sync role from env lists (admin / super_admin promotion)
            user.email = email
            user.name = name
            user.last_login = datetime.now(timezone.utc)
            user.role = resolved_role
        else:
            # Create new user
            user = User(
                id=platform_sub,
                email=email,
                name=name,
                role=resolved_role,
                last_login=datetime.now(timezone.utc),
            )
            self.db.add(user)

        start_time_commit = time.time()
        logger.debug("[DB_OP] Starting user commit/refresh")
        await self.db.commit()
        await self.db.refresh(user)
        logger.debug(f"[DB_OP] User commit/refresh completed in {time.time() - start_time_commit:.4f}s")
        return user

    async def issue_app_token(
        self,
        user: User,
    ) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        claims: Dict[str, Any] = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login.isoformat()
        token = create_access_token(claims, expires_minutes=expires_minutes)

        return token, expires_at, claims

    async def store_oidc_state(self, state: str, nonce: str, code_verifier: str):
        """Store OIDC state in database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minute expiry

        oidc_state = OIDCState(state=state, nonce=nonce, code_verifier=code_verifier, expires_at=expires_at)

        self.db.add(oidc_state)
        await self.db.commit()

    async def get_and_delete_oidc_state(self, state: str) -> Optional[dict]:
        """Get and delete OIDC state from database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        # Find and validate state
        result = await self.db.execute(select(OIDCState).where(OIDCState.state == state))
        oidc_state = result.scalar_one_or_none()

        if not oidc_state:
            return None

        # Extract data before deleting
        state_data = {"nonce": oidc_state.nonce, "code_verifier": oidc_state.code_verifier}

        # Delete the used state (one-time use)
        await self.db.delete(oidc_state)
        await self.db.commit()

        return state_data


async def initialize_admin_user():
    """Initialize admin user if not exists (disabled in production unless ALLOW_ADMIN_BOOTSTRAP)."""
    if not should_run_admin_bootstrap():
        return

    from services.database import initialize_database

    # Ensure database is initialized first
    await initialize_database()

    admin_user_id = getattr(settings, "admin_user_id", "")
    admin_user_email = getattr(settings, "admin_user_email", "")

    if not admin_user_id or not admin_user_email:
        logger.warning("Admin user ID or email not configured, skipping admin initialization")
        return

    async with db_manager.async_session_maker() as db:
        # Check if admin user already exists
        result = await db.execute(select(User).where(User.id == admin_user_id))
        user = result.scalar_one_or_none()

        if user:
            if user.role != "super_admin":
                user.role = "super_admin"
                user.email = admin_user_email  # Update email too
                await db.commit()
                logger.debug("Updated user %s to super_admin role", admin_user_id)
            else:
                logger.debug("Admin user %s already exists", admin_user_id)
        else:
            admin_user = User(id=admin_user_id, email=admin_user_email, role="super_admin")
            db.add(admin_user)
            await db.commit()
            logger.debug("Created admin user: %s with email: %s", admin_user_id, admin_user_email)
