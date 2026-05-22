"""Supabase Storage — upload/list for agent-generated assets."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class SupabaseService:
    """Minimal Supabase Storage client (service role, lazy config)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.base_url = ""
        self.service_key = ""

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        self.base_url = (
            os.environ.get("SUPABASE_URL", "").strip()
            or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
        ).rstrip("/")
        self.service_key = (
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            or os.environ.get("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not self.base_url or not self.service_key:
            self._mock = True
            logger.info("SupabaseService: SUPABASE_URL or service role key missing — mock mode")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _headers(self, content_type: str = "application/octet-stream") -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
            "Content-Type": content_type,
        }

    def public_url(self, bucket: str, path: str) -> str:
        clean = path.lstrip("/")
        return f"{self.base_url}/storage/v1/object/public/{bucket}/{clean}"

    async def upload_bytes(
        self,
        bucket: str,
        path: str,
        data: bytes,
        *,
        content_type: str = "image/png",
        upsert: bool = True,
    ) -> dict[str, Any]:
        self._ensure_config()
        clean_path = path.lstrip("/")
        if self._mock:
            return {
                "mock": True,
                "bucket": bucket,
                "path": clean_path,
                "public_url": f"https://mock.supabase.local/{bucket}/{clean_path}",
            }

        url = f"{self.base_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = self._headers(content_type)
        if upsert:
            headers["x-upsert"] = "true"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, headers=headers, content=data)
            if response.status_code >= 400:
                logger.warning("Supabase upload failed: %s %s", response.status_code, response.text)
                return {
                    "mock": False,
                    "ok": False,
                    "status_code": response.status_code,
                    "error": response.text,
                }

        return {
            "mock": False,
            "ok": True,
            "bucket": bucket,
            "path": clean_path,
            "public_url": self.public_url(bucket, clean_path),
        }

    async def upload_json(self, bucket: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        return await self.upload_bytes(
            bucket,
            path,
            body,
            content_type="application/json",
        )

    async def list_objects(
        self,
        bucket: str,
        *,
        prefix: str = "",
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        self._ensure_config()
        if self._mock:
            return []

        url = f"{self.base_url}/storage/v1/object/list/{bucket}"
        body = {
            "prefix": prefix,
            "limit": limit,
            "sortBy": {"column": "created_at", "order": "desc"},
        }
        headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code >= 400:
                logger.warning("Supabase list failed: %s %s", response.status_code, response.text)
                return []
            data = response.json()
            return data if isinstance(data, list) else []

    async def download_bytes(self, bucket: str, path: str) -> bytes | None:
        self._ensure_config()
        if self._mock:
            return None

        clean_path = path.lstrip("/")
        url = f"{self.base_url}/storage/v1/object/public/{bucket}/{clean_path}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            if response.status_code >= 400:
                url = f"{self.base_url}/storage/v1/object/{bucket}/{clean_path}"
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.service_key}",
                        "apikey": self.service_key,
                    },
                )
            if response.status_code >= 400:
                return None
            return response.content


_supabase_service: SupabaseService | None = None


def get_supabase_service() -> SupabaseService:
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
