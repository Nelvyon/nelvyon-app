import { describe, expect, it, vi } from "vitest";

vi.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: vi.fn(),
  },
}));

import cron from "node-cron";

import { OsReportingService } from "../OsReportingService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const START = new Date("2026-04-01T00:00:00.000Z");
const END = new Date("2026-04-30T23:59:59.999Z");

describe("OsReportingService", () => {
  it("generate report con datos guarda reporte completado", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*)::text AS total_jobs")) {
        return [{ total_jobs: "10", successful_jobs: "8", failed_jobs: "2", avg_duration_ms: "1500.2" }];
      }
      if (sql.includes("GROUP BY service_id")) {
        return [
          { service_id: "seo_premium", total: "6" },
          { service_id: "web_premium", total: "4" },
        ];
      }
      if (sql.includes("FROM os_job_results")) {
        return [{ total_results: "9" }];
      }
      if (sql.includes("INSERT INTO os_reports")) {
        return [
          {
            id: "r1",
            userId: USER_ID,
            periodStart: START.toISOString(),
            periodEnd: END.toISOString(),
            reportType: "monthly",
            status: "completed",
            content: {
              totalJobs: 10,
              successfulJobs: 8,
              failedJobs: 2,
              avgDurationMs: 1500.2,
              servicesUsed: [
                { serviceId: "seo_premium", total: 6 },
                { serviceId: "web_premium", total: 4 },
              ],
              totalResults: 9,
            },
            summary: "ok",
            createdAt: START.toISOString(),
            updatedAt: END.toISOString(),
          },
        ];
      }
      return [];
    });

    const service = new OsReportingService({ db: { query } });
    const report = await service.generateMonthlyReport(USER_ID, START, END);

    expect(report.status).toBe("completed");
    expect(report.content.totalJobs).toBe(10);
    expect(report.content.servicesUsed).toHaveLength(2);
    const insertCall = query.mock.calls.find((call) => String(call[0]).includes("INSERT INTO os_reports"));
    expect(insertCall).toBeDefined();
    expect(String(insertCall?.[0])).toContain("$4::jsonb");
  });

  it("generate report sin jobs crea métricas en 0", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*)::text AS total_jobs")) {
        return [{ total_jobs: "0", successful_jobs: "0", failed_jobs: "0", avg_duration_ms: "0" }];
      }
      if (sql.includes("GROUP BY service_id")) return [];
      if (sql.includes("FROM os_job_results")) return [{ total_results: "0" }];
      if (sql.includes("INSERT INTO os_reports")) {
        return [
          {
            id: "r2",
            userId: USER_ID,
            periodStart: START.toISOString(),
            periodEnd: END.toISOString(),
            reportType: "monthly",
            status: "completed",
            content: {
              totalJobs: 0,
              successfulJobs: 0,
              failedJobs: 0,
              avgDurationMs: 0,
              servicesUsed: [],
              totalResults: 0,
            },
            summary: "ok",
            createdAt: START.toISOString(),
            updatedAt: END.toISOString(),
          },
        ];
      }
      return [];
    });

    const report = await new OsReportingService({ db: { query } }).generateMonthlyReport(USER_ID, START, END);
    expect(report.content.totalJobs).toBe(0);
    expect(report.content.failedJobs).toBe(0);
    expect(report.content.servicesUsed).toEqual([]);
  });

  it("get report devuelve fila por id+user", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "r3",
        userId: USER_ID,
        periodStart: START.toISOString(),
        periodEnd: END.toISOString(),
        reportType: "monthly",
        status: "completed",
        content: {},
        summary: "sum",
        createdAt: START.toISOString(),
        updatedAt: END.toISOString(),
      },
    ]);
    const service = new OsReportingService({ db: { query } });
    const report = await service.getReport("r3", USER_ID);
    expect(report?.id).toBe("r3");
    expect(String(query.mock.calls[0]?.[0])).toContain("id = $1::uuid AND user_id = $2::uuid");
  });

  it("list reports devuelve lista ordenada", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "new", userId: USER_ID, periodStart: END.toISOString(), periodEnd: END.toISOString(), reportType: "monthly", status: "completed", content: {}, summary: "", createdAt: END.toISOString(), updatedAt: END.toISOString() },
      { id: "old", userId: USER_ID, periodStart: START.toISOString(), periodEnd: START.toISOString(), reportType: "monthly", status: "completed", content: {}, summary: "", createdAt: START.toISOString(), updatedAt: START.toISOString() },
    ]);
    const service = new OsReportingService({ db: { query } });
    const reports = await service.listReports(USER_ID);
    expect(reports).toHaveLength(2);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("schedule setup registra cron mensual 0 9 1 * *", () => {
    const service = new OsReportingService({ db: { query: vi.fn().mockResolvedValue([]) } });
    service.scheduleMonthlyReports();
    expect(cron.schedule).toHaveBeenCalledWith("0 9 1 * *", expect.any(Function));
  });
});
