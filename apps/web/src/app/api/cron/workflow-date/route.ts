/**
 * Cron endpoint — processes date_reached workflow triggers.
 * Should be called once per day (e.g. 00:05 UTC).
 * Protected by CRON_SECRET header.
 */
import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import { dispatchDateReached } from "../../../../../../../backend/saas/saasWorkflowDispatch";
import { verifyCronFlexible } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = verifyCronFlexible(
    req.headers.get("x-cron-secret"),
    req.headers.get("authorization"),
  );
  if (denied) return denied;

  // Get all unique tenant_ids that have active date_reached workflows
  const db = DbClient.getInstance();
  let rows: { tenant_id: string }[];
  try {
    rows = await db.query<{ tenant_id: string }>(
      `SELECT DISTINCT tenant_id FROM saas_workflows
       WHERE status = 'active' AND trigger_type = 'date_reached'`,
    );
  } catch (e) {
    console.error("[cron/workflow-date] failed to list tenants", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

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
