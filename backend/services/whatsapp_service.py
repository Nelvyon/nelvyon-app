"""WhatsApp Business Cloud API — lazy init, mock when credentials missing."""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v19.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

ALLOWED_MEDIA_TYPES = frozenset({"image", "video", "document"})


class WhatsAppService:
    """WhatsApp Cloud API client (httpx)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.token = ""
        self.phone_number_id = ""
        self.verify_token = os.environ.get("WHATSAPP_VERIFY_TOKEN", "").strip()
        self._messages_url = ""
        self._headers: dict[str, str] = {}

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        self.token = os.environ.get("WHATSAPP_TOKEN", "").strip()
        self.phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()

        if not self.token or not self.phone_number_id:
            self._mock = True
            logger.info(
                "WhatsAppService: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set — mock mode"
            )
            return

        self._messages_url = f"{GRAPH_API_BASE}/{self.phone_number_id}/messages"
        self._headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        logger.info("WhatsAppService: configured (phone_number_id=%s)", self.phone_number_id)

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    @staticmethod
    def _normalize_phone(to_phone: str) -> str:
        digits = "".join(c for c in to_phone if c.isdigit())
        if not digits:
            raise ValueError("to_phone must contain a valid phone number")
        return digits

    async def send_message(self, to_phone: str, message_text: str) -> dict[str, Any]:
        self._ensure_config()
        to = self._normalize_phone(to_phone)
        text = message_text.strip()
        if not text:
            raise ValueError("message_text is required")

        if self._mock:
            message_id = f"wamid.mock.{uuid.uuid4().hex}"
            logger.info("[WHATSAPP MOCK] text to=%s len=%d", to, len(text))
            return {
                "mock": True,
                "message_id": message_id,
                "to": to,
                "type": "text",
                "status": "accepted",
            }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        return await self._post_messages(payload)

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str,
        components: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        self._ensure_config()
        to = self._normalize_phone(to_phone)
        name = template_name.strip()
        lang = language_code.strip()
        if not name or not lang:
            raise ValueError("template_name and language_code are required")

        if self._mock:
            message_id = f"wamid.mock.{uuid.uuid4().hex}"
            logger.info("[WHATSAPP MOCK] template=%s to=%s lang=%s", name, to, lang)
            return {
                "mock": True,
                "message_id": message_id,
                "to": to,
                "type": "template",
                "template_name": name,
                "language_code": lang,
            }

        template: dict[str, Any] = {
            "name": name,
            "language": {"code": lang},
        }
        if components:
            template["components"] = components

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": template,
        }
        return await self._post_messages(payload)

    async def send_media(
        self,
        to_phone: str,
        media_url: str,
        media_type: str,
        caption: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_config()
        to = self._normalize_phone(to_phone)
        mtype = media_type.strip().lower()
        if mtype not in ALLOWED_MEDIA_TYPES:
            raise ValueError(f"media_type must be one of: {', '.join(sorted(ALLOWED_MEDIA_TYPES))}")
        link = media_url.strip()
        if not link:
            raise ValueError("media_url is required")

        if self._mock:
            message_id = f"wamid.mock.{uuid.uuid4().hex}"
            logger.info("[WHATSAPP MOCK] %s to=%s url=%s", mtype, to, link[:80])
            return {
                "mock": True,
                "message_id": message_id,
                "to": to,
                "type": mtype,
                "media_url": link,
            }

        media_obj: dict[str, Any] = {"link": link}
        if caption and caption.strip():
            media_obj["caption"] = caption.strip()

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": mtype,
            mtype: media_obj,
        }
        return await self._post_messages(payload)

    async def get_message_status(self, message_id: str) -> dict[str, Any]:
        self._ensure_config()
        mid = message_id.strip()
        if not mid:
            raise ValueError("message_id is required")

        if self._mock:
            return {
                "mock": True,
                "message_id": mid,
                "status": "delivered",
                "note": "Status simulated; configure WHATSAPP_TOKEN for live delivery webhooks",
            }

        url = f"{GRAPH_API_BASE}/{mid}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self._headers)
            if response.status_code >= 400:
                return {
                    "mock": False,
                    "message_id": mid,
                    "error": response.text,
                    "status_code": response.status_code,
                    "note": "Per-message status is primarily delivered via POST /api/whatsapp/webhook",
                }
            data = response.json()
            return {"mock": False, "message_id": mid, "graph": data}

    async def verify_webhook_subscription(
        self,
        hub_mode: str | None,
        hub_verify_token: str | None,
        hub_challenge: str | None,
    ) -> str | None:
        """Meta webhook verification — returns challenge string or None if invalid."""
        if hub_mode != "subscribe":
            return None
        if not self.verify_token:
            logger.warning("WHATSAPP_VERIFY_TOKEN not configured")
            return None
        if (hub_verify_token or "").strip() != self.verify_token:
            return None
        return hub_challenge or ""

    async def process_incoming_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Parse inbound Meta webhook payload (messages + status updates)."""
        messages_in = 0
        statuses_in = 0
        entries = payload.get("entry") or []

        for entry in entries:
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                for msg in value.get("messages") or []:
                    messages_in += 1
                    logger.info(
                        "whatsapp.inbound message from=%s type=%s id=%s",
                        msg.get("from"),
                        msg.get("type"),
                        msg.get("id"),
                    )
                for status in value.get("statuses") or []:
                    statuses_in += 1
                    logger.info(
                        "whatsapp.status id=%s status=%s recipient=%s",
                        status.get("id"),
                        status.get("status"),
                        status.get("recipient_id"),
                    )

        return {
            "ok": True,
            "messages_received": messages_in,
            "statuses_received": statuses_in,
        }

    async def _post_messages(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self._messages_url,
                headers=self._headers,
                json=payload,
            )
            try:
                body = response.json()
            except Exception:
                body = {"raw": response.text}

            if response.status_code >= 400:
                logger.warning(
                    "WhatsApp API error status=%s body=%s",
                    response.status_code,
                    body,
                )
                return {
                    "mock": False,
                    "ok": False,
                    "status_code": response.status_code,
                    "error": body,
                }

            message_id = None
            messages = body.get("messages") or []
            if messages:
                message_id = messages[0].get("id")

            return {
                "mock": False,
                "ok": True,
                "message_id": message_id,
                "response": body,
            }


_whatsapp_service: WhatsAppService | None = None


def get_whatsapp_service() -> WhatsAppService:
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
