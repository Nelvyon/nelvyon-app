/**
 * Cron endpoint — processes date_reached workflow triggers.
 * Should be called once per day (e.g. 00:05 UTC).
 * Protected by CRON_SECRET header.
 */
import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import { dispatchDateReached } from "../../../../../../../backend/saas/saasWorkflowDispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all unique tenant_ids that have active date_reached workflows
  const db = DbClient.getInstance();
  const rows = await db.query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM saas_workflows
     WHERE status = 'active' AND trigger_type = 'date_reached'`,
  ).catch(() => [] as { tenant_id: string }[]);

  let processed = 0;
  const errors: string[] = [];

  for (const { tenant_id } of rows) {
    try {
      await dispatchDateReached(tenant_id);
      processed++;
    } catch (e) {
      errors.push(`${tenant_id}: ${String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    date: new Date().toISOString().slice(0, 10),
    tenantsProcessed: processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
