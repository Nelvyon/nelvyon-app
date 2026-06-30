import { NextResponse } from "next/server";

import {
  getSaasDashboardService,
  requireSaasContext,
  SaasDashboardError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getModuleStats(tenantId: string) {
  const db = DbClient.getInstance();

  const queries = await Promise.allSettled([
    db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_crm_contacts WHERE tenant_id = $1`, [tenantId]),
    db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_campanias WHERE tenant_id = $1`, [tenantId]),
    db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_workflows WHERE tenant_id = $1 AND status = 'active'`, [tenantId]),
    db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_forms WHERE tenant_id = $1`, [tenantId]),
    db.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM calendar_events
       WHERE tenant_id = $1 AND type = 'appointment' AND completed = FALSE AND event_date >= CURRENT_DATE`,
      [tenantId],
    ),
  ]);

  function count(r: PromiseSettledResult<{ n: string }[]>) {
    if (r.status !== "fulfilled") return 0;
    return Number(r.value[0]?.n ?? 0);
  }

  return {
    contacts: count(queries[0]),
    campaigns: count(queries[1]),
    activeWorkflows: count(queries[2]),
    forms: count(queries[3]),
    upcomingAppointments: count(queries[4]),
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
