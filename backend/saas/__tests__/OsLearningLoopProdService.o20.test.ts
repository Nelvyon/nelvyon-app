/**
 * O20 — OsLearningLoopProdService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsLearningLoopProdService,
  OsLearningLoopError,
  type LearningGa4Port,
  type LearningRefreshPort,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

function runRow(over: Record<string, unknown> = {}) {
  return {
    id: "run-1", period_key: "2026-06", trigger_source: "cron", status: "running",
    ga4_users: 0, sectors_updated: 0, templates_ranked: 0, seeds_reranked: 0,
    error_message: null, metadata: {}, started_at: "2026-06-01T00:00:00Z", completed_at: null, ...over,
  };
}

function ga4Port(over: Partial<LearningGa4Port> = {}): LearningGa4Port {
  return {
    listActiveGa4UserIds: async () => ["u1"],
    runForUser: async () => ({ weights: { dental: 0.08 }, totalSessions: 100 }),
    mode: () => "mock",
    ...over,
  };
}

const refreshPort: LearningRefreshPort = { run: async () => ({ templatesRanked: 12, alerts: 2 }) };

function svcWith(db: SaasPostgresPort, ga4 = ga4Port(), refresh = refreshPort) {
  return new OsLearningLoopProdService(db, ga4, refresh);
}

// ── periodKey ────────────────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — periodKey", () => {
  it("formats YYYY-MM UTC", () => {
    expect(svcWith(NO_DATA).periodKey(new Date(Date.UTC(2026, 5, 15)))).toBe("2026-06");
  });
  it("pads single-digit months", () => {
    expect(svcWith(NO_DATA).periodKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
  });
});

// ── startRun idempotency ─────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — startRun", () => {
  it("starts a running run (not skipped)", async () => {
    const db = makeDb(() => [{ ...runRow({ status: "running" }), was_completed: false }]);
    const { run, skipped } = await svcWith(db).startRun("cron", "2026-06");
    expect(run.status).toBe("running");
    expect(skipped).toBe(false);
  });

  it("detects already-completed period → skipped", async () => {
    const db = makeDb(() => [{ ...runRow({ status: "completed" }), was_completed: true }]);
    const { skipped } = await svcWith(db).startRun("cron", "2026-06");
    expect(skipped).toBe(true);
  });

  it("UPSERT does not degrade completed (SQL guard present)", async () => {
    const db = makeDb(() => [{ ...runRow(), was_completed: false }]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    await svcWith(db).startRun("cron", "2026-06");
    const sql = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain("WHEN os_learning_run_log.status = 'completed' THEN 'completed'");
  });
});

// ── completeRun / failRun ────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — complete/fail", () => {
  it("completeRun stores stats", async () => {
    const db = makeDb(() => [runRow({ status: "completed", ga4_users: 2, sectors_updated: 3, templates_ranked: 12, seeds_reranked: 40 })]);
    const run = await svcWith(db).completeRun("run-1", { ga4Users: 2, sectorsUpdated: 3, templatesRanked: 12, seedsReranked: 40 });
    expect(run.status).toBe("completed");
    expect(run.templatesRanked).toBe(12);
    expect(run.seedsReranked).toBe(40);
  });

  it("completeRun throws NOT_FOUND when missing", async () => {
    await expect(svcWith(NO_DATA).completeRun("x", { ga4Users: 0, sectorsUpdated: 0, templatesRanked: 0, seedsReranked: 0 }))
      .rejects.toThrow(OsLearningLoopError);
  });

  it("failRun stores error", async () => {
    const db = makeDb(() => [runRow({ status: "failed", error_message: "boom" })]);
    const run = await svcWith(db).failRun("run-1", "boom");
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toBe("boom");
  });
});

// ── listRuns / getSummary ────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — list/summary", () => {
  it("listRuns maps rows", async () => {
    const db = makeDb(() => [runRow(), runRow({ id: "run-2" })]);
    expect(await svcWith(db).listRuns()).toHaveLength(2);
  });

  it("getSummary aggregates + avg sectors", async () => {
    const db = makeDb(() => [
      { status: "completed", count: "4", avg_sectors: "5" },
      { status: "skipped", count: "1", avg_sectors: "0" },
    ]);
    const s = await svcWith(db).getSummary();
    expect(s.total).toBe(5);
    expect(s.completed).toBe(4);
    expect(s.skipped).toBe(1);
    expect(s.avgSectorsUpdated).toBe(4); // (5*4 + 0*1)/5 = 4
  });
});

// ── applySeedReranks ─────────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — applySeedReranks", () => {
  it("persists rank 1..n + score per sector", async () => {
    const updates: unknown[][] = [];
    const db = makeDb((sql, params) => {
      if (sql.includes("SELECT id FROM os_envato_seed_registry")) return [{ id: "s1" }, { id: "s2" }];
      if (sql.includes("UPDATE os_envato_seed_registry")) { updates.push(params); return []; }
      return [];
    });
    const reranked = await svcWith(db).applySeedReranks({ dental: 0.08 });
    expect(reranked).toBe(2);
    expect(updates[0]![1]).toBe(1); // rank
    expect(updates[1]![1]).toBe(2);
    expect(updates[0]![2]).toBeCloseTo(0.08, 4); // score
  });

  it("returns 0 when no seeds for sector", async () => {
    const db = makeDb(() => []);
    expect(await svcWith(db).applySeedReranks({ dental: 0.05 })).toBe(0);
  });
});

// ── runProdLoop ──────────────────────────────────────────────────────────────────

describe("OsLearningLoopProdService — runProdLoop", () => {
  it("skips when no GA4 integrations", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_learning_run_log")) return [{ ...runRow(), was_completed: false }];
      return [];
    });
    const svc = svcWith(db, ga4Port({ listActiveGa4UserIds: async () => [] }));
    const result = await svc.runProdLoop({ source: "cron" });
    expect(result.status).toBe("skipped");
    expect(result.skipped).toBe(true);
    expect(result.stats.ga4Users).toBe(0);
  });

  it("skips when period already completed", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_learning_run_log")) return [{ ...runRow({ status: "completed" }), was_completed: true }];
      return [];
    });
    const result = await svcWith(db).runProdLoop({ source: "cron" });
    expect(result.skipped).toBe(true);
    expect(result.status).toBe("completed");
  });

  it("happy path: GA4 → weights → templates → seeds → completed", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_learning_run_log")) return [{ ...runRow(), was_completed: false }];
      if (sql.includes("SELECT id FROM os_envato_seed_registry")) return [{ id: "s1" }, { id: "s2" }];
      if (sql.includes("UPDATE os_envato_seed_registry")) return [];
      if (sql.includes("UPDATE os_learning_run_log")) return [runRow({ status: "completed", sectors_updated: 1, templates_ranked: 12, seeds_reranked: 2 })];
      return [];
    });
    const result = await svcWith(db).runProdLoop({ source: "manual" });
    expect(result.status).toBe("completed");
    expect(result.skipped).toBe(false);
    expect(result.stats.ga4Users).toBe(1);
    expect(result.stats.sectorsUpdated).toBe(1);
    expect(result.stats.templatesRanked).toBe(12);
    expect(result.stats.seedsReranked).toBe(2);
  });

  it("records partial error when a GA4 user fails but still completes", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_learning_run_log")) return [{ ...runRow(), was_completed: false }];
      if (sql.includes("UPDATE os_learning_run_log")) return [runRow({ status: "completed" })];
      return [];
    });
    const svc = svcWith(db, ga4Port({
      listActiveGa4UserIds: async () => ["u1"],
      runForUser: async () => { throw new Error("ga4 boom"); },
    }));
    const result = await svc.runProdLoop({ source: "cron" });
    expect(result.status).toBe("completed");
    expect(result.partialErrors.some((e) => e.includes("ga4 boom"))).toBe(true);
  });
});
