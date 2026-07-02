import { NextResponse } from "next/server";
import {
  getSaasCrmSyncService,
  getSaasHubSpotSyncService,
  refreshCrmAccessTokenIfNeeded,
  refreshHubSpotAccessTokenIfNeeded,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  type CrmConnectorSlug,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRM_SLUGS = new Set<string>(["hubspot", "salesforce", "pipedrive", "zoho"]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    if (!CRM_SLUGS.has(slug)) {
      return NextResponse.json({ error: "Unsupported CRM connector" }, { status: 404 });
    }
    const authCtx = await requireSaasContext(req, "settings.read");
    if (slug === "hubspot") {
      const state = await getSaasHubSpotSyncService().getState(authCtx.tenant.id);
      return NextResponse.json({ state });
    }
    const state = await getSaasCrmSyncService().getState(authCtx.tenant.id, slug as Exclude<CrmConnectorSlug, "hubspot">);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    if (!CRM_SLUGS.has(slug)) {
      return NextResponse.json({ error: "Unsupported CRM connector" }, { status: 404 });
    }
    const authCtx = await requireSaasContext(req, "settings.write");
    const url = new URL(req.url);
    const direction = url.searchParams.get("direction") ?? "pull";

    if (slug === "hubspot") {
      const token = await refreshHubSpotAccessTokenIfNeeded(authCtx.tenant.id);
      if (!token) return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 });
      const svc = getSaasHubSpotSyncService();
      if (direction === "push") {
        const result = await svc.pushContacts(authCtx.tenant.id, token);
        const state = await svc.getState(authCtx.tenant.id);
        return NextResponse.json({ state, ...result });
      }
      const state = await svc.runSync(authCtx.tenant.id, token);
      return NextResponse.json({ state });
    }

    const token = await refreshCrmAccessTokenIfNeeded(authCtx.tenant.id, slug as CrmConnectorSlug);
    if (!token) {
      return NextResponse.json({ error: `${slug} not connected` }, { status: 400 });
    }
    const svc = getSaasCrmSyncService();
    if (direction === "push") {
      const result = await svc.pushContacts(authCtx.tenant.id, slug as Exclude<CrmConnectorSlug, "hubspot">, token);
      const state = await svc.getState(authCtx.tenant.id, slug as Exclude<CrmConnectorSlug, "hubspot">);
      return NextResponse.json({ state, ...result });
    }
    const state = await svc.runSync(authCtx.tenant.id, slug as Exclude<CrmConnectorSlug, "hubspot">, token);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
