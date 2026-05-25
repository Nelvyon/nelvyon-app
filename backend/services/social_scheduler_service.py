"""NELVYON social media scheduler — accounts, posts, publishing, analytics."""

from __future__ import annotations

import io
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import db_manager
from core.redis_adapter import redis_client
from services.social_publishers import publish_to_platform
from services.social_token_crypto import decrypt_token, encrypt_token
from services.supabase_service import get_supabase_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
MEDIA_BUCKET = "social-media"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME = frozenset(
    {"image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"}
)


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


def _parse_jsonb(val: Any) -> Any:
    if isinstance(val, str):
        return json.loads(val)
    return val or []


class SocialSchedulerService:
    """Workspace-scoped social scheduling."""

    def __init__(self, session: AsyncSession, tenant_id: int | None = None):
        self.session = session
        self.tenant_id = int(tenant_id) if tenant_id is not None else None

    @staticmethod
    async def ensure_schema() -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        await TenantService.ensure_schema()
        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "social_scheduler.sql"
        if sql_path.exists():
            raw = sql_path.read_text(encoding="utf-8")
            async with db_manager.async_session_maker() as session:
                for stmt in [s.strip() for s in raw.split(";") if s.strip()]:
                    try:
                        await session.execute(text(stmt))
                    except Exception as exc:
                        if "already exists" not in str(exc).lower():
                            logger.debug("social_scheduler schema skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, tenant_id: int) -> None:
        await TenantService(self.session).set_tenant_context(tenant_id)

    async def connect_account(
        self,
        tenant_id: int,
        platform: str,
        oauth_token: str,
        *,
        oauth_token_secret: str | None = None,
        account_id: str,
        account_name: str,
        avatar_url: str | None = None,
        token_expires_at: datetime | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        platform = platform.lower()
        if platform not in ("instagram", "linkedin", "facebook", "tiktok"):
            raise ValueError("Invalid platform")

        acc_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO social_accounts (
                    id, tenant_id, platform, account_id, account_name, avatar_url,
                    oauth_token, oauth_token_secret, token_expires_at, status
                )
                VALUES (
                    :id, :tid, :platform, :aid, :aname, :avatar,
                    :token, :secret, :exp, 'active'
                )
                ON CONFLICT (tenant_id, platform, account_id) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    avatar_url = EXCLUDED.avatar_url,
                    oauth_token = EXCLUDED.oauth_token,
                    oauth_token_secret = EXCLUDED.oauth_token_secret,
                    token_expires_at = EXCLUDED.token_expires_at,
                    status = 'active',
                    updated_at = NOW()
                RETURNING id, tenant_id, platform, account_id, account_name, avatar_url,
                          status, follower_count, token_expires_at, created_at
                """
            ),
            {
                "id": acc_id,
                "tid": tenant_id,
                "platform": platform,
                "aid": account_id,
                "aname": account_name,
                "avatar": avatar_url,
                "token": encrypt_token(oauth_token),
                "secret": encrypt_token(oauth_token_secret),
                "exp": token_expires_at,
            },
        )
        await self.session.commit()
        return self._public_account(_row(r.fetchone()))

    async def disconnect_account(self, tenant_id: int, account_id: str) -> bool:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        r = await self.session.execute(
            text(
                """
                UPDATE social_accounts
                SET status = 'disconnected', updated_at = NOW()
                WHERE id = :id::uuid AND tenant_id = :tid
                """
            ),
            {"id": account_id, "tid": tenant_id},
        )
        await self.session.commit()
        return (r.rowcount or 0) > 0

    async def get_connected_accounts(self, tenant_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        r = await self.session.execute(
            text(
                """
                SELECT id, tenant_id, platform, account_id, account_name, avatar_url,
                       status, follower_count, token_expires_at, created_at, updated_at
                FROM social_accounts
                WHERE tenant_id = :tid AND status != 'disconnected'
                ORDER BY platform, account_name
                """
            ),
            {"tid": tenant_id},
        )
        return [self._public_account(_row(x)) for x in r.fetchall()]

    async def _get_workspace_timezone(self, tenant_id: int) -> str:
        r = await self.session.execute(
            text("SELECT timezone FROM workspaces WHERE id = :id"),
            {"id": tenant_id},
        )
        tz = r.scalar_one_or_none()
        return tz or "Europe/Madrid"

    async def _local_scheduled_to_utc(self, tenant_id: int, local_dt: datetime) -> datetime:
        from zoneinfo import ZoneInfo

        tz_name = await self._get_workspace_timezone(tenant_id)
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = ZoneInfo("UTC")
        if local_dt.tzinfo is None:
            local_dt = local_dt.replace(tzinfo=tz)
        return local_dt.astimezone(timezone.utc)

    async def create_post(
        self,
        tenant_id: int,
        account_ids: list[str],
        content: str,
        *,
        media_urls: list[str] | None = None,
        scheduled_at: datetime | None = None,
        post_type: str = "text",
        status: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        if not account_ids:
            raise ValueError("At least one account_id is required")

        if scheduled_at is not None and scheduled_at.tzinfo is None:
            scheduled_at = await self._local_scheduled_to_utc(tenant_id, scheduled_at)

        st = status or ("scheduled" if scheduled_at else "draft")
        post_id = str(uuid.uuid4())
        r = await self.session.execute(
            text(
                """
                INSERT INTO social_posts (
                    id, tenant_id, content, media_urls, account_ids,
                    post_type, status, scheduled_at
                )
                VALUES (
                    :id, :tid, :content, CAST(:media AS jsonb), CAST(:accounts AS jsonb),
                    :ptype, :status, :sched
                )
                RETURNING *
                """
            ),
            {
                "id": post_id,
                "tid": tenant_id,
                "content": content,
                "media": _json_dumps(media_urls or []),
                "accounts": _json_dumps(account_ids),
                "ptype": post_type,
                "status": st,
                "sched": scheduled_at,
            },
        )
        await self.session.commit()
        return _row(r.fetchone())

    async def update_post(self, post_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        await self.ensure_schema()
        post = await self._get_post_raw(post_id)
        if not post:
            raise ValueError("Post not found")
        await self._set_tenant(int(post["tenant_id"]))

        sets = ["updated_at = NOW()"]
        params: dict[str, Any] = {"id": post_id}
        if "content" in updates:
            sets.append("content = :content")
            params["content"] = updates["content"]
        if "media_urls" in updates:
            sets.append("media_urls = CAST(:media AS jsonb)")
            params["media"] = _json_dumps(updates["media_urls"])
        if "account_ids" in updates:
            sets.append("account_ids = CAST(:accounts AS jsonb)")
            params["accounts"] = _json_dumps(updates["account_ids"])
        if "scheduled_at" in updates:
            sets.append("scheduled_at = :sched")
            params["sched"] = updates["scheduled_at"]
        if "status" in updates:
            sets.append("status = :status")
            params["status"] = updates["status"]
        if "post_type" in updates:
            sets.append("post_type = :ptype")
            params["ptype"] = updates["post_type"]

        await self.session.execute(
            text(f"UPDATE social_posts SET {', '.join(sets)} WHERE id = :id::uuid"),
            params,
        )
        await self.session.commit()
        updated = await self._get_post_raw(post_id)
        return updated or {}

    async def delete_post(self, post_id: str) -> bool:
        await self.ensure_schema()
        r = await self.session.execute(
            text("DELETE FROM social_posts WHERE id = :id::uuid RETURNING id"),
            {"id": post_id},
        )
        await self.session.commit()
        return r.fetchone() is not None

    async def get_posts(
        self,
        tenant_id: int,
        *,
        status: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        platform: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        q = "SELECT * FROM social_posts WHERE tenant_id = :tid"
        params: dict[str, Any] = {
            "tid": tenant_id,
            "limit": page_size,
            "offset": (page - 1) * page_size,
        }
        if status:
            q += " AND status = :status"
            params["status"] = status
        if date_from:
            q += " AND created_at >= :dfrom"
            params["dfrom"] = date_from
        if date_to:
            q += " AND created_at <= :dto"
            params["dto"] = date_to
        q += " ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT :limit OFFSET :offset"
        r = await self.session.execute(text(q), params)
        items = [_row(x) for x in r.fetchall()]
        if platform:
            filtered = []
            for item in items:
                acc_ids = _parse_jsonb(item.get("account_ids"))
                if await self._post_has_platform(tenant_id, acc_ids, platform):
                    filtered.append(item)
            items = filtered
        return {"items": items, "page": page, "page_size": page_size}

    async def get_post(self, post_id: str, tenant_id: int | None = None) -> dict[str, Any] | None:
        post = await self._get_post_raw(post_id)
        if not post:
            return None
        if tenant_id is not None and int(post["tenant_id"]) != int(tenant_id):
            return None
        return post

    async def publish_now(self, post_id: str) -> dict[str, Any]:
        return await self.publish_post_by_id(post_id)

    async def publish_post_by_id(self, post_id: str) -> dict[str, Any]:
        """Publish post to all linked accounts (with graceful per-platform errors)."""
        await self.ensure_schema()
        post = await self._get_post_raw(post_id)
        if not post:
            raise ValueError("Post not found")

        tenant_id = int(post["tenant_id"])
        await self._set_tenant(tenant_id)
        account_ids = _parse_jsonb(post.get("account_ids"))
        media_urls = _parse_jsonb(post.get("media_urls"))
        content = post.get("content") or ""
        post_type = post.get("post_type") or "text"

        platform_post_ids: dict[str, str] = {}
        errors: list[str] = []
        any_pending = False
        any_success = False

        for acc_uuid in account_ids:
            acc = await self._get_account_raw(str(acc_uuid), tenant_id)
            if not acc or acc.get("status") != "active":
                errors.append(f"Account {acc_uuid} unavailable")
                continue
            platform = acc["platform"]
            pub_account = {
                "access_token": decrypt_token(acc.get("oauth_token")),
                "account_id": acc.get("account_id"),
            }
            result = await publish_to_platform(
                platform,
                pub_account,
                content=content,
                media_urls=media_urls,
                post_type=post_type,
            )
            if result.success:
                any_success = True
                platform_post_ids[platform] = result.platform_post_id or ""
            elif result.pending_auth:
                any_pending = True
                errors.append(result.error or f"{platform}: pending auth")
            else:
                errors.append(f"{platform}: {result.error}")

        if any_pending and not any_success:
            new_status = "pending_auth"
        elif any_success:
            new_status = "published"
        else:
            new_status = "failed"

        await self.session.execute(
            text(
                """
                UPDATE social_posts
                SET status = :status,
                    platform_post_ids = CAST(:pids AS jsonb),
                    published_at = CASE WHEN :status = 'published' THEN NOW() ELSE published_at END,
                    error_message = :err,
                    updated_at = NOW()
                WHERE id = :id::uuid
                """
            ),
            {
                "id": post_id,
                "status": new_status,
                "pids": _json_dumps(platform_post_ids),
                "err": "; ".join(errors)[:2000] if errors else None,
            },
        )
        await self.session.commit()
        return await self._get_post_raw(post_id) or {}

    async def get_calendar(self, tenant_id: int, year: int, month: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        r = await self.session.execute(
            text(
                """
                SELECT id, content, status, post_type, scheduled_at, published_at, account_ids
                FROM social_posts
                WHERE tenant_id = :tid
                  AND COALESCE(scheduled_at, published_at, created_at) >= :start
                  AND COALESCE(scheduled_at, published_at, created_at) < :end
                ORDER BY scheduled_at ASC NULLS LAST
                """
            ),
            {"tid": tenant_id, "start": start, "end": end},
        )
        by_day: dict[str, list] = {}
        for row in r.fetchall():
            item = _row(row)
            ts = item.get("scheduled_at") or item.get("published_at") or item.get("created_at")
            if not ts:
                continue
            if isinstance(ts, str):
                day = ts[:10]
            else:
                day = ts.strftime("%Y-%m-%d")
            by_day.setdefault(day, []).append(item)
        return {"year": year, "month": month, "days": by_day}

    async def get_analytics(self, tenant_id: int, post_id: str) -> list[dict[str, Any]]:
        await self.ensure_schema()
        await self._set_tenant(tenant_id)
        r = await self.session.execute(
            text(
                """
                SELECT a.* FROM social_post_analytics a
                JOIN social_posts p ON p.id = a.post_id
                WHERE a.post_id = :pid::uuid AND p.tenant_id = :tid
                ORDER BY a.fetched_at DESC
                """
            ),
            {"pid": post_id, "tid": tenant_id},
        )
        rows = [_row(x) for x in r.fetchall()]
        if not rows:
            await self._seed_analytics_stub(post_id)
            r = await self.session.execute(
                text("SELECT * FROM social_post_analytics WHERE post_id = :pid::uuid"),
                {"pid": post_id},
            )
            rows = [_row(x) for x in r.fetchall()]
        return rows

    async def get_account_analytics(
        self,
        tenant_id: int,
        account_id: str,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        acc = await self._get_account_raw(account_id, tenant_id)
        if not acc:
            raise ValueError("Account not found")
        return {
            "account_id": account_id,
            "platform": acc.get("platform"),
            "follower_count": acc.get("follower_count", 0),
            "posts_scheduled": await self._count_posts_for_account(tenant_id, account_id),
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": date_to.isoformat() if date_to else None,
        }

    async def upload_media(
        self,
        tenant_id: int,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
    ) -> dict[str, Any]:
        mime = (mime_type or "application/octet-stream").lower()
        if mime not in ALLOWED_MIME:
            raise ValueError(f"Unsupported media type: {mime_type}")

        data = file_bytes
        if mime.startswith("image/") and len(data) > MAX_IMAGE_BYTES:
            data = _compress_image(data, mime)

        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        path = f"{tenant_id}/{uuid.uuid4().hex}.{ext}"
        supabase = get_supabase_service()
        result = await supabase.upload_bytes(
            MEDIA_BUCKET,
            path,
            data,
            content_type=mime,
        )
        public_url = result.get("public_url") or supabase.public_url(MEDIA_BUCKET, path)
        return {"url": public_url, "path": path, "mime_type": mime, "size": len(data)}

    @staticmethod
    async def acquire_publish_lock(post_id: str, ttl_sec: int = 300) -> bool:
        await redis_client.initialize()
        key = f"social:publish_lock:{post_id}"
        if redis_client.is_redis and redis_client._client:
            return bool(await redis_client._client.set(key, "1", nx=True, ex=ttl_sec))
        if await redis_client.exists(key):
            return False
        await redis_client.set(key, "1", ttl=ttl_sec)
        return True

    @staticmethod
    async def release_publish_lock(post_id: str) -> None:
        await redis_client.delete(f"social:publish_lock:{post_id}")

    async def fetch_due_scheduled_posts(self) -> list[dict[str, Any]]:
        await self.ensure_schema()
        now = datetime.now(timezone.utc)
        r = await self.session.execute(
            text(
                """
                SELECT * FROM social_posts
                WHERE status = 'scheduled'
                  AND scheduled_at IS NOT NULL
                  AND scheduled_at <= :now
                  AND retry_count < 3
                ORDER BY scheduled_at ASC
                LIMIT 20
                """
            ),
            {"now": now},
        )
        return [_row(x) for x in r.fetchall()]

    async def increment_retry(self, post_id: str, error: str) -> None:
        await self.session.execute(
            text(
                """
                UPDATE social_posts
                SET retry_count = retry_count + 1,
                    error_message = :err,
                    updated_at = NOW(),
                    status = CASE WHEN retry_count + 1 >= 3 THEN 'failed' ELSE status END
                WHERE id = :id::uuid
                """
            ),
            {"id": post_id, "err": error[:2000]},
        )
        await self.session.commit()

    def _public_account(self, row: dict[str, Any]) -> dict[str, Any]:
        if not row:
            return {}
        row.pop("oauth_token", None)
        row.pop("oauth_token_secret", None)
        return row

    async def _get_post_raw(self, post_id: str) -> dict[str, Any] | None:
        r = await self.session.execute(
            text("SELECT * FROM social_posts WHERE id = :id::uuid"),
            {"id": post_id},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def _get_account_raw(self, account_uuid: str, tenant_id: int) -> dict[str, Any] | None:
        r = await self.session.execute(
            text(
                "SELECT * FROM social_accounts WHERE id = :id::uuid AND tenant_id = :tid"
            ),
            {"id": account_uuid, "tid": tenant_id},
        )
        row = r.fetchone()
        return _row(row) if row else None

    async def _post_has_platform(
        self, tenant_id: int, account_uuids: list, platform: str
    ) -> bool:
        for aid in account_uuids:
            acc = await self._get_account_raw(str(aid), tenant_id)
            if acc and acc.get("platform") == platform:
                return True
        return False

    async def _count_posts_for_account(self, tenant_id: int, account_id: str) -> int:
        r = await self.session.execute(
            text(
                """
                SELECT COUNT(*) AS cnt FROM social_posts
                WHERE tenant_id = :tid AND account_ids @> CAST(:aid AS jsonb)
                """
            ),
            {"tid": tenant_id, "aid": _json_dumps([account_id])},
        )
        row = r.fetchone()
        return int(row._mapping["cnt"]) if row else 0

    async def _seed_analytics_stub(self, post_id: str) -> None:
        post = await self._get_post_raw(post_id)
        if not post:
            return
        account_ids = _parse_jsonb(post.get("account_ids"))
        for acc_uuid in account_ids:
            acc = await self._get_account_raw(str(acc_uuid), int(post["tenant_id"]))
            if not acc:
                continue
            await self.session.execute(
                text(
                    """
                    INSERT INTO social_post_analytics (
                        post_id, platform, likes, comments, shares, reach, impressions, clicks
                    )
                    VALUES (:pid, :platform, 0, 0, 0, 0, 0, 0)
                    ON CONFLICT (post_id, platform) DO NOTHING
                    """
                ),
                {"pid": post_id, "platform": acc["platform"]},
            )
        await self.session.commit()


def _compress_image(data: bytes, mime: str) -> bytes:
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            mime = "image/jpeg"
        quality = 85
        while quality >= 40:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            out = buf.getvalue()
            if len(out) <= MAX_IMAGE_BYTES:
                return out
            quality -= 10
        return out
    except ImportError:
        logger.info("Pillow not installed — uploading image without compression")
        return data[:MAX_IMAGE_BYTES]
    except Exception as exc:
        logger.warning("Image compression failed: %s", exc)
        return data


def get_social_scheduler_service(
    session: AsyncSession, tenant_id: int | None = None
) -> SocialSchedulerService:
    return SocialSchedulerService(session, tenant_id)
