/**
 * Cron: monthly autonomous recurring service deliverables.
 * Runs once per month per tenant that has at least one completed pack run.
 * Protected by CRON_SECRET header.
 *
 * Railway cron schedule: 0 8 1 * *  (08:00 UTC on the 1st of each month)
 */
import { NextResponse } from "next/server";
import { DbClient } from "@/../../backend/db/DbClient";
import { getOsRecurringServicesService } from "@/../../backend/saas/OsRecurringServicesService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const now = new Date();
  const month = monthParam ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const db = DbClient.getInstance();
  const svc = getOsRecurringServicesService();

  // Get distinct tenants that have at least one completed pack run
  const tenants = await db.query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM nelvyon_pack_runs WHERE status='completed' AND tenant_id IS NOT NULL`,
    [],
  );

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { tenant_id } of tenants) {
    try {
      const deliverables = await svc.generateMonthlyDeliverables(tenant_id, month);
      if (deliverables.length > 0) {
        generated += deliverables.length;
      } else {
        skipped++;
      }
    } catch (e) {
      errors.push(`${tenant_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    month,
    tenantsProcessed: tenants.length,
    deliverablesGenerated: generated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    at: new Date().toISOString(),
  });
}
