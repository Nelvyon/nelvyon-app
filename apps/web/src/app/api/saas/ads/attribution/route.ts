export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  SaasAdsDashboardError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type AdsAttributionModel,
  type AdsCampaignLinkInput,
  type AdsPlatform,
} from "@nelvyon/saas";

function mapError(e: SaasAdsDashboardError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 422;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

const VALID_MODELS: AdsAttributionModel[] = ["first_touch", "last_touch", "linear", "time_decay"];

/**
 * GET /api/saas/ads/attribution
 *   ?resource=roas&model=linear&days=30   → attributed ROAS per linked campaign
 *   ?resource=links                        → list campaign links
 *   ?resource=models                       → available model names
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "roas";
    const model = (searchParams.get("model") ?? "linear") as AdsAttributionModel;
    const days = Math.max(1, Math.min(365, Number(searchParams.get("days") ?? "30")));
    const svc = getSaasAdsDashboardService();

    if (resource === "models") {
      return NextResponse.json({ models: VALID_MODELS });
    }

    if (resource === "links") {
      const links = await svc.listCampaignLinks(ctx.tenant.id);
      return NextResponse.json({ links });
    }

    if (!VALID_MODELS.includes(model)) {
      return NextResponse.json({ error: `model must be one of: ${VALID_MODELS.join(", ")}` }, { status: 400 });
    }

    const rows = await svc.getAttributedRoas(ctx.tenant.id, days, model);
    return NextResponse.json({ roas: rows, model, days });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST /api/saas/ads/attribution
 *   { action: "link", platform, external_campaign_id, external_campaign_name?, utm_campaign, utm_source?, utm_medium? }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    if (body.action !== "link") {
      return NextResponse.json({ error: "action must be 'link'" }, { status: 400 });
    }

    const input: AdsCampaignLinkInput = {
      platform: String(body.platform ?? "") as AdsPlatform,
      externalCampaignId: String(body.external_campaign_id ?? ""),
      externalCampaignName: typeof body.external_campaign_name === "string" ? body.external_campaign_name : undefined,
      utmCampaign: String(body.utm_campaign ?? ""),
      utmSource: typeof body.utm_source === "string" ? body.utm_source : undefined,
      utmMedium: typeof body.utm_medium === "string" ? body.utm_medium : undefined,
    };

    const link = await getSaasAdsDashboardService().linkCampaign(ctx.tenant.id, input);
    return NextResponse.json({ link }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasAdsDashboardError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
