"""OAuth helpers for social platform connections."""

from __future__ import annotations

import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from core.redis_adapter import redis_client
from services.social_token_crypto import decrypt_token, encrypt_token

logger = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v19.0"
_STATE_TTL = 600


def _state_key(state: str) -> str:
    return f"social:oauth_state:{state}"


async def _save_state(state: str, payload: dict[str, Any]) -> None:
    await redis_client.initialize()
    await redis_client.set(_state_key(state), json.dumps(payload), ttl=_STATE_TTL)


async def _load_state(state: str) -> dict[str, Any] | None:
    await redis_client.initialize()
    raw = await redis_client.get(_state_key(state))
    if not raw:
        return None
    return json.loads(raw)


def _platform_env(platform: str) -> dict[str, str]:
    p = platform.lower()
    if p == "instagram":
        return {
            "client_id": os.environ.get("INSTAGRAM_APP_ID", ""),
            "client_secret": os.environ.get("INSTAGRAM_APP_SECRET", ""),
        }
    if p == "facebook":
        return {
            "client_id": os.environ.get("FACEBOOK_APP_ID", ""),
            "client_secret": os.environ.get("FACEBOOK_APP_SECRET", ""),
        }
    if p == "linkedin":
        return {
            "client_id": os.environ.get("LINKEDIN_CLIENT_ID", ""),
            "client_secret": os.environ.get("LINKEDIN_CLIENT_SECRET", ""),
        }
    if p == "tiktok":
        return {
            "client_id": os.environ.get("TIKTOK_CLIENT_KEY", "") or os.environ.get("TIKTOK_APP_ID", ""),
            "client_secret": os.environ.get("TIKTOK_CLIENT_SECRET", "") or os.environ.get("TIKTOK_APP_SECRET", ""),
        }
    return {"client_id": "", "client_secret": ""}


async def get_oauth_url(platform: str, tenant_id: int, redirect_uri: str) -> dict[str, Any]:
    env = _platform_env(platform)
    if not env["client_id"]:
        return {
            "platform": platform,
            "configured": False,
            "message": f"OAuth not configured for {platform}. Set API keys on Railway.",
            "url": None,
        }

    state = secrets.token_urlsafe(24)
    await _save_state(
        state,
        {"tenant_id": tenant_id, "platform": platform, "redirect_uri": redirect_uri},
    )

    p = platform.lower()
    if p == "linkedin":
        params = urlencode(
            {
                "response_type": "code",
                "client_id": env["client_id"],
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": "openid profile w_member_social email",
            }
        )
        url = f"https://www.linkedin.com/oauth/v2/authorization?{params}"
    elif p == "tiktok":
        params = urlencode(
            {
                "client_key": env["client_id"],
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "user.info.basic,video.publish",
                "state": state,
            }
        )
        url = f"https://www.tiktok.com/v2/auth/authorize/?{params}"
    else:
        scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_manage_posts"
        if p == "facebook":
            scopes = "pages_show_list,pages_manage_posts,pages_read_engagement"
        params = urlencode(
            {
                "client_id": env["client_id"],
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": scopes,
                "response_type": "code",
            }
        )
        url = f"https://www.facebook.com/v19.0/dialog/oauth?{params}"

    return {"platform": platform, "configured": True, "state": state, "url": url}


