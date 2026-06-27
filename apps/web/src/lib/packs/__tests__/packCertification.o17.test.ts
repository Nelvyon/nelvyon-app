/**
 * O17 — Pack certification smoke tests (mock runner + mock db, no real orchestrator)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsPackCertificationService,
  OsPackCertError,
  PACK_FIXTURES,
  ALL_PACK_IDS,
  type CertDbPort,
  type CertRunnerPort,
  type PackRunOutcome,
} from "../../../../../../backend/os-agents/packs/OsPackCertificationService";
import { RUNNERS } from "@/app/api/os/packs/[packId]/kickoff/runnersMap";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): CertDbPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as CertDbPort;
}

function certRow(packId: string, over: Record<string, unknown> = {}) {
  return {
    pack_id: packId, status: "pending", last_run_id: null, qa_score: null, legal_passed: null,
    steps_completed: 0, steps_total: 10, deliverables_count: 0, auto_approved: false,
    failure_reason: null, run_duration_ms: null, certified_at: null, last_checked_at: "", metadata: {}, ...over,
  };
}

// UPSERT-aware db: returns a row echoing the inserted status/fields.
function upsertDb(extra?: (sql: string, params: unknown[]) => unknown[] | null): CertDbPort {
  return makeDb((sql, params) => {
    const e = extra?.(sql, params);
    if (e) return e;
    if (sql.includes("INSERT INTO os_pack_certifications") && sql.includes("RETURNING")) {
      const p = params as unknown[];
      return [certRow(String(p[0]), {
        status: p[1], last_run_id: p[2], qa_score: p[3], legal_passed: p[4],
        steps_completed: p[5], steps_total: p[6], deliverables_count: p[7],
        auto_approved: p[8], failure_reason: p[9], run_duration_ms: p[10], certified_at: p[11],
        metadata: typeof p[12] === "string" ? JSON.parse(p[12] as string) : {},
      })];
    }
    return [];
  });
}

function passingOutcome(): PackRunOutcome {
  return {
    id: "run-1",
    status: "completed",
    steps: [{ status: "done" }, { status: "done" }, { status: "done" }],
    report: { kpis: { avg_qa_score: 92, deliverables_published: 3 }, sku_results: [{ qa_legal_passed: true, deliverable_ids: ["a", "b", "c"] }] },
    error_message: null,
  };
}

function mockRunner(outcome: PackRunOutcome): CertRunnerPort {
  return {
    has: () => true,
    validate: () => true,
    run: async () => outcome,
  };
}

// ── fixtures align with real runner validators ───────────────────────────────────

describe("O17 — fixtures validate against real runners", () => {
  it("covers all 8 packs", () => {
    expect(ALL_PACK_IDS).toHaveLength(8);
  });

  for (const packId of Object.keys(PACK_FIXTURES)) {
    it(`real validate() accepts the fixture for ${packId}`, () => {
      const entry = RUNNERS[packId];
      expect(entry).toBeDefined();
      expect(entry!.validate(PACK_FIXTURES[packId])).not.toBeNull();
    });
  }
});

// ── evaluateOutcome ──────────────────────────────────────────────────────────────

describe("O17 — evaluateOutcome", () => {
  const svc = new OsPackCertificationService(makeDb(() => []), mockRunner(passingOutcome()));

  it("passes when completed + qa>=85 + legal", () => {
    const ev = svc.evaluateOutcome(passingOutcome());
    expect(ev.status).toBe("passed");
    expect(ev.qaScore).toBe(92);
    expect(ev.legalPassed).toBe(true);
    expect(ev.deliverablesCount).toBe(3);
    expect(ev.stepsCompleted).toBe(3);
  });

  it("fails when qa below threshold", () => {
    const o = passingOutcome();
    o.report!.kpis!.avg_qa_score = 70;
    const ev = svc.evaluateOutcome(o);
    expect(ev.status).toBe("failed");
    expect(ev.failureReason).toContain("QA score");
  });

  it("fails when legal not passed", () => {
    const o = passingOutcome();
    o.report!.sku_results = [{ qa_legal_passed: false }];
    const ev = svc.evaluateOutcome(o);
    expect(ev.status).toBe("failed");
    expect(ev.failureReason).toContain("Legal");
  });

  it("fails when run status not completed", () => {
    const o = passingOutcome();
    o.status = "failed";
    o.error_message = "runner boom";
    const ev = svc.evaluateOutcome(o);
    expect(ev.status).toBe("failed");
    expect(ev.failureReason).toContain("boom");
  });
});

// ── runCertification ─────────────────────────────────────────────────────────────

describe("O17 — runCertification", () => {
  it("dryRun validates fixture without running", async () => {
    let ran = false;
    const runner: CertRunnerPort = { has: () => true, validate: () => true, run: async () => { ran = true; return passingOutcome(); } };
    const svc = new OsPackCertificationService(upsertDb(), runner);
    const cert = await svc.runCertification("local-business-growth", { dryRun: true });
    expect(ran).toBe(false);
    expect(cert.status).toBe("pending");
  });

  it("records passed certification on a good run", async () => {
    const svc = new OsPackCertificationService(upsertDb(), mockRunner(passingOutcome()));
    const cert = await svc.runCertification("local-business-growth");
    expect(cert.status).toBe("passed");
    expect(cert.qaScore).toBe(92);
    expect(cert.autoApproved).toBe(true);
    expect(cert.certifiedAt).not.toBeNull();
  });

  it("records failed certification when runner throws", async () => {
    const runner: CertRunnerPort = { has: () => true, validate: () => true, run: async () => { throw new Error("kaboom"); } };
    const svc = new OsPackCertificationService(upsertDb(), runner);
    const cert = await svc.runCertification("cro-audit-pack");
    expect(cert.status).toBe("failed");
    expect(cert.failureReason).toContain("kaboom");
  });

  it("throws NOT_FOUND for pack without fixture", async () => {
    const svc = new OsPackCertificationService(upsertDb(), mockRunner(passingOutcome()));
    await expect(svc.runCertification("nope")).rejects.toThrow(OsPackCertError);
  });

  it("throws VALIDATION when fixture rejected", async () => {
    const runner: CertRunnerPort = { has: () => true, validate: () => false, run: async () => passingOutcome() };
    const svc = new OsPackCertificationService(upsertDb(), runner);
    await expect(svc.runCertification("local-business-growth")).rejects.toThrow(OsPackCertError);
  });
});

// ── canPromoteToAvailable / promote ──────────────────────────────────────────────

describe("O17 — promotion rules", () => {
  it("canPromote true for fresh passed cert", async () => {
    const db = makeDb(() => [{ status: "passed", certified_at: new Date().toISOString() }]);
    const svc = new OsPackCertificationService(db, mockRunner(passingOutcome()));
    expect(await svc.canPromoteToAvailable("cro-audit-pack")).toBe(true);
  });

  it("canPromote false for stale cert (>90d)", async () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const db = makeDb(() => [{ status: "passed", certified_at: old }]);
    const svc = new OsPackCertificationService(db, mockRunner(passingOutcome()));
    expect(await svc.canPromoteToAvailable("cro-audit-pack")).toBe(false);
  });

  it("canPromote false when not passed", async () => {
    const db = makeDb(() => [{ status: "failed", certified_at: null }]);
    const svc = new OsPackCertificationService(db, mockRunner(passingOutcome()));
    expect(await svc.canPromoteToAvailable("cro-audit-pack")).toBe(false);
  });

  it("promoteToAvailable throws NOT_CERTIFIED without valid cert", async () => {
    const db = makeDb(() => []);
    const svc = new OsPackCertificationService(db, mockRunner(passingOutcome()));
    await expect(svc.promoteToAvailable("cro-audit-pack")).rejects.toThrow(OsPackCertError);
  });

  it("getPackAvailabilityFromCert returns 'available' only when passed + promoted", async () => {
    const promoted = makeDb(() => [{ status: "passed", metadata: { promoted_to_available: true } }]);
    expect(await new OsPackCertificationService(promoted, mockRunner(passingOutcome())).getPackAvailabilityFromCert("cro-audit-pack")).toBe("available");
    const notPromoted = makeDb(() => [{ status: "passed", metadata: {} }]);
    expect(await new OsPackCertificationService(notPromoted, mockRunner(passingOutcome())).getPackAvailabilityFromCert("cro-audit-pack")).toBeNull();
  });
});
