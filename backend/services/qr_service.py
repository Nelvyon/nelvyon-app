"""NELVYON QR Code Generator — static/dynamic QRs with tracking."""

from __future__ import annotations

import base64
import io
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
QR_TYPES = frozenset({"url", "texto", "email", "telefono", "wifi", "vcard", "whatsapp", "instagram", "menu"})


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


def _short_code() -> str:
    return uuid.uuid4().hex[:8]


def _build_payload(qr_type: str, content: str, config: dict[str, Any]) -> str:
    t = (qr_type or "url").lower()
    if t == "url":
        return content if content.startswith("http") else f"https://{content}"
    if t == "texto":
        return content
    if t == "email":
        return f"mailto:{content}"
    if t == "telefono":
        digits = re.sub(r"\D", "", content)
        return f"tel:+{digits}"
    if t == "whatsapp":
        digits = re.sub(r"\D", "", content)
        msg = config.get("message", "")
        return f"https://wa.me/{digits}" + (f"?text={msg}" if msg else "")
    if t == "instagram":
        handle = content.lstrip("@")
        return f"https://instagram.com/{handle}"
    if t == "wifi":
        ssid = config.get("ssid", content)
        password = config.get("password", "")
        return f"WIFI:T:WPA;S:{ssid};P:{password};;"
    if t == "vcard":
        return content
    if t == "menu":
        return content
    return content


