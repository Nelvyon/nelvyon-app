"""DALL·E 3 — always-on image generation with Supabase persistence."""

from __future__ import annotations

import io
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from openai import AsyncOpenAI

from services.image_optimizer import optimize_image_bytes
from services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

AGENT_RESULTS_BUCKET = "agent-results"
DALLE_PREFIX = "dalle/"

SUPPORTED_SIZES = frozenset({"1024x1024", "1792x1024", "1024x1792"})
SUPPORTED_QUALITY = frozenset({"standard", "hd"})
SUPPORTED_STYLE = frozenset({"vivid", "natural"})


class DalleService:
    """OpenAI DALL·E 3 generate + DALL·E 2 variations/edit, stored in Supabase."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self._client: AsyncOpenAI | None = None
        self.supabase = get_supabase_service()

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        api_key = (
            os.environ.get("OPENAI_API_KEY", "").strip()
            or os.environ.get("APP_AI_KEY", "").strip()
        )
        if not api_key:
            self._mock = True
            logger.info("DalleService: OPENAI_API_KEY not set — mock mode")
            return

        base_url = os.environ.get("OPENAI_BASE_URL", "").strip() or os.environ.get(
            "APP_AI_BASE_URL", ""
        ).strip()
        if base_url:
            self._client = AsyncOpenAI(api_key=api_key, base_url=base_url.rstrip("/"))
        else:
            self._client = AsyncOpenAI(api_key=api_key)
        logger.info("DalleService: OpenAI client ready")

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _client_or_raise(self) -> AsyncOpenAI:
        self._ensure_config()
        if self._mock or self._client is None:
            raise RuntimeError("OpenAI API not configured (mock mode)")
        return self._client

    @staticmethod
    def _validate_generate_params(
        size: str,
        quality: str,
        style: str,
    ) -> tuple[str, str, str]:
        if size not in SUPPORTED_SIZES:
            raise ValueError(f"size must be one of: {', '.join(sorted(SUPPORTED_SIZES))}")
        if quality not in SUPPORTED_QUALITY:
            raise ValueError(f"quality must be one of: {', '.join(sorted(SUPPORTED_QUALITY))}")
        if style not in SUPPORTED_STYLE:
            raise ValueError(f"style must be one of: {', '.join(sorted(SUPPORTED_STYLE))}")
        return size, quality, style

    @staticmethod
    async def _download_image(image_url: str) -> bytes:
        url = image_url.strip()
        if not url.startswith(("http://", "https://")):
            raise ValueError("image_url must be an http(s) URL")
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    @staticmethod
    def _bytes_to_png_file(data: bytes, name: str = "image.png") -> io.BytesIO:
        upload = io.BytesIO(data)
        upload.name = name  # type: ignore[attr-defined]
        return upload

    async def _persist_result(
        self,
        *,
        operation: str,
        prompt: str,
        image_bytes: bytes,
        extra: dict[str, Any] | None = None,
        source_url: str | None = None,
    ) -> dict[str, Any]:
        record_id = uuid.uuid4().hex
        image_path = f"{DALLE_PREFIX}{record_id}.png"
        meta_path = f"{DALLE_PREFIX}{record_id}.json"

        upload = await self.supabase.upload_bytes(
            AGENT_RESULTS_BUCKET,
            image_path,
            image_bytes,
            content_type="image/png",
        )

        optimized: dict[str, Any] = {}
        try:
            optimized = await optimize_image_bytes(
                image_bytes,
                base_id=record_id,
                bucket=AGENT_RESULTS_BUCKET,
                prefix=DALLE_PREFIX,
            )
        except Exception as exc:
            logger.warning("WebP optimization failed, keeping PNG only: %s", exc)

        variants = optimized.get("variants") or {}
        public_url = (
            variants.get("desktop")
            or upload.get("public_url")
            or self.supabase.public_url(AGENT_RESULTS_BUCKET, image_path)
        )

        metadata: dict[str, Any] = {
            "id": record_id,
            "operation": operation,
            "prompt": prompt,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "image_path": image_path,
            "public_url": public_url,
            "imageVariants": variants,
            "image_width": optimized.get("width"),
            "image_height": optimized.get("height"),
            "mock_storage": upload.get("mock", False),
            "source_url": source_url,
            **(extra or {}),
        }
        await self.supabase.upload_json(AGENT_RESULTS_BUCKET, meta_path, metadata)

        return {
            **metadata,
            "meta_path": meta_path,
            "storage": upload,
        }

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        style: str = "vivid",
    ) -> dict[str, Any]:
        self._ensure_config()
        text = prompt.strip()
        if not text:
            raise ValueError("prompt is required")
        size, quality, style = self._validate_generate_params(size, quality, style)

        if self._mock:
            record_id = uuid.uuid4().hex
            return {
                "mock": True,
                "id": record_id,
                "operation": "generate",
                "prompt": text,
                "size": size,
                "quality": quality,
                "style": style,
                "revised_prompt": f"[mock] {text}",
                "public_url": f"https://mock.nelvyon.local/dalle/{record_id}.png",
            }

        client = self._client_or_raise()
        response = await client.images.generate(
            model="dall-e-3",
            prompt=text,
            size=size,  # type: ignore[arg-type]
            quality=quality,  # type: ignore[arg-type]
            style=style,  # type: ignore[arg-type]
            n=1,
            response_format="url",
        )

        if not response.data:
            raise RuntimeError("DALL·E 3 returned empty result")

        item = response.data[0]
        source_url = item.url
        if not source_url:
            raise RuntimeError("DALL·E 3 response missing image URL")

        image_bytes = await self._download_image(source_url)
        persisted = await self._persist_result(
            operation="generate",
            prompt=text,
            image_bytes=image_bytes,
            source_url=source_url,
            extra={
                "size": size,
                "quality": quality,
                "style": style,
                "revised_prompt": getattr(item, "revised_prompt", None),
                "model": "dall-e-3",
            },
        )
        return {"mock": False, **persisted}

    async def generate_variations(self, image_url: str, n: int = 1) -> dict[str, Any]:
        self._ensure_config()
        count = max(1, min(int(n), 10))

        if self._mock:
            return {
                "mock": True,
                "operation": "variations",
                "count": count,
                "variations": [
                    {
                        "id": uuid.uuid4().hex,
                        "public_url": f"https://mock.nelvyon.local/dalle/var-{i}.png",
                    }
                    for i in range(count)
                ],
            }

        image_bytes = await self._download_image(image_url)
        client = self._client_or_raise()
        image_file = self._bytes_to_png_file(image_bytes)

        response = await client.images.create_variation(
            image=image_file,
            n=count,
            size="1024x1024",
            response_format="url",
        )

        variations: list[dict[str, Any]] = []
        for idx, item in enumerate(response.data or []):
            url = item.url
            if not url:
                continue
            var_bytes = await self._download_image(url)
            persisted = await self._persist_result(
                operation="variations",
                prompt=f"variation:{idx + 1}",
                image_bytes=var_bytes,
                source_url=url,
                extra={"variation_index": idx + 1, "source_image_url": image_url, "model": "dall-e-2"},
            )
            variations.append(persisted)

        return {"mock": False, "operation": "variations", "count": len(variations), "variations": variations}

    async def edit_image(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
    ) -> dict[str, Any]:
        self._ensure_config()
        text = prompt.strip()
        if not text:
            raise ValueError("prompt is required")

        if self._mock:
            record_id = uuid.uuid4().hex
            return {
                "mock": True,
                "id": record_id,
                "operation": "edit",
                "prompt": text,
                "public_url": f"https://mock.nelvyon.local/dalle/edit-{record_id}.png",
            }

        image_bytes = await self._download_image(image_url)
        mask_bytes = await self._download_image(mask_url)
        client = self._client_or_raise()

        response = await client.images.edit(
            image=self._bytes_to_png_file(image_bytes, "image.png"),
            mask=self._bytes_to_png_file(mask_bytes, "mask.png"),
            prompt=text,
            n=1,
            size="1024x1024",
            response_format="url",
        )

        if not response.data:
            raise RuntimeError("Image edit returned empty result")

        item = response.data[0]
        source_url = item.url
        if not source_url:
            raise RuntimeError("Edit response missing image URL")

        edited_bytes = await self._download_image(source_url)
        persisted = await self._persist_result(
            operation="edit",
            prompt=text,
            image_bytes=edited_bytes,
            source_url=source_url,
            extra={
                "source_image_url": image_url,
                "mask_url": mask_url,
                "model": "dall-e-2",
            },
        )
        return {"mock": False, **persisted}

    async def get_history(self, limit: int = 50) -> dict[str, Any]:
        capped = max(1, min(limit, 200))
        objects = await self.supabase.list_objects(
            AGENT_RESULTS_BUCKET,
            prefix=DALLE_PREFIX,
            limit=capped * 2,
        )

        history: list[dict[str, Any]] = []
        for obj in objects:
            name = obj.get("name") or ""
            if not name.endswith(".json"):
                continue
            storage_path = name if name.startswith(DALLE_PREFIX) else f"{DALLE_PREFIX}{name}"
            meta_bytes = await self.supabase.download_bytes(AGENT_RESULTS_BUCKET, storage_path)
            if not meta_bytes:
                continue
            try:
                entry = json.loads(meta_bytes.decode("utf-8"))
                if isinstance(entry, dict):
                    history.append(entry)
            except Exception:
                continue
            if len(history) >= capped:
                break

        history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {
            "mock": self.is_mock or self.supabase.is_mock,
            "count": len(history),
            "items": history[:capped],
        }


_dalle_service: DalleService | None = None


def get_dalle_service() -> DalleService:
    global _dalle_service
    if _dalle_service is None:
        _dalle_service = DalleService()
    return _dalle_service
