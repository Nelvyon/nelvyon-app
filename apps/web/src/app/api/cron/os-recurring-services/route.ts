/**
 * Cron: monthly autonomous recurring service deliverables.
 * Reads saas_autopilot_settings to dispatch only enabled service types per tenant.
 * Falls back to all-types for tenants with completed pack runs but no autopilot row.
 * Protected by CRON_SECRET header.
 *
 * Railway cron schedule: 0 8 1 * *  (08:00 UTC on the 1st of each month)
 */
import { NextResponse } from "next/server";
import { DbClient } from "@/../../backend/db/DbClient";
import { getOsRecurringServicesService, type RecurringServiceType } from "@/../../backend/saas/OsRecurringServicesService";
import { getSaasAutopilotService } from "@/../../backend/saas/SaasAutopilotService";
import { getOsRecurringRunLogService } from "@/../../backend/saas/OsRecurringRunLogService";

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
  const autopilotSvc = getSaasAutopilotService();
  const runLog = getOsRecurringRunLogService();

  // Tenants with autopilot rows that have at least one toggle ON
  const eligibleAutopilot = await db.query<{
    tenant_id: string;
    seo_enabled: boolean;
    social_enabled: boolean;
    ads_enabled: boolean;
  }>(
    `SELECT tenant_id, seo_enabled, social_enabled, ads_enabled
     FROM saas_autopilot_settings
     WHERE seo_enabled = true OR social_enabled = true OR ads_enabled = true`,
    [],
  );

  // Tenants with completed pack runs but no autopilot row (legacy — generate all)
  const legacyTenants = await db.query<{ tenant_id: string }>(
    `SELECT DISTINCT st.id::text AS tenant_id
     FROM nelvyon_pack_runs npr
     INNER JOIN saas_tenants st ON st.workspace_id = npr.workspace_id
     WHERE npr.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM saas_autopilot_settings sap WHERE sap.tenant_id = st.id
       )`,
    [],
  );

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process autopilot-enabled tenants (only their active service types)
  for (const row of eligibleAutopilot) {
    const types: RecurringServiceType[] = [];
    if (row.seo_enabled) types.push("seo_report");
    if (row.social_enabled) types.push("social_calendar");
    if (row.ads_enabled) types.push("ads_snapshot");

    try {
      const all = await svc.generateMonthlyDeliverables(row.tenant_id, month);
      // generateMonthlyDeliverables always tries all 3; filter by what's active
      const active = all.filter((d) => types.includes(d.serviceType));
      // O19 — record run log (idempotent: new → completed, existing → skipped)
      await runLog.recordGeneration(
        row.tenant_id,
        month,
        all.map((d) => ({ serviceType: d.serviceType, deliverableId: d.id })),
      ).catch(() => null);
      if (active.length > 0) {
        generated += active.length;
        // Mark last run timestamps
        await autopilotSvc.runNow(row.tenant_id, "seo").catch(() => null);
      } else {
        skipped++;
      }
    } catch (e) {
      errors.push(`${row.tenant_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Process legacy tenants (all service types, existing behavior)
  for (const { tenant_id } of legacyTenants) {
    try {
      const deliverables = await svc.generateMonthlyDeliverables(tenant_id, month);
      await runLog.recordGeneration(
        tenant_id,
        month,
        deliverables.map((d) => ({ serviceType: d.serviceType, deliverableId: d.id })),
      ).catch(() => null);
      if (deliverables.length > 0) {
        generated += deliverables.length;
      } else {
        skipped++;
      }
    } catch (e) {
      errors.push(`${tenant_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // O25 — sync retainer cycles for autopilot-eligible tenants (best-effort, non-blocking)
  let retainerSynced = 0;
  try {
    const { getOsRetainerAutopilotService } = await import("@nelvyon/saas");
    const r = await getOsRetainerAutopilotService().syncAllEligibleTenants(month);
    retainerSynced = r.synced;
  } catch { /* retainer sync best-effort */ }

  const totalTenants = eligibleAutopilot.length + legacyTenants.length;

  return NextResponse.json({
    ok: true,
    month,
    retainerSynced,
    tenantsProcessed: totalTenants,
    autopilotTenants: eligibleAutopilot.length,
    legacyTenants: legacyTenants.length,
    deliverablesGenerated: generated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    at: new Date().toISOString(),
  });
}
