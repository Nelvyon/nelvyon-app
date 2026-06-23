import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const db = DbClient.getInstance();
    const rows = await db.query<{ id: string; agentId: string; status: string; createdAt: string }>(
      `SELECT id, agent_id AS "agentId", status, created_at AS "createdAt"
       FROM saas_agent_runs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [ctx.tenant.id, limit],
    ).catch(() => []);
    return NextResponse.json({ runs: rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
