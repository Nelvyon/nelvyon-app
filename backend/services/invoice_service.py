"""NELVYON Spanish invoicing — correlativa numbering, IVA, legal PDF (ReportLab), SES delivery."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.ses_service import get_ses_service
from services.supabase_service import get_supabase_service
from services.webhook_service import schedule_webhook_event

logger = logging.getLogger(__name__)

INVOICE_BUCKET = "agent-results"
INVOICE_STATUSES = frozenset({"draft", "sent", "paid", "cancelled"})
DEFAULT_SERIES = "FAC"
DEFAULT_IVA_RATE = Decimal("21.00")
TWOPLACES = Decimal("0.01")


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False, default=str)


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for key, val in list(data.items()):
        if isinstance(val, Decimal):
            data[key] = float(val)
        elif isinstance(val, (datetime, date)):
            data[key] = val.isoformat()
        elif key == "items" and isinstance(val, str):
            try:
                data[key] = json.loads(val)
            except json.JSONDecodeError:
                pass
    return data


def _money(value: Decimal | float | int) -> Decimal:
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _emitter_config() -> dict[str, str]:
    return {
        "name": os.environ.get("NELVYON_EMITTER_NAME", "NELVYON S.L.").strip(),
        "nif": os.environ.get("NELVYON_EMITTER_NIF", "B00000000").strip(),
        "address": os.environ.get(
            "NELVYON_EMITTER_ADDRESS",
            "Calle Ejemplo 1, 28001 Madrid, España",
        ).strip(),
        "iban": os.environ.get("NELVYON_EMITTER_IBAN", "ES00 0000 0000 0000 0000 0000").strip(),
        "email": os.environ.get("NELVYON_EMITTER_EMAIL", os.environ.get("SES_FROM_EMAIL", "")).strip(),
        "payment_terms": os.environ.get(
            "NELVYON_PAYMENT_TERMS",
            "Pago a 30 días desde la fecha de emisión. Transferencia bancaria.",
        ).strip(),
        "logo_url": os.environ.get("NELVYON_LOGO_URL", "").strip(),
    }


class InvoiceService:
    """Workspace-scoped Spanish invoices with mandatory sequential numbering."""

    def __init__(self, session: AsyncSession, workspace_id: int):
        if workspace_id is None:
            raise ValueError("workspace_id is required")
        self.session = session
        self.workspace_id = int(workspace_id)

    @staticmethod
    def _normalize_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not items:
            raise ValueError("At least one invoice line item is required")
        normalized: list[dict[str, Any]] = []
        for idx, raw in enumerate(items):
            desc = (raw.get("description") or raw.get("concept") or "").strip()
            if not desc:
                raise ValueError(f"items[{idx}].description is required")
            try:
                qty = _money(raw.get("quantity", 1))
                unit = _money(raw.get("unit_price", raw.get("price", 0)))
            except Exception as exc:
                raise ValueError(f"items[{idx}] invalid quantity or unit_price") from exc
            if qty <= 0 or unit < 0:
                raise ValueError(f"items[{idx}] quantity must be > 0 and unit_price >= 0")
            line_base = _money(qty * unit)
            normalized.append(
                {
                    "description": desc,
                    "quantity": float(qty),
                    "unit_price": float(unit),
                    "line_base": float(line_base),
                }
            )
        return normalized

    @staticmethod
    def _totals(items: list[dict[str, Any]], iva_rate: Decimal) -> tuple[Decimal, Decimal, Decimal]:
        subtotal = _money(sum(Decimal(str(i["line_base"])) for i in items))
        iva_amount = _money(subtotal * iva_rate / Decimal("100"))
        total = _money(subtotal + iva_amount)
        return subtotal, iva_amount, total

    async def _next_invoice_number(self, series: str, year: int) -> str:
        series = (series or DEFAULT_SERIES).strip().upper()
        result = await self.session.execute(
            text(
                """
                INSERT INTO invoice_sequences (workspace_id, series, year, last_number, updated_at)
                VALUES (:workspace_id, :series, :year, 1, :now)
                ON CONFLICT (workspace_id, series, year)
                DO UPDATE SET
                    last_number = invoice_sequences.last_number + 1,
                    updated_at = EXCLUDED.updated_at
                RETURNING last_number
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "series": series,
                "year": year,
                "now": datetime.now(timezone.utc),
            },
        )
        row = result.fetchone()
        num = int(row._mapping["last_number"]) if row else 1
        return f"{year}-{num:04d}"

    async def create_invoice(
        self,
        client_data: dict[str, Any],
        items: list[dict[str, Any]],
        iva_rate: float | Decimal = DEFAULT_IVA_RATE,
        *,
        series: str = DEFAULT_SERIES,
        currency: str = "EUR",
        due_date: date | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        client_name = (client_data.get("client_name") or client_data.get("name") or "").strip()
        if not client_name:
            raise ValueError("client_name is required")

        normalized_items = self._normalize_items(items)
        rate = _money(iva_rate)
        subtotal, iva_amount, total = self._totals(normalized_items, rate)

        year = datetime.now(timezone.utc).year
        invoice_number = await self._next_invoice_number(series, year)

        result = await self.session.execute(
            text(
                """
                INSERT INTO invoices (
                    workspace_id, invoice_number, series, client_name, client_email,
                    client_nif, client_address, items, subtotal, iva_rate, iva_amount,
                    total, currency, status, due_date, notes, created_at
                )
                VALUES (
                    :workspace_id, :invoice_number, :series, :client_name, :client_email,
                    :client_nif, :client_address, CAST(:items AS jsonb), :subtotal, :iva_rate,
                    :iva_amount, :total, :currency, 'draft', :due_date, :notes, :created_at
                )
                RETURNING *
                """
            ),
            {
                "workspace_id": self.workspace_id,
                "invoice_number": invoice_number,
                "series": (series or DEFAULT_SERIES).strip().upper(),
                "client_name": client_name,
                "client_email": client_data.get("client_email") or client_data.get("email"),
                "client_nif": client_data.get("client_nif") or client_data.get("nif"),
                "client_address": client_data.get("client_address") or client_data.get("address"),
                "items": _json_dumps(normalized_items),
                "subtotal": float(subtotal),
                "iva_rate": float(rate),
                "iva_amount": float(iva_amount),
                "total": float(total),
                "currency": (currency or "EUR").strip().upper(),
                "due_date": due_date,
                "notes": notes,
                "created_at": datetime.now(timezone.utc),
            },
        )
        await self.session.commit()
        return _row_to_dict(result.fetchone())

    async def get_invoice(self, invoice_id: int) -> dict[str, Any]:
        row = await self._get_row(invoice_id)
        return _row_to_dict(row)

    async def list_invoices(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        status: str | None = None,
    ) -> dict[str, Any]:
        where = "workspace_id = :workspace_id"
        params: dict[str, Any] = {"workspace_id": self.workspace_id, "skip": skip, "limit": limit}
        if status:
            where += " AND status = :status"
            params["status"] = status.strip().lower()

        count_r = await self.session.execute(
            text(f"SELECT COUNT(*) FROM invoices WHERE {where}"),
            params,
        )
        total = int(count_r.scalar() or 0)

        result = await self.session.execute(
            text(
                f"""
                SELECT * FROM invoices WHERE {where}
                ORDER BY created_at DESC, id DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            params,
        )
        items = [_row_to_dict(r) for r in result.fetchall()]
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def update_invoice(self, invoice_id: int, data: dict[str, Any]) -> dict[str, Any]:
        current = _row_to_dict(await self._get_row(invoice_id))
        if current.get("status") != "draft":
            raise ValueError("Only draft invoices can be updated")

        if "items" in data and data["items"] is not None:
            normalized_items = self._normalize_items(data["items"])
        else:
            normalized_items = self._normalize_items(current.get("items") or [])

        rate = _money(data.get("iva_rate", current.get("iva_rate", 21)))
        subtotal, iva_amount, total = self._totals(normalized_items, rate)

        allowed = {
            "client_name",
            "client_email",
            "client_nif",
            "client_address",
            "due_date",
            "notes",
            "currency",
        }
        sets = [
            "items = CAST(:items AS jsonb)",
            "subtotal = :subtotal",
            "iva_rate = :iva_rate",
            "iva_amount = :iva_amount",
            "total = :total",
        ]
        params: dict[str, Any] = {
            "id": invoice_id,
            "workspace_id": self.workspace_id,
            "items": _json_dumps(normalized_items),
            "subtotal": float(subtotal),
            "iva_rate": float(rate),
            "iva_amount": float(iva_amount),
            "total": float(total),
        }

        for key in allowed:
            if key in data and data[key] is not None:
                sets.append(f"{key} = :{key}")
                params[key] = data[key]

        await self.session.execute(
            text(
                f"""
                UPDATE invoices SET {', '.join(sets)}
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            params,
        )
        await self.session.commit()
        return await self.get_invoice(invoice_id)

    async def delete_invoice(self, invoice_id: int) -> bool:
        current = _row_to_dict(await self._get_row(invoice_id))
        if current.get("status") not in ("draft", "cancelled"):
            raise ValueError("Only draft or cancelled invoices can be deleted")
        result = await self.session.execute(
            text("DELETE FROM invoices WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": invoice_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()
        return (result.rowcount or 0) > 0

    def _build_pdf_bytes(self, invoice: dict[str, Any]) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        emitter = _emitter_config()
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Heading1"],
            fontSize=18,
            textColor=colors.HexColor("#4F46E5"),
        )
        story: list[Any] = []

        logo_url = emitter.get("logo_url")
        if logo_url:
            try:
                import httpx

                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(logo_url)
                    if resp.status_code < 400 and resp.content:
                        logo_buf = BytesIO(resp.content)
                        story.append(Image(logo_buf, width=4 * cm, height=1.2 * cm))
                        story.append(Spacer(1, 0.3 * cm))
            except Exception as exc:
                logger.debug("Invoice logo skip: %s", exc)

        story.append(Paragraph("FACTURA", title_style))
        story.append(Spacer(1, 0.4 * cm))

        meta = [
            ["Nº factura:", invoice.get("invoice_number", "—")],
            ["Serie:", invoice.get("series", DEFAULT_SERIES)],
            ["Fecha:", (invoice.get("created_at") or "")[:10]],
            ["Vencimiento:", str(invoice.get("due_date") or "—")],
        ]
        meta_table = Table(meta, colWidths=[3.5 * cm, 10 * cm])
        meta_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(meta_table)
        story.append(Spacer(1, 0.5 * cm))

        cell_style = styles["Normal"]
        emitter_para = Paragraph(
            f"{emitter['name']}<br/>NIF: {emitter['nif']}<br/>{emitter['address']}",
            cell_style,
        )
        client_para = Paragraph(
            (
                f"{invoice.get('client_name', '—')}<br/>"
                f"NIF: {invoice.get('client_nif') or '—'}<br/>"
                f"{invoice.get('client_address') or '—'}<br/>"
                f"{invoice.get('client_email') or ''}"
            ),
            cell_style,
        )
        parties = [["Emisor", "Cliente"], [emitter_para, client_para]]
        parties_table = Table(parties, colWidths=[8.25 * cm, 8.25 * cm])
        parties_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(parties_table)
        story.append(Spacer(1, 0.6 * cm))

        iva_rate = float(invoice.get("iva_rate") or 21)
        lines = [["Concepto", "Cant.", "P. unit.", "Base imp.", f"IVA {iva_rate:g}%", "Total"]]
        for item in invoice.get("items") or []:
            base = float(item.get("line_base") or 0)
            iva_line = round(base * iva_rate / 100, 2)
            lines.append(
                [
                    str(item.get("description", ""))[:60],
                    f"{item.get('quantity', 1):g}",
                    f"{item.get('unit_price', 0):.2f} €",
                    f"{base:.2f} €",
                    f"{iva_line:.2f} €",
                    f"{base + iva_line:.2f} €",
                ]
            )

        line_table = Table(lines, colWidths=[6 * cm, 1.5 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 2.1 * cm])
        line_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("ALIGN", (0, 1), (0, -1), "LEFT"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                ]
            )
        )
        story.append(line_table)
        story.append(Spacer(1, 0.5 * cm))

        totals = [
            ["Base imponible:", f"{float(invoice.get('subtotal', 0)):.2f} €"],
            [f"Cuota IVA ({iva_rate:g}%):", f"{float(invoice.get('iva_amount', 0)):.2f} €"],
            ["TOTAL FACTURA:", f"{float(invoice.get('total', 0)):.2f} €"],
        ]
        totals_table = Table(totals, colWidths=[12 * cm, 4.5 * cm])
        totals_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#4F46E5")),
                ]
            )
        )
        story.append(totals_table)
        story.append(Spacer(1, 0.8 * cm))

        footer = (
            f"<b>Forma de pago:</b> Transferencia bancaria<br/>"
            f"<b>IBAN:</b> {emitter['iban']}<br/>"
            f"<b>Condiciones:</b> {emitter['payment_terms']}"
        )
        if invoice.get("notes"):
            footer += f"<br/><br/><b>Notas:</b> {invoice['notes']}"
        story.append(Paragraph(footer, styles["Normal"]))

        doc.build(story)
        return buffer.getvalue()

    async def generate_pdf(self, invoice_id: int) -> dict[str, Any]:
        invoice = await self.get_invoice(invoice_id)
        pdf_bytes = await asyncio.to_thread(self._build_pdf_bytes, invoice)

        path = (
            f"invoices/workspace-{self.workspace_id}/"
            f"{invoice['invoice_number'].replace('/', '-')}.pdf"
        )
        storage = get_supabase_service()
        upload = await storage.upload_bytes(
            INVOICE_BUCKET,
            path,
            pdf_bytes,
            content_type="application/pdf",
        )

        await self.session.execute(
            text(
                """
                UPDATE invoices SET pdf_path = :pdf_path
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"pdf_path": path, "id": invoice_id, "workspace_id": self.workspace_id},
        )
        await self.session.commit()

        return {
            "invoice_id": invoice_id,
            "pdf_path": path,
            "public_url": upload.get("public_url"),
            "mock_storage": upload.get("mock", storage.is_mock),
            "size_bytes": len(pdf_bytes),
        }

    async def download_pdf_bytes(self, invoice_id: int) -> tuple[bytes, str]:
        invoice = await self.get_invoice(invoice_id)
        filename = f"factura-{invoice.get('invoice_number', invoice_id)}.pdf"

        pdf_path = invoice.get("pdf_path")
        if pdf_path:
            storage = get_supabase_service()
            content = await storage.download_bytes(INVOICE_BUCKET, pdf_path)
            if content:
                return content, filename

        gen = await self.generate_pdf(invoice_id)
        content = await get_supabase_service().download_bytes(INVOICE_BUCKET, gen["pdf_path"])
        if content:
            return content, filename

        return await asyncio.to_thread(self._build_pdf_bytes, invoice), filename

    async def _send_email_with_pdf(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        pdf_bytes: bytes,
        filename: str,
    ) -> dict[str, Any]:
        ses = get_ses_service()
        from_email = _emitter_config()["email"] or ses.default_from_email

        if ses.is_mock:
            return await ses.send_email(to_email, subject, html_body, from_email=from_email or None)

        if not from_email:
            raise ValueError("NELVYON_EMITTER_EMAIL or SES_FROM_EMAIL is required to send invoices")

        def _send_raw() -> dict[str, Any]:
            import boto3

            ses._ensure_client()
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = from_email
            msg["To"] = to_email

            alt = MIMEMultipart("alternative")
            alt.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(alt)

            attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            attachment.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(attachment)

            client = boto3.client(
                "ses",
                region_name=ses.region,
                aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "").strip(),
                aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip(),
            )
            response = client.send_raw_email(
                Source=from_email,
                Destinations=[to_email],
                RawMessage={"Data": msg.as_string()},
            )
            return {"MessageId": response.get("MessageId")}

        response = await asyncio.to_thread(_send_raw)
        return {
            "mock": False,
            "message_id": response.get("MessageId"),
            "to": to_email,
            "from": from_email,
        }

    async def send_invoice(self, invoice_id: int) -> dict[str, Any]:
        invoice = await self.get_invoice(invoice_id)
        if invoice.get("status") == "cancelled":
            raise ValueError("Cannot send a cancelled invoice")
        email = (invoice.get("client_email") or "").strip()
        if not email:
            raise ValueError("client_email is required to send the invoice")

        pdf_bytes, filename = await self.download_pdf_bytes(invoice_id)
        subject = f"Factura {invoice.get('invoice_number')} — {_emitter_config()['name']}"
        html = (
            f"<p>Hola {invoice.get('client_name', '')},</p>"
            f"<p>Adjuntamos la factura <strong>{invoice.get('invoice_number')}</strong> "
            f"por importe de <strong>{float(invoice.get('total', 0)):.2f} €</strong>.</p>"
            f"<p>IVA ({float(invoice.get('iva_rate', 21)):g}%): "
            f"{float(invoice.get('iva_amount', 0)):.2f} €</p>"
            f"<p>Gracias por su confianza.<br/>{_emitter_config()['name']}</p>"
        )
        send_result = await self._send_email_with_pdf(
            to_email=email,
            subject=subject,
            html_body=html,
            pdf_bytes=pdf_bytes,
            filename=filename,
        )

        now = datetime.now(timezone.utc)
        await self.session.execute(
            text(
                """
                UPDATE invoices
                SET status = 'sent', sent_at = COALESCE(sent_at, :now)
                WHERE id = :id AND workspace_id = :workspace_id
                """
            ),
            {"id": invoice_id, "workspace_id": self.workspace_id, "now": now},
        )
        await self.session.commit()

        return {
            "invoice_id": invoice_id,
            "status": "sent",
            "email": email,
            "delivery": send_result,
        }

    async def mark_as_paid(self, invoice_id: int, payment_date: datetime | date | None = None) -> dict[str, Any]:
        paid_at = payment_date or datetime.now(timezone.utc)
        if isinstance(paid_at, date) and not isinstance(paid_at, datetime):
            paid_at = datetime.combine(paid_at, datetime.min.time(), tzinfo=timezone.utc)

        result = await self.session.execute(
            text(
                """
                UPDATE invoices
                SET status = 'paid', paid_at = :paid_at
                WHERE id = :id AND workspace_id = :workspace_id
                  AND status IN ('draft', 'sent')
                RETURNING *
                """
            ),
            {"id": invoice_id, "workspace_id": self.workspace_id, "paid_at": paid_at},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Invoice not found or cannot be marked as paid")
        await self.session.commit()
        invoice = _row_to_dict(row)
        schedule_webhook_event(self.workspace_id, "invoice.paid", invoice)
        return invoice

    async def get_invoice_stats(self) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT
                    COALESCE(SUM(total) FILTER (WHERE status IN ('sent', 'paid')), 0) AS total_invoiced,
                    COALESCE(SUM(total) FILTER (WHERE status = 'sent'), 0) AS pending,
                    COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS paid,
                    COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
                    COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
                    COUNT(*) FILTER (WHERE status = 'paid') AS paid_count
                FROM invoices
                WHERE workspace_id = :workspace_id
                """
            ),
            {"workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        m = row._mapping if row else {}
        return {
            "workspace_id": self.workspace_id,
            "total_facturado": float(m.get("total_invoiced") or 0),
            "pendiente": float(m.get("pending") or 0),
            "pagado": float(m.get("paid") or 0),
            "draft_count": int(m.get("draft_count") or 0),
            "sent_count": int(m.get("sent_count") or 0),
            "paid_count": int(m.get("paid_count") or 0),
            "currency": "EUR",
        }

    async def _get_row(self, invoice_id: int) -> Any:
        result = await self.session.execute(
            text("SELECT * FROM invoices WHERE id = :id AND workspace_id = :workspace_id"),
            {"id": invoice_id, "workspace_id": self.workspace_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Invoice not found")
        return row