def _generate_png_base64(payload: str, config: dict[str, Any]) -> str:
    import qrcode
    from PIL import Image

    size = int(config.get("size", 300))
    ec_map = {"L": qrcode.constants.ERROR_CORRECT_L, "M": qrcode.constants.ERROR_CORRECT_M,
              "H": qrcode.constants.ERROR_CORRECT_H, "Q": qrcode.constants.ERROR_CORRECT_Q}
    ec = ec_map.get(str(config.get("error_correction", "M")).upper(), qrcode.constants.ERROR_CORRECT_M)
    fill = config.get("color_qr", "#000000")
    back = config.get("color_fondo", "#ffffff")
    qr = qrcode.QRCode(error_correction=ec, box_size=10, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill, back_color=back).convert("RGBA")
    logo_url = config.get("logo_url")
    if logo_url:
        try:
            import httpx
            resp = httpx.get(str(logo_url), timeout=10)
            if resp.status_code < 400:
                logo = Image.open(io.BytesIO(resp.content)).convert("RGBA")
                logo_size = img.size[0] // 5
                logo = logo.resize((logo_size, logo_size))
                pos = ((img.size[0] - logo_size) // 2, (img.size[1] - logo_size) // 2)
                img.paste(logo, pos, logo)
        except Exception as exc:
            logger.debug("QR logo overlay skipped: %s", exc)
    if size != img.size[0]:
        img = img.resize((size, size))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _device_type(ua: str) -> str:
    u = (ua or "").lower()
    if "mobile" in u or "android" in u or "iphone" in u:
        return "mobile"
    if "tablet" in u or "ipad" in u:
        return "tablet"
    return "desktop"


class QrService:
    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "qr_codes.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                await session.execute(text(sql_path.read_text(encoding="utf-8")))
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    async def generate_qr(
        self,
        workspace_id: int,
        content: str,
        qr_type: str = "url",
        config: dict[str, Any] | None = None,
        name: str = "",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        cfg = config or {}
        qt = (qr_type or "url").lower()
        if qt not in QR_TYPES:
            raise ValueError(f"qr_type must be one of: {', '.join(sorted(QR_TYPES))}")
        payload = _build_payload(qt, content, cfg)
        image_b64 = _generate_png_base64(payload, cfg)
        result = await self.session.execute(
            text(
                """
                INSERT INTO qr_codes (workspace_id, name, qr_type, content, config, image_base64, is_dynamic)
                VALUES (:ws, :name, :type, :content, CAST(:cfg AS jsonb), :img, false)
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "name": name or content[:40],
                "type": qt,
                "content": content,
                "cfg": _json_dumps(cfg),
                "img": image_b64,
            },
        )
        row = _row(result.mappings().first())
        row["image_base64"] = f"data:image/png;base64,{image_b64}"
        await self.session.commit()
        return row

    async def create_dynamic_qr(
        self,
        workspace_id: int,
        destination_url: str,
        name: str = "",
    ) -> dict[str, Any]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        code = _short_code()
        for _ in range(10):
            exists = await self.session.execute(
                text("SELECT 1 FROM qr_codes WHERE short_code = :c LIMIT 1"),
                {"c": code},
            )
            if not exists.mappings().first():
                break
            code = _short_code()
        redirect_url = f"/qr/{code}"
        cfg = {"color_fondo": "#ffffff", "color_qr": "#000000", "size": 300}
        image_b64 = _generate_png_base64(redirect_url, cfg)
        result = await self.session.execute(
            text(
                """
                INSERT INTO qr_codes (
                    workspace_id, name, qr_type, content, config, short_code,
                    destination_url, image_base64, is_dynamic
                )
                VALUES (:ws, :name, 'url', :dest, CAST(:cfg AS jsonb), :code, :dest, :img, true)
                RETURNING *
                """
            ),
            {
                "ws": ws,
                "name": name or "QR dinámico",
                "dest": destination_url,
                "cfg": _json_dumps(cfg),
                "code": code,
                "img": image_b64,
            },
        )
        row = _row(result.mappings().first())
        row["image_base64"] = f"data:image/png;base64,{image_b64}"
        row["redirect_path"] = redirect_url
        await self.session.commit()
        return row

    async def update_dynamic_qr(self, qr_id: str, new_destination_url: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        result = await self.session.execute(
            text(
                """
                UPDATE qr_codes SET destination_url = :url, content = :url
                WHERE id = CAST(:id AS uuid) AND workspace_id = :ws AND is_dynamic = true
                RETURNING *
                """
            ),
            {"id": qr_id, "ws": self.workspace_id, "url": new_destination_url},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Dynamic QR not found")
        await self.session.commit()
        return _row(row)

    async def track_scan(
        self,
        short_code: str,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        result = await self.session.execute(
            text("SELECT * FROM qr_codes WHERE short_code = :code"),
            {"code": short_code},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("QR not found")
        qr = _row(row)
        ws = int(qr["workspace_id"])
        await self._set_tenant(ws)
        device = _device_type(user_agent or "")
        country = "Unknown"
        city = "Unknown"
        await self.session.execute(
            text(
                """
                INSERT INTO qr_scans (qr_id, workspace_id, ip, user_agent, country, city, device_type)
                VALUES (CAST(:qid AS uuid), :ws, :ip, :ua, :country, :city, :device)
                """
            ),
            {
                "qid": qr["id"],
                "ws": ws,
                "ip": ip,
                "ua": (user_agent or "")[:500],
                "country": country,
                "city": city,
                "device": device,
            },
        )
        await self.session.execute(
            text("UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = CAST(:id AS uuid)"),
            {"id": qr["id"]},
        )
        await self.session.commit()
        return {"destination_url": qr.get("destination_url"), "qr_id": qr["id"]}

    async def get_qr_stats(self, qr_id: str) -> dict[str, Any]:
        await self.ensure_schema()
        if self.workspace_id is None:
            raise ValueError("workspace_id required")
        await self._set_tenant(self.workspace_id)
        qr = await self.session.execute(
            text("SELECT * FROM qr_codes WHERE id = CAST(:id AS uuid) AND workspace_id = :ws"),
            {"id": qr_id, "ws": self.workspace_id},
        )
        q = qr.mappings().first()
        if not q:
            raise ValueError("QR not found")
        by_day = await self.session.execute(
            text(
                """
                SELECT DATE(scanned_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS scans
                FROM qr_scans WHERE qr_id = CAST(:id AS uuid)
                GROUP BY DATE(scanned_at AT TIME ZONE 'UTC')
                ORDER BY day DESC LIMIT 30
                """
            ),
            {"id": qr_id},
        )
        by_device = await self.session.execute(
            text(
                """
                SELECT device_type, COUNT(*) AS cnt FROM qr_scans
                WHERE qr_id = CAST(:id AS uuid) GROUP BY device_type
                """
            ),
            {"id": qr_id},
        )
        by_country = await self.session.execute(
            text(
                """
                SELECT country, COUNT(*) AS cnt FROM qr_scans
                WHERE qr_id = CAST(:id AS uuid) GROUP BY country
                """
            ),
            {"id": qr_id},
        )
        return {
            "qr_id": qr_id,
            "scan_count": int(_row(q).get("scan_count") or 0),
            "scans_by_day": [_row(r) for r in by_day.mappings().all()],
            "scans_by_device": [_row(r) for r in by_device.mappings().all()],
            "scans_by_country": [_row(r) for r in by_country.mappings().all()],
        }

    async def list_qrs(self, workspace_id: int) -> list[dict[str, Any]]:
        await self.ensure_schema()
        ws = int(workspace_id)
        await self._set_tenant(ws)
        result = await self.session.execute(
            text(
                """
                SELECT id, workspace_id, name, qr_type, content, short_code, destination_url,
                       is_dynamic, scan_count, created_at
                FROM qr_codes WHERE workspace_id = :ws ORDER BY created_at DESC
                """
            ),
            {"ws": ws},
        )
        return [_row(r) for r in result.mappings().all()]


def get_qr_service(session: AsyncSession, workspace_id: int | None = None) -> QrService:
    return QrService(session, workspace_id)
