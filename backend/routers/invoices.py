"""Spanish invoicing API — IVA, legal PDF, SES delivery."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, List, Optional

from core.secrets import sanitize_text
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.database import get_db
from core.list_cache import list_cached
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace, require_workspace_operator
from schemas.auth import UserResponse
from services.invoice_service import InvoiceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


class InvoiceLineItem(BaseModel):
    description: str = Field(..., min_length=1)
    quantity: float = Field(1, gt=0)
    unit_price: float = Field(..., ge=0)


class ClientData(BaseModel):
    client_name: str = Field(..., min_length=1)
    client_email: Optional[EmailStr] = None
    client_nif: Optional[str] = None
    client_address: Optional[str] = None


class CreateInvoiceBody(BaseModel):
    client: ClientData
    items: List[InvoiceLineItem] = Field(..., min_length=1)
    iva_rate: float = Field(21.0, ge=0, le=100)
    series: str = Field("FAC", min_length=1, max_length=16)
    currency: str = Field("EUR", min_length=3, max_length=3)
    due_date: Optional[date] = None
    notes: Optional[str] = None


class UpdateInvoiceBody(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_nif: Optional[str] = None
    client_address: Optional[str] = None
    items: Optional[List[InvoiceLineItem]] = None
    iva_rate: Optional[float] = Field(None, ge=0, le=100)
    due_date: Optional[date] = None
    notes: Optional[str] = None
    currency: Optional[str] = None


class MarkPaidBody(BaseModel):
    payment_date: Optional[datetime] = None


def _service(db: AsyncSession, ws_ctx: WorkspaceContext) -> InvoiceService:
    return InvoiceService(db, ws_ctx.workspace_id)


@router.get("/stats")
async def invoice_stats(
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db, ws_ctx).get_invoice_stats()


@router.get("")
@list_cached("invoices")
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    status: str | None = Query(None),
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db, ws_ctx).list_invoices(skip=skip, limit=limit, status=status)


@router.post("", status_code=201)
async def create_invoice(
    body: CreateInvoiceBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    try:
        return await svc.create_invoice(
            client_data=body.client.model_dump(),
            items=[i.model_dump() for i in body.items],
            iva_rate=body.iva_rate,
            series=body.series,
            currency=body.currency,
            due_date=body.due_date,
            notes=body.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    body: UpdateInvoiceBody,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    payload: dict[str, Any] = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.items is not None:
        payload["items"] = [i.model_dump() for i in body.items]
    try:
        return await svc.update_invoice(invoice_id, payload)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    try:
        ok = await svc.delete_invoice(invoice_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice deleted", "id": invoice_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    try:
        return await svc.send_invoice(invoice_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))
    except Exception as e:
        logger.error("send_invoice %s: %s", invoice_id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await _service(db, ws_ctx).get_invoice(invoice_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    ws_ctx: WorkspaceContext = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    try:
        content, filename = await svc.download_pdf_bytes(invoice_id)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Invoice not found")
    except Exception as e:
        logger.error("download_invoice_pdf %s: %s", invoice_id, sanitize_text(str(e)), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF")


@router.post("/{invoice_id}/paid")
async def mark_invoice_paid(
    invoice_id: int,
    request: Request,
    body: MarkPaidBody | None = None,
    ws_ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = _service(db, ws_ctx)
    payment_date = body.payment_date if body else None
    try:
        result = await svc.mark_as_paid(invoice_id, payment_date)
        from services.audit_service import log_critical_audit

        await log_critical_audit(
            db,
            tenant_id=int(ws_ctx.workspace_id),
            user_id=str(current_user.id),
            action="paid",
            resource_type="invoice",
            resource_id=str(invoice_id),
            ip_address=request.client.host if request.client else None,
            new_value={"invoice_id": invoice_id},
        )
        return result
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail=str(e))
