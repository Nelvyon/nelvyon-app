/**
 * O22 — OsPackGateService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsPackGateService,
  OsPackGateError,
  type CertPort,
  type VitestPort,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

function gateRow(over: Record<string, unknown> = {}) {
  return {
    id: "gate-1", run_key: "sha123", trigger_source: "ci", status: "running",
    packs_total: 8, packs_passed: 0, packs_failed: 0, checks: [], error_message: null,
    metadata: {}, started_at: "2026-06-01T00:00:00Z", completed_at: null, ...over,
  };
}

const ALL_VALID: CertPort = {
  validateAllFixtures: () => Array.from({ length: 8 }, (_, i) => ({ packId: `pack-${i}`, valid: true })),
  dryRunAll: async () => Array.from({ length: 8 }, (_, i) => ({ packId: `pack-${i}`, status: "pending" })),
};
const vitestPass: VitestPort = { runGateTests: async () => ({ passed: 4, failed: 0, files: ["a"] }) };
const vitestFail: VitestPort = { runGateTests: async () => ({ passed: 2, failed: 2, files: ["a"] }) };

// ── startRun / completeRun / failRun ─────────────────────────────────────────────

describe("OsPackGateService — lifecycle", () => {
  it("startRun inserts running row", async () => {
    const db = makeDb(() => [gateRow({ status: "running" })]);
    const run = await new OsPackGateService(db, ALL_VALID, vitestPass).startRun("sha123", "ci");
    expect(run.status).toBe("running");
    expect(run.runKey).toBe("sha123");
  });

  it("completeRun → passed when 0 failed + all checks ok", async () => {
    const db = makeDb(() => [gateRow({ status: "passed", packs_passed: 8 })]);
    const run = await new OsPackGateService(db, ALL_VALID, vitestPass).completeRun("gate-1", {
      packsPassed: 8, packsFailed: 0, checks: [{ name: "x", ok: true }],
    });
    expect(run.status).toBe("passed");
  });

  it("completeRun → failed when a check is not ok", async () => {
    const db = makeDb((sql, params) => [gateRow({ status: params[1] as string })]);
    const run = await new OsPackGateService(db, ALL_VALID, vitestPass).completeRun("gate-1", {
      packsPassed: 7, packsFailed: 1, checks: [{ name: "x", ok: false }],
    });
    expect(run.status).toBe("failed");
  });

  it("completeRun throws NOT_FOUND when missing", async () => {
    await expect(new OsPackGateService(NO_DATA, ALL_VALID, vitestPass).completeRun("x", { packsPassed: 0, packsFailed: 0, checks: [] }))
      .rejects.toThrow(OsPackGateError);
  });

  it("failRun sets failed + error", async () => {
    const db = makeDb(() => [gateRow({ status: "failed", error_message: "boom" })]);
    const run = await new OsPackGateService(db, ALL_VALID, vitestPass).failRun("gate-1", "boom");
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toBe("boom");
  });
});

// ── runLocalGate ─────────────────────────────────────────────────────────────────

describe("OsPackGateService — runLocalGate", () => {
  function gateDb() {
    return makeDb((sql, params) => {
      if (sql.includes("INSERT INTO os_pack_gate_runs")) return [gateRow({ status: "running" })];
      if (sql.includes("UPDATE os_pack_gate_runs")) return [gateRow({ status: params[1] as string, packs_passed: params[2] as number, packs_failed: params[3] as number })];
      return [];
    });
  }

  it("8/8 valid + vitest pass → passed", async () => {
    const svc = new OsPackGateService(gateDb(), ALL_VALID, vitestPass);
    const r = await svc.runLocalGate({ runKey: "sha123", source: "ci" });
    expect(r.status).toBe("passed");
    expect(r.packsPassed).toBe(8);
    expect(r.packsFailed).toBe(0);
    expect(r.checks.find((c) => c.name === "vitest")?.ok).toBe(true);
  });

  it("1 invalid fixture → failed", async () => {
    const certOneBad: CertPort = {
      validateAllFixtures: () => [
        ...Array.from({ length: 7 }, (_, i) => ({ packId: `pack-${i}`, valid: true })),
        { packId: "pack-bad", valid: false },
      ],
      dryRunAll: async () => Array.from({ length: 8 }, (_, i) => ({ packId: `pack-${i}`, status: "pending" })),
    };
    const svc = new OsPackGateService(gateDb(), certOneBad, vitestPass);
    const r = await svc.runLocalGate({ runKey: "sha123" });
    expect(r.status).toBe("failed");
    expect(r.packsFailed).toBe(1);
  });

  it("vitest fail → failed even if fixtures valid", async () => {
    const svc = new OsPackGateService(gateDb(), ALL_VALID, vitestFail);
    const r = await svc.runLocalGate({ runKey: "sha123" });
    expect(r.status).toBe("failed");
    expect(r.checks.find((c) => c.name === "vitest")?.ok).toBe(false);
  });

  it("runVitest:false skips the vitest check (API path)", async () => {
    const svc = new OsPackGateService(gateDb(), ALL_VALID, vitestFail);
    const r = await svc.runLocalGate({ runKey: "sha123", runVitest: false });
    expect(r.status).toBe("passed");
    expect(r.checks.find((c) => c.name === "vitest")).toBeUndefined();
  });

  it("checks[] has fixture entries per pack", async () => {
    const svc = new OsPackGateService(gateDb(), ALL_VALID, vitestPass);
    const r = await svc.runLocalGate({ runKey: "sha123" });
    expect(r.checks.filter((c) => c.name.startsWith("fixture:"))).toHaveLength(8);
    expect(r.checks.find((c) => c.name === "dryRunAll")?.ok).toBe(true);
  });
});

// ── listRuns / getSummary ────────────────────────────────────────────────────────

describe("OsPackGateService — list/summary", () => {
  it("listRuns maps rows", async () => {
    const db = makeDb(() => [gateRow(), gateRow({ id: "gate-2" })]);
    expect(await new OsPackGateService(db, ALL_VALID, vitestPass).listRuns()).toHaveLength(2);
  });

  it("getSummary aggregates pass rate + last status", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("GROUP BY status")) return [{ status: "passed", count: "8" }, { status: "failed", count: "2" }];
      if (sql.includes("ORDER BY started_at DESC LIMIT 1")) return [{ status: "passed" }];
      return [];
    });
    const s = await new OsPackGateService(db, ALL_VALID, vitestPass).getSummary();
    expect(s.total).toBe(10);
    expect(s.passed).toBe(8);
    expect(s.passRate).toBe(80);
    expect(s.lastStatus).toBe("passed");
  });
});
