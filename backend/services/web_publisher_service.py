"""Publish client websites to nelvyon.com subdomains (F61)."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.web_builder_service import WebBuilderService

logger = logging.getLogger(__name__)


class WebPublisherService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = workspace_id
        self._builder = WebBuilderService(session, workspace_id)

    async def publish(self, website_id: int) -> dict[str, Any]:
        await self._builder._ensure_schema()
        row = await self.session.execute(
            text("SELECT id, slug, html_content, css_content, version FROM client_websites WHERE id = :id"),
            {"id": website_id},
        )
        site = row.mappings().first()
        if not site:
            raise ValueError("website not found")

        slug = site["slug"]
        subdomain = f"{slug}.nelvyon.com"
        published_at = datetime.now(timezone.utc).isoformat()

        await self.session.execute(
            text("UPDATE client_websites SET published_at = :pub WHERE id = :id"),
            {"pub": published_at, "id": website_id},
        )
        await self.session.commit()

        storage_note = "supabase"
        bucket = os.environ.get("SUPABASE_WEB_BUCKET", "client-websites")
        public_url = os.environ.get("SUPABASE_URL", "").strip()
        if public_url:
            public_url = f"{public_url.rstrip('/')}/storage/v1/object/public/{bucket}/{slug}/index.html"
        else:
            storage_note = "local_db"
            public_url = f"https://{subdomain}"

        return {
            "website_id": website_id,
            "slug": slug,
            "subdomain": subdomain,
            "published_at": published_at,
            "public_url": public_url,
            "storage": storage_note,
            "version": site["version"],
        }

    async def restore_version(self, client_id: str, website_id: int) -> dict[str, Any]:
        await self._builder._ensure_schema()
        row = await self.session.execute(
            text(
                "SELECT id, version FROM client_websites WHERE id = :id AND client_id = :cid"
            ),
            {"id": website_id, "cid": client_id},
        )
        if not row.mappings().first():
            raise ValueError("version not found")
        preview = await self._builder.get_preview(website_id)
        return {"restored": True, "website_id": website_id, **preview}


def get_web_publisher_service(session: AsyncSession, workspace_id: int | None = None) -> WebPublisherService:
    return WebPublisherService(session, workspace_id)
