import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPartnerZoneService,
  SaasPartnerZoneError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Register the current user as a referral partner (upsell path — no plan gate). */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const userId = (ctx as { user?: { id: string } }).user?.id;
    if (!userId) {
      return NextResponse.json({ error: "No user context", code: "VALIDATION" }, { status: 400 });
    }
    const svc = getSaasPartnerZoneService();
    const partner = await svc.registerAsPartner(userId, ctx.tenant.id);
    return NextResponse.json({ partner });
  } catch (e) {
    if (e instanceof SaasPartnerZoneError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[partner/register POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
