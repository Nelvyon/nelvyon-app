import { NextResponse } from "next/server";

import {
  getSaasDashboardService,
  requireSaasContext,
  SaasDashboardError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getModuleStats(tenantId: string) {
  const db = getDb();

  const queries = await Promise.allSettled([
    db.execute(sql`SELECT COUNT(*) AS n FROM saas_crm_contacts WHERE tenant_id = ${tenantId}`),
    db.execute(sql`SELECT COUNT(*) AS n FROM saas_campaigns WHERE tenant_id = ${tenantId}`),
    db.execute(sql`SELECT COUNT(*) AS n FROM saas_workflows WHERE tenant_id = ${tenantId} AND status = 'active'`),
    db.execute(sql`SELECT COUNT(*) AS n FROM saas_forms WHERE tenant_id = ${tenantId}`),
    db.execute(sql`SELECT COUNT(*) AS n FROM saas_appointments WHERE tenant_id = ${tenantId} AND status NOT IN ('cancelled','completed') AND start_at > NOW()`),
  ]);

  function count(r: PromiseSettledResult<{ rows: Record<string, unknown>[] }>) {
    if (r.status !== "fulfilled") return 0;
    return Number(r.value.rows[0]?.n ?? 0);
  }

  return {
    contacts: count(queries[0] as PromiseSettledResult<{ rows: Record<string, unknown>[] }>),
    campaigns: count(queries[1] as PromiseSettledResult<{ rows: Record<string, unknown>[] }>),
    activeWorkflows: count(queries[2] as PromiseSettledResult<{ rows: Record<string, unknown>[] }>),
    forms: count(queries[3] as PromiseSettledResult<{ rows: Record<string, unknown>[] }>),
    upcomingAppointments: count(queries[4] as PromiseSettledResult<{ rows: Record<string, unknown>[] }>),
  };
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const [summary, moduleStats] = await Promise.all([
      getSaasDashboardService().getDashboardSummary(ctx.tenant.id),
      getModuleStats(ctx.tenant.id).catch(() => ({
        contacts: 0,
        campaigns: 0,
        activeWorkflows: 0,
        forms: 0,
        upcomingAppointments: 0,
      })),
    ]);
    return NextResponse.json({ ...summary, moduleStats });
  } catch (e: unknown) {
    if (e instanceof SaasDashboardError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
