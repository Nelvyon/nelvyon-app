import { NextResponse } from "next/server";
import { getSaasWorkflowService } from "@/../../backend/saas/SaasWorkflowService";
import { DbClient } from "@/../../backend/db/DbClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = DbClient.getInstance();
  type TenantRow = { id: string };
  const tenants = await db.query<TenantRow>(
    `SELECT DISTINCT tenant_id AS id FROM saas_workflows WHERE status = 'active' AND trigger_type = 'scheduled'`,
    [],
  );

  let dispatched = 0;
  for (const { id: tenantId } of tenants) {
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "scheduled", {
      triggeredAt: new Date().toISOString(),
    });
    dispatched++;
  }

  return NextResponse.json({ ok: true, tenantsDispatched: dispatched, at: new Date().toISOString() });
}