async def handle_oauth_callback(
    session,
    platform: str,
    code: str,
    state: str,
) -> dict[str, Any]:
    payload = await _load_state(state)
    if not payload:
        raise ValueError("Invalid or expired OAuth state")

    tenant_id = int(payload["tenant_id"])
    redirect_uri = payload["redirect_uri"]
    env = _platform_env(platform)
    if not env["client_id"] or not env["client_secret"]:
        raise ValueError(f"OAuth not configured for {platform}")

    access_token = ""
    refresh_token = None
    expires_at = datetime.now(timezone.utc) + timedelta(days=60)
    account_id = ""
    account_name = platform.title()

    async with httpx.AsyncClient(timeout=30.0) as client:
        p = platform.lower()
        if p == "linkedin":
            r = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": env["client_id"],
                    "client_secret": env["client_secret"],
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            data = r.json()
            access_token = data["access_token"]
            expires_in = int(data.get("expires_in", 5184000))
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            me = await client.get(
                "https://api.linkedin.com/v2/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if me.status_code < 400:
                j = me.json()
                account_id = j.get("id", "")
                account_name = f"{j.get('localizedFirstName', '')} {j.get('localizedLastName', '')}".strip()
        elif p == "tiktok":
            r = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                json={
                    "client_key": env["client_id"],
                    "client_secret": env["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            r.raise_for_status()
            data = r.json().get("data", r.json())
            access_token = data.get("access_token", "")
            refresh_token = data.get("refresh_token")
            expires_in = int(data.get("expires_in", 86400))
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            account_id = data.get("open_id", str(uuid.uuid4())[:16])
            account_name = data.get("display_name", "TikTok")
        else:
            r = await client.get(
                f"{GRAPH}/oauth/access_token",
                params={
                    "client_id": env["client_id"],
                    "client_secret": env["client_secret"],
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            r.raise_for_status()
            data = r.json()
            access_token = data.get("access_token", "")
            expires_in = int(data.get("expires_in", 5184000))
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

            if p == "instagram":
                pages = await client.get(
                    f"{GRAPH}/me/accounts",
                    params={"access_token": access_token},
                )
                if pages.status_code < 400 and pages.json().get("data"):
                    page = pages.json()["data"][0]
                    page_token = page.get("access_token", access_token)
                    ig = await client.get(
                        f"{GRAPH}/{page['id']}",
                        params={"fields": "instagram_business_account", "access_token": page_token},
                    )
                    if ig.status_code < 400:
                        ig_id = ig.json().get("instagram_business_account", {}).get("id")
                        if ig_id:
                            account_id = ig_id
                            account_name = page.get("name", "Instagram")
                            access_token = page_token
            elif p == "facebook":
                pages = await client.get(
                    f"{GRAPH}/me/accounts",
                    params={"access_token": access_token},
                )
                if pages.status_code < 400 and pages.json().get("data"):
                    page = pages.json()["data"][0]
                    account_id = page.get("id", "")
                    account_name = page.get("name", "Facebook Page")
                    access_token = page.get("access_token", access_token)

    from services.social_scheduler_service import SocialSchedulerService

    svc = SocialSchedulerService(session, tenant_id)
    account = await svc.connect_account(
        tenant_id,
        platform,
        access_token,
        oauth_token_secret=refresh_token,
        account_id=account_id or str(uuid.uuid4())[:12],
        account_name=account_name or platform,
    )
    return {"account": account, "platform": platform}


async def refresh_token(session, account_id: str, tenant_id: int) -> dict[str, Any]:
    """Refresh token if expiring within 7 days."""
    from sqlalchemy import text

    r = await session.execute(
        text("SELECT * FROM social_accounts WHERE id = :id::uuid AND tenant_id = :tid"),
        {"id": account_id, "tid": tenant_id},
    )
    row = r.fetchone()
    if not row:
        raise ValueError("Account not found")
    m = dict(row._mapping)
    expires = m.get("token_expires_at")
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires > datetime.now(timezone.utc) + timedelta(days=7):
        return {"refreshed": False, "reason": "Token still valid"}

    platform = m["platform"]
    env = _platform_env(platform)
    refresh = decrypt_token(m.get("oauth_token_secret"))
    if not refresh:
        return {"refreshed": False, "reason": "No refresh token stored"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        if platform == "linkedin":
            resp = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh,
                    "client_id": env["client_id"],
                    "client_secret": env["client_secret"],
                },
            )
            if resp.status_code >= 400:
                return {"refreshed": False, "error": resp.text[:200]}
            data = resp.json()
            new_token = data["access_token"]
            expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=int(data.get("expires_in", 5184000))
            )
        else:
            return {"refreshed": False, "reason": f"Refresh not implemented for {platform}"}

    await session.execute(
        text(
            """
            UPDATE social_accounts
            SET oauth_token = :token, token_expires_at = :exp, status = 'active', updated_at = NOW()
            WHERE id = :id::uuid
            """
        ),
        {
            "id": account_id,
            "token": encrypt_token(new_token),
            "exp": expires_at,
        },
    )
    await session.commit()
    return {"refreshed": True, "expires_at": expires_at.isoformat()}
