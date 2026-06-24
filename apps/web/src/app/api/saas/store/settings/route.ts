import { NextResponse } from "next/server";
import { getSaasStoreService, SaasStoreError, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasStoreError) {
  return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
}

/** GET /api/saas/store/settings */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const settings = await getSaasStoreService().getSettings(ctx.tenant.id);
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** PATCH /api/saas/store/settings */
export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const settings = await getSaasStoreService().updateSettings(ctx.tenant.id, {
      currency: typeof b.currency === "string" ? b.currency : undefined,
      vatPct: b.vat_pct !== undefined ? Number(b.vat_pct) : undefined,
      vatIncluded: typeof b.vat_included === "boolean" ? b.vat_included : undefined,
      shippingFee: b.shipping_fee !== undefined ? Number(b.shipping_fee) : undefined,
      freeShippingAbove: b.free_shipping_above !== undefined ? (b.free_shipping_above === null ? null : Number(b.free_shipping_above)) : undefined,
      storeName: typeof b.store_name === "string" ? b.store_name : undefined,
      storeDescription: typeof b.store_description === "string" ? b.store_description : undefined,
    });
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    if (e instanceof SaasStoreError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
