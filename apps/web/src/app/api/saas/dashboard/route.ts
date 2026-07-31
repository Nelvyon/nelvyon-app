import { NextResponse } from "next/server";

import {
  getSaasDashboardService,
  requireSaasContext,
  SaasDashboardError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";
import { bffDegraded, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_MODULE_STATS = bffDegraded(
  {
    contacts: 0,
    campaigns: 0,
    activeWorkflows: 0,
    forms: 0,
    upcomingAppointments: 0,
  },
  BFF_DEGRADED_UPSTREAM,
);

const EMPTY_DASHBOARD_METRICS = bffDegraded(
  {
    activeJobs: 0,
    completedJobs: 0,
    totalSpend: 0,
    recentActivity: [] as unknown[],
  },
  BFF_DEGRADED_UPSTREAM,
);

async function getModuleStats(tenantId: string) {
  const db = DbClient.getInstance();

  const queries = await Promise.allSettled([
    db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_contacts WHERE tenant_id = $1`, [tenantId]),
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

  const rejected = queries.filter((q) => q.status === "rejected").length;
  const stats = {
    contacts: count(queries[0]),
    campaigns: count(queries[1]),
    activeWorkflows: count(queries[2]),
    forms: count(queries[3]),
    upcomingAppointments: count(queries[4]),
  };

  if (rejected > 0) {
    return bffDegraded(
      stats,
      `${BFF_DEGRADED_UPSTREAM}:module_stats_partial(${rejected}/${queries.length})`,
    );
  }
  return stats;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasDashboardService();
    const authTenantId = await svc.resolveAuthTenantId(ctx.tenant.id);
    const [metricsSettled, moduleStatsSettled] = await Promise.all([
      svc.getDashboardMetrics(ctx.tenant.id, authTenantId).then(
        (m) => ({ ok: true as const, value: m }),
        () => ({ ok: false as const, value: EMPTY_DASHBOARD_METRICS }),
      ),
      getModuleStats(ctx.tenant.id).then(
        (m) => ({ ok: true as const, value: m }),
        () => ({ ok: false as const, value: EMPTY_MODULE_STATS }),
      ),
    ]);
    const metrics = metricsSettled.value;
    const moduleStats = moduleStatsSettled.value;
    const degraded =
      !metricsSettled.ok ||
      !moduleStatsSettled.ok ||
      ("degraded" in metrics && metrics.degraded === true) ||
      ("degraded" in moduleStats && moduleStats.degraded === true);
    const degraded_reason = [
      !metricsSettled.ok || ("degraded" in metrics && metrics.degraded)
        ? ("degraded_reason" in metrics && typeof metrics.degraded_reason === "string"
            ? metrics.degraded_reason
            : BFF_DEGRADED_UPSTREAM)
        : null,
      !moduleStatsSettled.ok || ("degraded" in moduleStats && moduleStats.degraded)
        ? ("degraded_reason" in moduleStats && typeof moduleStats.degraded_reason === "string"
            ? moduleStats.degraded_reason
            : BFF_DEGRADED_UPSTREAM)
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    return NextResponse.json({
      tenant: ctx.tenant,
      ...metrics,
      moduleStats,
      ...(degraded ? { degraded: true as const, degraded_reason: degraded_reason || BFF_DEGRADED_UPSTREAM } : {}),
    });
  } catch (e: unknown) {
    if (e instanceof SaasDashboardError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
