/**
 * O19 — OsRecurringRunLogService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsRecurringRunLogService,
  OsRecurringRunLogError,
  RECURRING_TYPE_MAP,
} from "@nelvyon/saas";
import type { SaasPostgresPort as Port } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): Port {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as Port;
}

const NO_DATA = makeDb(() => []);

function runRow(over: Record<string, unknown> = {}) {
  return {
    id: "run-1", tenant_id: "t1", workspace_id: null, service_type: "seo", period_key: "2026-06",
    status: "running", deliverable_id: null, error_message: null, metadata: {},
    started_at: "2026-06-01T00:00:00Z", completed_at: null, ...over,
  };
}

// ── periodKey ────────────────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — periodKey", () => {
  const svc = new OsRecurringRunLogService(NO_DATA);
  it("formats YYYY-MM", () => {
    expect(svc.periodKey(new Date(Date.UTC(2026, 5, 15)))).toBe("2026-06");
  });
  it("pads single-digit month", () => {
    expect(svc.periodKey(new Date(Date.UTC(2026, 0, 3)))).toBe("2026-01");
  });
});

// ── RECURRING_TYPE_MAP ───────────────────────────────────────────────────────────

describe("RECURRING_TYPE_MAP", () => {
  it("maps deliverable types to short run types", () => {
    expect(RECURRING_TYPE_MAP.seo_report).toBe("seo");
    expect(RECURRING_TYPE_MAP.social_calendar).toBe("social");
    expect(RECURRING_TYPE_MAP.ads_snapshot).toBe("ads");
  });
});

// ── startRun ─────────────────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — startRun", () => {
  it("inserts a running row (idempotent upsert)", async () => {
    const db = makeDb(() => [runRow({ status: "running" })]);
    const svc = new OsRecurringRunLogService(db);
    const run = await svc.startRun("t1", "seo", "2026-06");
    expect(run.status).toBe("running");
    expect(run.serviceType).toBe("seo");
  });

  it("uses ON CONFLICT to stay idempotent", async () => {
    const db = makeDb(() => [runRow()]) as Port & { query: ReturnType<typeof vi.fn> };
    const svc = new OsRecurringRunLogService(db);
    await svc.startRun("t1", "seo", "2026-06");
    const sql = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain("ON CONFLICT (tenant_id, service_type, period_key)");
  });
});

// ── completeRun / failRun ────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — complete/fail", () => {
  it("completeRun sets completed + deliverable", async () => {
    const db = makeDb(() => [runRow({ status: "completed", deliverable_id: "d1", completed_at: "2026-06-01T01:00:00Z" })]);
    const svc = new OsRecurringRunLogService(db);
    const run = await svc.completeRun("run-1", "d1");
    expect(run.status).toBe("completed");
    expect(run.deliverableId).toBe("d1");
  });

  it("completeRun throws NOT_FOUND when missing", async () => {
    const svc = new OsRecurringRunLogService(NO_DATA);
    await expect(svc.completeRun("nope")).rejects.toThrow(OsRecurringRunLogError);
  });

  it("failRun sets failed + error", async () => {
    const db = makeDb(() => [runRow({ status: "failed", error_message: "boom" })]);
    const svc = new OsRecurringRunLogService(db);
    const run = await svc.failRun("run-1", "boom");
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toBe("boom");
  });
});

// ── skipRun ──────────────────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — skipRun", () => {
  it("records a skipped run idempotently", async () => {
    const db = makeDb(() => [runRow({ status: "skipped" })]);
    const svc = new OsRecurringRunLogService(db);
    const run = await svc.skipRun("t1", "seo", "2026-06", "dup");
    expect(run.status).toBe("skipped");
  });
});

// ── recordGeneration (idempotency core) ──────────────────────────────────────────

describe("OsRecurringRunLogService — recordGeneration", () => {
  it("completes generated types and skips the rest", async () => {
    const calls: string[] = [];
    const db = makeDb((sql) => {
      calls.push(sql);
      if (sql.includes("INSERT INTO os_recurring_run_log") && sql.includes("'running'")) return [runRow({ status: "running" })];
      if (sql.includes("UPDATE os_recurring_run_log") && sql.includes("'completed'")) return [runRow({ status: "completed", deliverable_id: "d1" })];
      if (sql.includes("'skipped'")) return [runRow({ status: "skipped" })];
      return [];
    });
    const svc = new OsRecurringRunLogService(db);
    // only seo generated; social + ads should be skipped
    const runs = await svc.recordGeneration("t1", "2026-06", [{ serviceType: "seo_report", deliverableId: "d1" }]);
    expect(runs).toHaveLength(3);
    expect(runs.filter((r) => r.status === "completed")).toHaveLength(1);
    expect(runs.filter((r) => r.status === "skipped")).toHaveLength(2);
  });

  it("all generated → all completed", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("'running'")) return [runRow({ status: "running" })];
      if (sql.includes("UPDATE") && sql.includes("'completed'")) return [runRow({ status: "completed", deliverable_id: "x" })];
      if (sql.includes("'skipped'")) return [runRow({ status: "skipped" })];
      return [];
    });
    const svc = new OsRecurringRunLogService(db);
    const runs = await svc.recordGeneration("t1", "2026-06", [
      { serviceType: "seo_report", deliverableId: "a" },
      { serviceType: "social_calendar", deliverableId: "b" },
      { serviceType: "ads_snapshot", deliverableId: "c" },
    ]);
    expect(runs.filter((r) => r.status === "completed")).toHaveLength(3);
  });

  it("nothing generated → all skipped (idempotent re-run)", async () => {
    const db = makeDb((sql) => (sql.includes("'skipped'") ? [runRow({ status: "skipped" })] : []));
    const svc = new OsRecurringRunLogService(db);
    const runs = await svc.recordGeneration("t1", "2026-06", []);
    expect(runs).toHaveLength(3);
    expect(runs.every((r) => r.status === "skipped")).toBe(true);
  });
});

// ── listRuns ─────────────────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — listRuns", () => {
  it("maps rows", async () => {
    const db = makeDb(() => [runRow(), runRow({ id: "run-2" })]);
    const svc = new OsRecurringRunLogService(db);
    expect(await svc.listRuns()).toHaveLength(2);
  });

  it("applies tenant + status filters", async () => {
    const db = makeDb(() => []) as Port & { query: ReturnType<typeof vi.fn> };
    const svc = new OsRecurringRunLogService(db);
    await svc.listRuns({ tenantId: "t1", status: "completed" });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("t1");
    expect(params).toContain("completed");
  });
});

// ── getSummary ───────────────────────────────────────────────────────────────────

describe("OsRecurringRunLogService — getSummary", () => {
  it("aggregates by status and service", async () => {
    const db = makeDb(() => [
      { service_type: "seo", status: "completed", count: "5" },
      { service_type: "social", status: "skipped", count: "3" },
      { service_type: "ads", status: "failed", count: "1" },
    ]);
    const svc = new OsRecurringRunLogService(db);
    const s = await svc.getSummary();
    expect(s.total).toBe(9);
    expect(s.completed).toBe(5);
    expect(s.skipped).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.byService.seo).toBe(5);
  });

  it("returns zeros when empty", async () => {
    const svc = new OsRecurringRunLogService(NO_DATA);
    const s = await svc.getSummary();
    expect(s.total).toBe(0);
  });
});
