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

function mapError(e: SaasAdsDashboardError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "NOT_CONNECTED" ? 422 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/ads/campaigns?platform=meta|google */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") ?? "meta") as AdsPlatform;
    const campaigns = await getSaasAdsDashboardService().listCampaigns(ctx.tenant.id, platform);
    return NextResponse.json({ campaigns });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/ads/campaigns — { platform, campaign_id, action: "pause"|"activate" } */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    const platform = typeof b.platform === "string" ? (b.platform as AdsPlatform) : null;
    const campaignId = typeof b.campaign_id === "string" ? b.campaign_id : null;
    const action = typeof b.action === "string" ? b.action : null;

    if (!platform || !campaignId || !action) {
      return NextResponse.json({ error: "platform, campaign_id, and action are required" }, { status: 400 });
    }
    if (action !== "pause" && action !== "activate") {
      return NextResponse.json({ error: "action must be 'pause' or 'activate'" }, { status: 400 });
    }

    const newStatus = action === "activate" ? "ACTIVE" : "PAUSED";
    await getSaasAdsDashboardService().setCampaignStatus(ctx.tenant.id, platform, campaignId, newStatus);
    return NextResponse.json({ ok: true, campaign_id: campaignId, status: newStatus });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
