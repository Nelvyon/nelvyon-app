import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  SaasAdsDashboardError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type AdsPlatform,
  type AdsCreateCampaignInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/saas/ads/campaigns/create
 * Body: { platform, name, objective?, daily_budget_usd, status? }
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const platform = typeof b.platform === "string" ? (b.platform as AdsPlatform) : null;
    const name = typeof b.name === "string" ? b.name.trim() : null;
    const dailyBudgetUsd = typeof b.daily_budget_usd === "number" ? b.daily_budget_usd : null;

    if (!platform) return NextResponse.json({ error: "platform is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!dailyBudgetUsd || dailyBudgetUsd <= 0) {
      return NextResponse.json({ error: "daily_budget_usd must be > 0" }, { status: 400 });
    }

    const input: AdsCreateCampaignInput = {
      platform,
      name,
      objective: typeof b.objective === "string" ? b.objective : undefined,
      dailyBudgetUsd,
      status: b.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
    };
    const campaign = await getSaasAdsDashboardService().createCampaign(ctx.tenant.id, input);

    return NextResponse.json({ ok: true, campaign });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) {
      const status = e.code === "NOT_CONNECTED" ? 422 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
