import cron from "node-cron";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "./cron/logger";

export interface OsReport {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  reportType: string;
  status: string;
  content: {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    avgDurationMs: number;
    servicesUsed: Array<{ serviceId: string; total: number }>;
    totalResults: number;
  };
  summary: string;
  createdAt: string;
  updatedAt: string;
}

type JobMetricRow = {
  total_jobs: string;
  successful_jobs: string;
  failed_jobs: string;
  avg_duration_ms: string;
};

type ServiceUsageRow = {
  service_id: string;
  total: string;
};

type ResultsCountRow = {
  total_results: string;
};

type ActiveUserRow = {
  user_id: string;
};

type ScheduleFn = (expression: string, callback: () => Promise<void>) => void;

export type OsReportingServiceDeps = {
  db?: Pick<DbClient, "query">;
  schedule?: ScheduleFn;
};

function monthRangeForPreviousMonth(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
  return { start, end };
}

function parseIntSafe(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFloatSafe(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class OsReportingService {
  constructor(private readonly deps: OsReportingServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get schedule(): ScheduleFn {
    return this.deps.schedule ?? cron.schedule;
  }

  async generateMonthlyReport(userId: string, periodStart: Date, periodEnd: Date): Promise<OsReport> {
    const jobMetricsRows = await this.db.query<JobMetricRow>(
      `SELECT
         COUNT(*)::text AS total_jobs,
         COUNT(*) FILTER (WHERE status = 'completed')::text AS successful_jobs,
         COUNT(*) FILTER (WHERE status = 'failed')::text AS failed_jobs,
         COALESCE(AVG(duration_ms), 0)::text AS avg_duration_ms
       FROM os_jobs
       WHERE client_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [userId, periodStart.toISOString(), periodEnd.toISOString()],
    );

    const serviceUsageRows = await this.db.query<ServiceUsageRow>(
      `SELECT service_id, COUNT(*)::text AS total
       FROM os_jobs
       WHERE client_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz
       GROUP BY service_id
       ORDER BY COUNT(*) DESC`,
      [userId, periodStart.toISOString(), periodEnd.toISOString()],
    );

    const resultRows = await this.db.query<ResultsCountRow>(
      `SELECT COUNT(*)::text AS total_results
       FROM os_job_results
       WHERE client_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [userId, periodStart.toISOString(), periodEnd.toISOString()],
    );

    const metrics = jobMetricsRows[0] ?? {
      total_jobs: "0",
      successful_jobs: "0",
      failed_jobs: "0",
      avg_duration_ms: "0",
    };

    const totalJobs = parseIntSafe(metrics.total_jobs);
    const successfulJobs = parseIntSafe(metrics.successful_jobs);
    const failedJobs = parseIntSafe(metrics.failed_jobs);
    const avgDurationMs = parseFloatSafe(metrics.avg_duration_ms);
    const totalResults = parseIntSafe(resultRows[0]?.total_results ?? "0");
    const servicesUsed = serviceUsageRows.map((row) => ({
      serviceId: row.service_id,
      total: parseIntSafe(row.total),
    }));

    const summary = [
      "NELVYON OS - Monthly Report",
      `User: ${userId}`,
      `Period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`,
      `Total Jobs: ${totalJobs}`,
      `Successful Jobs: ${successfulJobs}`,
      `Failed Jobs: ${failedJobs}`,
      `Average Duration (ms): ${Math.round(avgDurationMs)}`,
      `Total Results: ${totalResults}`,
      `Services Used: ${servicesUsed.map((s) => `${s.serviceId}(${s.total})`).join(", ") || "none"}`,
    ].join("\n");

    const rows = await this.db.query<OsReport>(
      `INSERT INTO os_reports
         (user_id, period_start, period_end, report_type, status, content, summary, updated_at)
       VALUES ($1::uuid, $2::timestamptz, $3::timestamptz, 'monthly', 'completed', $4::jsonb, $5, NOW())
       RETURNING id,
                 user_id::text as "userId",
                 period_start as "periodStart",
                 period_end as "periodEnd",
                 report_type as "reportType",
                 status,
                 content,
                 summary,
                 created_at as "createdAt",
                 updated_at as "updatedAt"`,
      [
        userId,
        periodStart.toISOString(),
        periodEnd.toISOString(),
        JSON.stringify({
          totalJobs,
          successfulJobs,
          failedJobs,
          avgDurationMs,
          servicesUsed,
          totalResults,
        }),
        summary,
      ],
    );

    const row = rows[0];
    if (!row) {
      throw new Error("OsReportingService.generateMonthlyReport: INSERT returned no row");
    }

    logger.info(`[REPORTING] Monthly report generated for ${userId}`);
    return row;
  }

  async getReport(reportId: string, userId: string): Promise<OsReport | null> {
    const rows = await this.db.query<OsReport>(
      `SELECT id,
              user_id::text as "userId",
              period_start as "periodStart",
              period_end as "periodEnd",
              report_type as "reportType",
              status,
              content,
              summary,
              created_at as "createdAt",
              updated_at as "updatedAt"
       FROM os_reports
       WHERE id = $1::uuid AND user_id = $2::uuid`,
      [reportId, userId],
    );
    return rows[0] ?? null;
  }

  async listReports(userId: string): Promise<OsReport[]> {
    return this.db.query<OsReport>(
      `SELECT id,
              user_id::text as "userId",
              period_start as "periodStart",
              period_end as "periodEnd",
              report_type as "reportType",
              status,
              content,
              summary,
              created_at as "createdAt",
              updated_at as "updatedAt"
       FROM os_reports
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
  }

  scheduleMonthlyReports(): void {
    this.schedule("0 9 1 * *", async () => {
      try {
        const users = await this.db.query<ActiveUserRow>(
          `SELECT DISTINCT client_id as user_id
           FROM os_service_contracts
           WHERE status = 'active'`,
        );

        const { start, end } = monthRangeForPreviousMonth();
        for (const user of users) {
          try {
            await this.generateMonthlyReport(user.user_id, start, end);
          } catch (err) {
            logger.error(`[REPORTING] Failed monthly report for ${user.user_id}:`, err);
          }
        }
      } catch (err) {
        logger.error("[REPORTING] Monthly schedule failed:", err);
      }
    });
  }
}

export const osReportingService = new OsReportingService();
