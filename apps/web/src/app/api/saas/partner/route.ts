import { type NextRequest, NextResponse } from "next/server";
import { getSaasPartnerZoneService, requireSaasContext } from "@nelvyon/saas";
import { getPartnerProgramSnapshot } from "../../../../../../../backend/agency/PartnerProgramFacade";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = ctx.claims.userId;
    const url = new URL(req.url);
    const view = url.searchParams.get("view") ?? "zone";

    if (view === "unified") {
      const snapshot = await getPartnerProgramSnapshot(ctx.tenant.id, userId);
      return NextResponse.json({
        ...snapshot,
        payoutsBlocked: !snapshot.ceoPayoutGate.enabled,
        note: "Commissions may be calculated; money movement requires NELVYON_CEO_PARTNER_PAYOUTS=1",
      });
    }

    const svc = getSaasPartnerZoneService();
    const [summary, eligibility, catalog] = await Promise.all([
      svc.getZoneSummary(ctx.tenant.id, userId),
      svc.getPartnerEligibility(ctx.tenant.id),
      svc.getWholesaleCatalog(ctx.tenant.id),
    ]);
    return NextResponse.json({ summary, connect: summary.connect, catalog, eligibility });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[partner GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
