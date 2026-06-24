import { NextResponse } from "next/server";
import { getSaasStoreService, SaasStoreError, requireSaasContext, saasErrorBody, saasErrorStatus, type OrderStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasStoreError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/store/orders?status=paid&limit=20 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const orders = await getSaasStoreService().listOrders(ctx.tenant.id, {
      status: (url.searchParams.get("status") as OrderStatus) || undefined,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
    });
    return NextResponse.json({ orders });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
