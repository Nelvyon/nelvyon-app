import { NextResponse } from "next/server";
import {
  getSaasHubSpotSyncService,
  requireSaasContext,
  resolveHubSpotAccessToken,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const state = await getSaasHubSpotSyncService().getState(ctx.tenant.id);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const token = await resolveHubSpotAccessToken(ctx.tenant.id);
    if (!token) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 });
    }
    const url = new URL(req.url);
    const direction = url.searchParams.get("direction") ?? "pull";
    const svc = getSaasHubSpotSyncService();
    if (direction === "push") {
      const result = await svc.pushContacts(ctx.tenant.id, token);
      const state = await svc.getState(ctx.tenant.id);
      return NextResponse.json({ state, ...result });
    }
    const state = await svc.runSync(ctx.tenant.id, token);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
