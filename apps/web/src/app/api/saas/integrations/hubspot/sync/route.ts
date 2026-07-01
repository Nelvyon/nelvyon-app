export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSaasHubSpotSyncService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

async function getHubSpotToken(tenantId: string): Promise<string | null> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ access_token: string }>(
    `SELECT access_token FROM saas_integration_connections
     WHERE tenant_id=$1 AND connector_slug='hubspot' AND status='connected' LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.access_token ?? null;
}

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
    const token = await getHubSpotToken(ctx.tenant.id);
    if (!token) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 });
    }
    const state = await getSaasHubSpotSyncService().runSync(ctx.tenant.id, token);
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
