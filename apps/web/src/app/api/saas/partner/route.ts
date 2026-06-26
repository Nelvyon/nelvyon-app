import { type NextRequest, NextResponse } from "next/server";
import { getSaasPartnerZoneService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = (ctx as { user?: { id: string } }).user?.id;
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
