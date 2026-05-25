"""Signaturit eIDAS electronic signature API — lazy init, mock when API key missing."""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_API_BASE = "https://api.signaturit.com/v1"
TIMEOUT_SECONDS = 120.0

_mock_store: dict[str, dict[str, Any]] = {}


class SignaturitService:
    """Signaturit REST client (httpx, multipart uploads)."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.api_key = ""
        self.api_base = DEFAULT_API_BASE
        self._headers: dict[str, str] = {}

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        self.api_key = os.environ.get("SIGNATURIT_API_KEY", "").strip()
        self.api_base = (
            os.environ.get("SIGNATURIT_API_BASE", DEFAULT_API_BASE).strip().rstrip("/")
            or DEFAULT_API_BASE
        )

        if not self.api_key:
            self._mock = True
            logger.info("SignaturitService: SIGNATURIT_API_KEY not set — mock mode")
            return

        self._headers = {"Authorization": f"Bearer {self.api_key}"}
        logger.info("SignaturitService: configured (base=%s)", self.api_base)

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _url(self, path: str) -> str:
        return f"{self.api_base}/{path.lstrip('/')}"

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        files: Any = None,
        data: dict[str, Any] | None = None,
    ) -> httpx.Response:
        self._ensure_config()
        if self._mock:
            raise RuntimeError("Signaturit mock mode — HTTP call skipped")

        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            return await client.request(
                method,
                self._url(path),
                headers=self._headers,
                json=json,
                params=params,
                files=files,
                data=data,
            )

    @staticmethod
    def _normalize_signers(signers: list[dict[str, Any]]) -> list[dict[str, str]]:
        if not signers:
            raise ValueError("At least one signer is required")
        out: list[dict[str, str]] = []
        for idx, raw in enumerate(signers):
            email = (raw.get("email") or "").strip()
            name = (raw.get("name") or email or f"Signer {idx + 1}").strip()
            if not email:
                raise ValueError(f"signers[{idx}].email is required")
            entry: dict[str, str] = {"email": email, "name": name}
            phone = raw.get("phone")
            if phone:
                entry["phone"] = str(phone).strip()
            out.append(entry)
        return out

    @staticmethod
    def _recipient_form_fields(signers: list[dict[str, str]]) -> dict[str, str]:
        fields: dict[str, str] = {}
        for i, signer in enumerate(signers):
            fields[f"recipients[{i}][email]"] = signer["email"]
            fields[f"recipients[{i}][name]"] = signer["name"]
            if signer.get("phone"):
                fields[f"recipients[{i}][phone]"] = signer["phone"]
        return fields

    def _mock_create(
        self,
        *,
        document_path: str,
        signers: list[dict[str, str]],
        subject: str,
        message: str,
    ) -> dict[str, Any]:
        sig_id = f"mock-sig-{uuid.uuid4().hex}"
        doc_id = f"mock-doc-{uuid.uuid4().hex[:12]}"
        record = {
            "mock": True,
            "id": sig_id,
            "subject": subject,
            "body": message,
            "status": "ready",
            "created_at": "2026-01-01T00:00:00+0000",
            "documents": [
                {
                    "id": doc_id,
                    "name": Path(document_path).name,
                    "status": "ready",
                    "file": {"name": Path(document_path).name, "pages": 1, "size": 1024},
                    "email": signers[0]["email"] if signers else "signer@example.com",
                }
            ],
            "signers": signers,
            "document_path": document_path,
        }
        _mock_store[sig_id] = record
        logger.info("[SIGNATURIT MOCK] create_signature_request id=%s", sig_id)
        return record

    async def create_signature_request(
        self,
        document_path: str,
        signers: list[dict[str, Any]],
        subject: str,
        message: str,
    ) -> dict[str, Any]:
        path = Path(document_path)
        if not path.is_file():
            raise ValueError(f"document not found: {document_path}")

        normalized = self._normalize_signers(signers)
        subject = subject.strip()
        message = message.strip()
        if not subject:
            raise ValueError("subject is required")
        if not message:
            raise ValueError("message is required")

        self._ensure_config()
        if self._mock:
            return self._mock_create(
                document_path=str(path),
                signers=normalized,
                subject=subject,
                message=message,
            )

        form = self._recipient_form_fields(normalized)
        form["subject"] = subject
        form["body"] = message

        file_bytes = path.read_bytes()
        files = {"files[]": (path.name, file_bytes, "application/pdf")}
        response = await self._request(
            "POST",
            "signatures.json",
            data=form,
            files=files,
        )

        if response.status_code >= 400:
            raise ValueError(f"Signaturit create failed ({response.status_code}): {response.text[:500]}")

        data = response.json()
        return {"mock": False, **data}

    async def get_signature_status(self, signature_id: str) -> dict[str, Any]:
        signature_id = signature_id.strip()
        if not signature_id:
            raise ValueError("signature_id is required")

        self._ensure_config()
        if self._mock:
            record = _mock_store.get(signature_id)
            if not record:
                raise ValueError("Signature not found")
            return dict(record)

        response = await self._request("GET", f"signatures/{signature_id}.json")
        if response.status_code == 404:
            raise ValueError("Signature not found")
        if response.status_code >= 400:
            raise ValueError(f"Signaturit status failed ({response.status_code}): {response.text[:500]}")
        return {"mock": False, **response.json()}

    @staticmethod
    def _first_document_id(payload: dict[str, Any]) -> str:
        documents = payload.get("documents")
        if isinstance(documents, list) and documents:
            doc_id = documents[0].get("id")
            if doc_id:
                return str(doc_id)
        if isinstance(documents, dict):
            doc_id = documents.get("id")
            if doc_id:
                return str(doc_id)
        raise ValueError("No document id in signature response")

    async def download_signed_document(self, signature_id: str) -> tuple[bytes, str]:
        signature_id = signature_id.strip()
        if not signature_id:
            raise ValueError("signature_id is required")

        self._ensure_config()
        if self._mock:
            record = _mock_store.get(signature_id)
            if not record:
                raise ValueError("Signature not found")
            _mock_store[signature_id]["status"] = "completed"
            if record.get("documents") and isinstance(record["documents"], list):
                record["documents"][0]["status"] = "completed"
            content = (
                b"%PDF-1.4\n% mock signed document\n"
                + f"%% Signature: {signature_id}\n".encode("utf-8")
            )
            filename = f"signed-{signature_id}.pdf"
            logger.info("[SIGNATURIT MOCK] download_signed_document id=%s", signature_id)
            return content, filename

        status = await self.get_signature_status(signature_id)
        doc_id = self._first_document_id(status)
        response = await self._request(
            "GET",
            f"signatures/{signature_id}/documents/{doc_id}/download/signed",
        )
        if response.status_code >= 400:
            raise ValueError(
                f"Signaturit download failed ({response.status_code}): {response.text[:500]}"
            )
        filename = f"signed-{signature_id}.pdf"
        return response.content, filename

    async def cancel_signature(self, signature_id: str) -> dict[str, Any]:
        signature_id = signature_id.strip()
        if not signature_id:
            raise ValueError("signature_id is required")

        self._ensure_config()
        if self._mock:
            record = _mock_store.get(signature_id)
            if not record:
                raise ValueError("Signature not found")
            record["status"] = "canceled"
            if record.get("documents") and isinstance(record["documents"], list):
                record["documents"][0]["status"] = "canceled"
            logger.info("[SIGNATURIT MOCK] cancel_signature id=%s", signature_id)
            return dict(record)

        response = await self._request("DELETE", f"signatures/{signature_id}.json")
        if response.status_code == 404:
            raise ValueError("Signature not found")
        if response.status_code >= 400:
            raise ValueError(f"Signaturit cancel failed ({response.status_code}): {response.text[:500]}")
        if response.content:
            return {"mock": False, **response.json()}
        return {"mock": False, "id": signature_id, "status": "canceled"}

    async def list_signatures(
        self,
        status: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        limit = max(1, min(int(limit), 100))

        self._ensure_config()
        if self._mock:
            items = list(_mock_store.values())
            if status:
                items = [r for r in items if (r.get("status") or "").lower() == status.lower()]
            items = items[:limit]
            return {"mock": True, "count": len(items), "signatures": items}

        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status.strip()

        response = await self._request("GET", "signatures.json", params=params)
        if response.status_code >= 400:
            raise ValueError(f"Signaturit list failed ({response.status_code}): {response.text[:500]}")
        data = response.json()
        if isinstance(data, list):
            return {"mock": False, "count": len(data), "signatures": data}
        return {"mock": False, **data}

    def handle_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Process Signaturit webhook payload (status sync in mock store)."""
        event_type = (payload.get("type") or payload.get("event") or "unknown").strip()
        sig_id = (
            payload.get("document", {}).get("signature", {}).get("id")
            or payload.get("signature", {}).get("id")
            or payload.get("id")
        )
        if sig_id and str(sig_id) in _mock_store:
            record = _mock_store[str(sig_id)]
            if "document_completed" in event_type or event_type == "document_signed":
                record["status"] = "completed"
                if record.get("documents") and isinstance(record["documents"], list):
                    record["documents"][0]["status"] = "completed"
            elif "canceled" in event_type:
                record["status"] = "canceled"
        logger.info("Signaturit webhook: type=%s signature_id=%s", event_type, sig_id)
        return {"received": True, "event_type": event_type, "signature_id": sig_id}


_signaturit_service: SignaturitService | None = None


def get_signaturit_service() -> SignaturitService:
    global _signaturit_service
    if _signaturit_service is None:
        _signaturit_service = SignaturitService()
    return _signaturit_service
