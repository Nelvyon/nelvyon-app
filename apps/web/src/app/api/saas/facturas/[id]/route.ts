export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasFacturasService,
} from "@nelvyon/saas";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const { id } = await params;
    const factura = await getSaasFacturasService().get(ctx.tenant.id, id);
    if (!factura) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ factura });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const { id } = await params;
    const body = await req.json();
    const factura = await getSaasFacturasService().update(ctx.tenant.id, id, body);
    if (!factura) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ factura });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const { id } = await params;
    const deleted = await getSaasFacturasService().delete(ctx.tenant.id, id);
    if (!deleted) return NextResponse.json({ error: "NOT_FOUND_OR_NOT_DRAFT" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
