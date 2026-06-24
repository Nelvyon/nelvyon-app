import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  SaasAdsDashboardError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type AdsPlatform,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/saas/ads/campaigns/[id]
 * Body: { platform, daily_budget_usd }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { id: campaignId } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const platform = typeof b.platform === "string" ? (b.platform as AdsPlatform) : null;
    const dailyBudgetUsd = typeof b.daily_budget_usd === "number" ? b.daily_budget_usd : null;

    if (!platform) return NextResponse.json({ error: "platform is required" }, { status: 400 });
    if (!dailyBudgetUsd || dailyBudgetUsd <= 0) {
      return NextResponse.json({ error: "daily_budget_usd must be > 0" }, { status: 400 });
    }

    const campaign = await getSaasAdsDashboardService().updateCampaignBudget(
      ctx.tenant.id,
      platform,
      campaignId,
      dailyBudgetUsd,
    );

    return NextResponse.json({ ok: true, campaign });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) {
      const status = e.code === "NOT_CONNECTED" ? 422 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
