import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPackStoreService,
  SaasPackStoreError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Acquire a pack for the tenant.
 *  - coming_soon         → 403 PACK_LOCKED
 *  - included in plan    → grant entitlement, { granted: true, source: "plan" }
 *  - promo code provided → grant as promo, { granted: true, source: "promo" }
 *  - paid add-on         → { checkoutRequired: true } (no silent mock — directs to billing)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const { packId } = await params;
    const body = (await req.json().catch(() => ({}))) as { promoCode?: string };

    const svc = getSaasPackStoreService();
    const detail = await svc.getPackDetail(ctx.tenant.id, packId);
    const { item } = detail;
    const launchKey = item.launchPackId ?? item.id;

    if (item.availability === "coming_soon") {
      return NextResponse.json(
        { error: "Este pack todavía no está disponible", code: "PACK_LOCKED" },
        { status: 403 },
      );
    }

    if (item.owned) {
      return NextResponse.json({ granted: true, alreadyOwned: true, source: "existing" });
    }

    if (item.access === "included") {
      await svc.grantFromPlan(ctx.tenant.id);
      return NextResponse.json({ granted: true, source: "plan" });
    }

    if (body.promoCode) {
      const ent = await svc.recordPurchase(ctx.tenant.id, launchKey, { promoCode: body.promoCode });
      return NextResponse.json({ granted: true, source: "promo", entitlement: ent });
    }

    // Paid add-on outside the current plan — checkout handled in billing flow.
    return NextResponse.json({
      checkoutRequired: true,
      message: "Este pack es un add-on de pago. Mejora tu plan o contacta para activarlo.",
      billingUrl: "/saas/billing",
    });
  } catch (e) {
    if (e instanceof SaasPackStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[packs/[id]/purchase POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
