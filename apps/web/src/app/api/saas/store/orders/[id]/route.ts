import { NextResponse } from "next/server";
import { getSaasStoreService, SaasStoreError, requireSaasContext, saasErrorBody, saasErrorStatus, type OrderStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasStoreError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/store/orders/[id] */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const order = await getSaasStoreService().getOrder(ctx.tenant.id, id);
    return NextResponse.json({ order });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** PATCH /api/saas/store/orders/[id]  body: { status } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id } = await params;
    const b = (await req.json().catch(() => null)) as { status?: string } | null;
    if (!b?.status) return NextResponse.json({ error: "status required" }, { status: 400 });
    const order = await getSaasStoreService().updateOrderStatus(ctx.tenant.id, id, b.status as OrderStatus);
    return NextResponse.json({ order });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
