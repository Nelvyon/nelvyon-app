import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  jobsTotal: number;
  jobsCompleted: number;
  jobsFailed: number;
  successRate: number;
  assetsGenerated: number;
  avgDurationMs: number;
  lastRunAt: string | null;
}

export interface ClientAnalytics {
  userId: string;
  tenantId: string;
  period: "7d" | "30d" | "90d";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalAssets: number;
  estimatedValueEur: number;
  serviceMetrics: ServiceMetrics[];
  monthlyTrend: { month: string; jobs: number; assets: number }[];
}

export type SaasAnalyticsServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasAnalyticsService {
  constructor(private readonly deps: SaasAnalyticsServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async getClientAnalytics(userId: string, tenantId: string, period: "7d" | "30d" | "90d" = "30d"): Promise<ClientAnalytics> {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const jobs = await this.db.query<{ status: string; service_id: string; duration_ms: number | null; created_at: string }>(
      `SELECT status, service_id, duration_ms, created_at
       FROM os_jobs WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at >= $3::timestamptz`,
      [userId, tenantId, since],
    );

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;
    const successRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

    const assets = await this.db.query<{ id: string; service_id: string }>(
      `SELECT id, service_id FROM os_assets WHERE client_id = $1 AND tenant_id = $2 AND created_at >= $3::timestamptz`,
      [userId, tenantId, since],
    );

    const estimatedValueEur = completedJobs * 97;

    const serviceIds = [...new Set(jobs.map((j) => j.service_id))];
    const serviceMetrics: ServiceMetrics[] = serviceIds.map((serviceId) => {
      const svcJobs = jobs.filter((j) => j.service_id === serviceId);
      const completed = svcJobs.filter((j) => j.status === "completed").length;
      const failed = svcJobs.filter((j) => j.status === "failed").length;
      const avgDuration = svcJobs.length > 0 ? svcJobs.reduce((s, j) => s + (j.duration_ms ?? 0), 0) / svcJobs.length : 0;
      const lastRun = [...svcJobs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;

      return {
        serviceId,
        serviceName: serviceId.replace(/_/g, " ").replace("premium", "").trim(),
        jobsTotal: svcJobs.length,
        jobsCompleted: completed,
        jobsFailed: failed,
        successRate: svcJobs.length > 0 ? completed / svcJobs.length : 0,
        assetsGenerated: assets.filter((a) => a.service_id === serviceId).length,
        avgDurationMs: avgDuration,
        lastRunAt: lastRun,
      };
    });

    const trendRows = await this.db.query<{ month: string; jobs: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month, COUNT(*)::text as jobs
       FROM os_jobs WHERE client_id = $1 AND tenant_id = $2::uuid AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY month ORDER BY month ASC`,
      [userId, tenantId],
    );

    const assetTrend = await this.db.query<{ month: string; assets: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month, COUNT(*)::text as assets
       FROM os_assets WHERE client_id = $1 AND tenant_id = $2 AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY month ORDER BY month ASC`,
      [userId, tenantId],
    );

    const monthlyTrend = trendRows.map((r) => ({
      month: r.month,
      jobs: parseInt(r.jobs, 10),
      assets: parseInt(assetTrend.find((a) => a.month === r.month)?.assets ?? "0", 10),
    }));

    logger.info(`[ANALYTICS] ${userId} period=${period} jobs=${totalJobs} success=${Math.round(successRate * 100)}%`);

    return {
      userId,
      tenantId,
      period,
      totalJobs,
      completedJobs,
      failedJobs,
      successRate,
      totalAssets: assets.length,
      estimatedValueEur,
      serviceMetrics,
      monthlyTrend,
    };
  }
}

export const saasAnalyticsService = new SaasAnalyticsService();
