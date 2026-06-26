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
    const userId = (ctx as { user?: { id: string } }).user?.id;
    if (!userId) {
      return NextResponse.json({ error: "No user context", code: "NOT_FOUND" }, { status: 404 });
    }
    const svc = getSaasPartnerZoneService();
    const stats = await svc.getReferralStats(ctx.tenant.id, userId);
    return NextResponse.json(stats);
  } catch (e) {
    if (e instanceof SaasPartnerZoneError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[partner/referrals GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
