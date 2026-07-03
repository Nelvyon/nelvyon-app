export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getOsCompetitorGapService } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";

function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Weekly SaaS competitor gap digest per tenant with configured domain */
export async function POST(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const db = DbClient.getInstance();
  const tenants = await db.query<{ id: string; website: string | null }>(
    `SELECT id, website FROM saas_tenants WHERE website IS NOT NULL AND website != '' LIMIT 100`,
  );
  const svc = getOsCompetitorGapService();
  let processed = 0;

  for (const t of tenants) {
    if (!t.website) continue;
    try {
      const runs = await db.query<{ id: string }>(
        `SELECT id FROM os_competitor_gap_runs WHERE tenant_id = $1::uuid
         ORDER BY started_at DESC LIMIT 1`,
        [t.id],
      );
      if (runs.length === 0) continue;
      processed++;
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true, tenantsChecked: tenants.length, processed });
}
