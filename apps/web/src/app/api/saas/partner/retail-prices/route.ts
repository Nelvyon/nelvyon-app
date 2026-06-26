import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPartnerZoneService,
  SaasPartnerZoneError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const svc = getSaasPartnerZoneService();
    const elig = await svc.getPartnerEligibility(ctx.tenant.id);
    if (!elig.eligible) {
      return NextResponse.json({ error: "Requiere plan Agency", code: "PARTNER_REQUIRED" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as { sku?: string; retailEur?: number };
    if (!body.sku || typeof body.retailEur !== "number") {
      return NextResponse.json({ error: "sku y retailEur requeridos", code: "VALIDATION" }, { status: 400 });
    }
    const item = await svc.upsertRetailPrice(ctx.tenant.id, body.sku, body.retailEur);
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof SaasPartnerZoneError) {
      const status = e.code === "PARTNER_REQUIRED" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[partner/retail-prices PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
