import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  SaasAdsDashboardError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/saas/ads/alerts?roas_threshold=1.5
 *  Returns platforms where cached 30d ROAS is below threshold.
 *  Reads from saas_ads_metrics_cache — no live API calls.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const threshold = parseFloat(searchParams.get("roas_threshold") ?? "1.5");
    const roasThreshold = isNaN(threshold) || threshold <= 0 ? 1.5 : threshold;
    const alerts = await getSaasAdsDashboardService().getRoasAlerts(ctx.tenant.id, roasThreshold);
    return NextResponse.json({ alerts, threshold: roasThreshold });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return NextResponse.json({ error: (e as SaasAdsDashboardError).message, code: (e as SaasAdsDashboardError).code }, { status: 400 });
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
