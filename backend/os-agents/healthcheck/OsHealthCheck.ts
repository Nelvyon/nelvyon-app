import type { DbClient } from "../../db/DbClient";
import { DbClient as DbClientClass } from "../../db/DbClient";
import { logger } from "../cron/logger";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface ClientHealthReport {
  clientId: string;
  tenantId: string;
  status: HealthStatus;
  jobsLastWeek: number;
  errorRate: number;
  avgDurationMs: number;
  pendingUpsells: number;
  issues: string[];
}

export type OsHealthCheckDeps = {
  db?: Pick<DbClient, "query">;
};

export class OsHealthCheck {
  constructor(private readonly deps: OsHealthCheckDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async checkClient(clientId: string, tenantId: string): Promise<ClientHealthReport> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const jobs = await this.db.query<{
      status: string;
      duration_ms: number | null;
    }>(
      `SELECT status, duration_ms FROM os_jobs
       WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at >= $3::timestamptz`,
      [clientId, tenantId, since],
    );

    const total = jobs.length;
    const errors = jobs.filter((j) => j.status === "failed").length;
    const errorRate = total > 0 ? errors / total : 0;
    const avgDurationMs = total > 0 ? jobs.reduce((sum, j) => sum + (j.duration_ms ?? 0), 0) / total : 0;

    const upsells = await this.db.query<{ id: string }>(
      `SELECT id FROM os_upsell_suggestions WHERE client_id = $1 AND status = 'pending'`,
      [clientId],
    );

    const issues: string[] = [];
    if (errorRate > 0.3) issues.push(`Tasa de error alta: ${Math.round(errorRate * 100)}%`);
    if (avgDurationMs > 30000) issues.push(`Jobs lentos: avg ${Math.round(avgDurationMs / 1000)}s`);
    if (total === 0) issues.push("Sin actividad en los últimos 7 días");

    let status: HealthStatus = "healthy";
    if (total === 0) {
      status = "healthy";
    } else if (issues.length >= 2 || errorRate > 0.5) {
      status = "critical";
    } else if (issues.length === 1) {
      status = "warning";
    }

    const report: ClientHealthReport = {
      clientId,
      tenantId,
      status,
      jobsLastWeek: total,
      errorRate,
      avgDurationMs,
      pendingUpsells: upsells.length,
      issues,
    };

    await this.db.query(
      `INSERT INTO os_health_reports (client_id, tenant_id, status, jobs_last_week, error_rate, avg_duration_ms, pending_upsells, issues)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [clientId, tenantId, status, total, errorRate, avgDurationMs, upsells.length, JSON.stringify(issues)],
    );

    logger.info(`[HEALTH] ${clientId} → ${status} (${total} jobs, ${Math.round(errorRate * 100)}% errores)`);
    return report;
  }

  async runWeeklyHealthCheck(): Promise<ClientHealthReport[]> {
    logger.info("[HEALTH] Iniciando health check semanal");

    const clients = await this.db.query<{ client_id: string; tenant_id: string }>(
      `SELECT DISTINCT client_id, tenant_id::text AS tenant_id FROM os_service_contracts WHERE status = 'active'`,
    );

    const reports: ClientHealthReport[] = [];
    for (const c of clients) {
      try {
        const report = await this.checkClient(c.client_id, c.tenant_id);
        reports.push(report);
      } catch (err) {
        logger.error(`[HEALTH] Error en cliente ${c.client_id}:`, err);
      }
    }

    logger.info(`[HEALTH] Health check completado: ${reports.length} clientes revisados`);
    return reports;
  }
}

export const osHealthCheck = new OsHealthCheck();
