import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPartnerZoneService,
  SaasPartnerZoneError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasPartnerZoneService();
    const elig = await svc.getPartnerEligibility(ctx.tenant.id);
    if (!elig.eligible) {
      return NextResponse.json({ error: "Requiere plan Agency", code: "PARTNER_REQUIRED" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const { entries, totals } = await svc.listLedger(ctx.tenant.id, limit);
    return NextResponse.json({ entries, totals });
  } catch (e) {
    if (e instanceof SaasPartnerZoneError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "PARTNER_REQUIRED" ? 403 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[partner/ledger GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
