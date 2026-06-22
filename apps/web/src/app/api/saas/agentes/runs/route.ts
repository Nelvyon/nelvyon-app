import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT id, agent_id AS "agentId", status, created_at AS "createdAt"
      FROM saas_agent_runs
      WHERE tenant_id = ${ctx.tenant.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ runs: rows.rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
