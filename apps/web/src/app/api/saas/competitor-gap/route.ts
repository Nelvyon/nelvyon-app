export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

/** GET /api/saas/competitor-gap — tenant-scoped competitor gap widget data */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const db = DbClient.getInstance();
    const runs = await db.query<Record<string, unknown>>(
      `SELECT id, own_domain, competitor_domain, gap_score, recommended_pack_id, status, started_at, completed_at
       FROM os_competitor_gap_runs
       WHERE tenant_id = $1::uuid
       ORDER BY started_at DESC LIMIT 5`,
      [ctx.tenant.id],
    ).catch(() => [] as Record<string, unknown>[]);

    const latest = runs[0];
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        ownDomain: r.own_domain,
        competitorDomain: r.competitor_domain,
        gapScore: r.gap_score,
        recommendedPackId: r.recommended_pack_id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
      })),
      summary: latest
        ? {
            gapScore: latest.gap_score,
            recommendedPackId: latest.recommended_pack_id,
            competitorDomain: latest.competitor_domain,
          }
        : null,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
