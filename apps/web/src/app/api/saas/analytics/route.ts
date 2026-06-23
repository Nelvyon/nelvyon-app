import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasAnalyticsService } from "../../../../../../../backend/saas/SaasAnalyticsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "analytics.read");
    const url = new URL(req.url);
    const rawPeriod = url.searchParams.get("period") ?? "30d";
    const period = rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "30d";
    const analytics = await saasAnalyticsService.getClientAnalytics(ctx.claims.userId, ctx.tenant.id, period);
    return NextResponse.json({ analytics });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
