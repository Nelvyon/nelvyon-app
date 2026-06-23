import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDashboardMetricsService } from "../../../../../../../backend/saas/DashboardMetricsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "analytics.read");
    const svc = getDashboardMetricsService();
    const [roi, traffic, conversions, mrr, summary] = await Promise.all([
      svc.getROIMetrics(ctx.claims.userId),
      svc.getTrafficMetrics(ctx.claims.userId),
      svc.getConversionMetrics(ctx.claims.userId),
      svc.getMRRMetrics(ctx.claims.userId),
      svc.getDashboardSummary(ctx.claims.userId),
    ]);
    return NextResponse.json({ roi, traffic, conversions, mrr, summary });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
