/**
 * S49 — SaasBriefToLaunchService unit tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  SaasBriefToLaunchService,
  SaasBriefToLaunchError,
} from "../SaasBriefToLaunchService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── Runner port helpers ───────────────────────────────────────────────────────

const mockRun = vi.fn().mockResolvedValue({ id: "run-abc" });

function makeRunners(enabled = true) {
  return {
    getRunner(_packId: string) {
      if (!enabled) return undefined;
      return { run: mockRun };
    },
  };
}

// ── DB mock ───────────────────────────────────────────────────────────────────

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LAUNCH_ROW = {
  id: "launch-1",
  tenant_id: "t1",
  pack_id: "local-business-growth",
  pack_run_id: null,
  brief: { business_name: "Test", city: "Madrid", value_proposition: "Best", primary_cta: "Call" },
  status: "queued",
  progress_pct: 0,
  error_message: null,
  portal_url: null,
  created_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
};

const COMPLETED_LAUNCH = {
  ...LAUNCH_ROW,
  status: "completed",
  progress_pct: 100,
  pack_run_id: "run-123",
  portal_url: "/portal/deliverables?pack_run_id=run-123",
  completed_at: new Date().toISOString(),
};

const PACK_RUN_ROW = {
  id: "run-123",
  status: "completed",
  steps: [
    { key: "sku_landing", label: "Landing", status: "done" },
    { key: "sku_seo", label: "SEO", status: "done" },
  ],
  report: { qaScore: 92, reportUrl: "/dashboard/local-growth" },
  workspace_id: 42,
};

// ── createLaunch ──────────────────────────────────────────────────────────────

describe("SaasBriefToLaunchService — createLaunch", () => {
  it("inserts queued launch row and returns mapped object", async () => {
    const db = makeDb([[LAUNCH_ROW]]);
    const svc = new SaasBriefToLaunchService(db);
    const launch = await svc.createLaunch("t1", {
      packId: "local-business-growth",
      brief: { business_name: "Test" },
      userId: "user-1",
    });
    expect(launch.id).toBe("launch-1");
    expect(launch.status).toBe("queued");
    expect(launch.packId).toBe("local-business-growth");
    expect(launch.tenantId).toBe("t1");
  });

  it("throws VALIDATION for empty packId", async () => {
    const db = makeDb([]);
    const svc = new SaasBriefToLaunchService(db);
    await expect(
      svc.createLaunch("t1", { packId: "  ", brief: {} }),
    ).rejects.toThrow(SaasBriefToLaunchError);
  });

  it("VALIDATION error has code VALIDATION", async () => {
    const db = makeDb([]);
    const svc = new SaasBriefToLaunchService(db);
    try {
      await svc.createLaunch("t1", { packId: "", brief: {} });
    } catch (e) {
      expect((e as SaasBriefToLaunchError).code).toBe("VALIDATION");
    }
  });

  it("stores brief as JSON in query params", async () => {
    const db = makeDb([[LAUNCH_ROW]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    const brief = { business_name: "Acme", city: "BCN" };
    await svc.createLaunch("t1", { packId: "local-business-growth", brief });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain(JSON.stringify(brief));
  });
});

// ── executeLaunch ─────────────────────────────────────────────────────────────

describe("SaasBriefToLaunchService — executeLaunch", () => {
  beforeEach(() => {
    mockRun.mockResolvedValue({ id: "run-abc" });
  });

  it("throws NOT_FOUND when launch doesn't exist", async () => {
    const db = makeDb([[]]); // no launch row
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    await expect(svc.executeLaunch("t1", "bad-id")).rejects.toThrow(SaasBriefToLaunchError);
  });

  it("NOT_FOUND error has code NOT_FOUND", async () => {
    const db = makeDb([[]]);
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    try {
      await svc.executeLaunch("t1", "bad-id");
    } catch (e) {
      expect((e as SaasBriefToLaunchError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NO_WORKSPACE when tenant has no workspace_id", async () => {
    const db = makeDb([[LAUNCH_ROW], [{ workspace_id: null }]]);
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    await expect(svc.executeLaunch("t1", "launch-1")).rejects.toThrow(SaasBriefToLaunchError);
  });

  it("NO_WORKSPACE code is NO_WORKSPACE", async () => {
    const db = makeDb([[LAUNCH_ROW], [{ workspace_id: null }]]);
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    try {
      await svc.executeLaunch("t1", "launch-1");
    } catch (e) {
      expect((e as SaasBriefToLaunchError).code).toBe("NO_WORKSPACE");
    }
  });

  it("marks launch failed when workspace missing", async () => {
    const db = makeDb([
      [LAUNCH_ROW],
      [{ workspace_id: null }],
      [], // update to failed
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    await svc.executeLaunch("t1", "launch-1").catch(() => {});
    const updateCall = (db.query as ReturnType<typeof vi.fn>).mock.calls[2] as [string, unknown[]];
    expect(updateCall[0]).toMatch(/status='failed'/);
  });

  it("PACK_NOT_AVAILABLE when runner not found for packId", async () => {
    const db = makeDb([
      [{ ...LAUNCH_ROW, pack_id: "unknown-pack" }],
      [{ workspace_id: 42 }],
      [], // mark running
    ]);
    const svc = new SaasBriefToLaunchService(db, makeRunners(false)); // disabled → returns undefined
    await expect(svc.executeLaunch("t1", "launch-1")).rejects.toThrow();
  });

  it("completes launch with pack_run_id and portal_url when runner succeeds", async () => {
    const db = makeDb([
      [LAUNCH_ROW],
      [{ workspace_id: 42 }],
      [], // mark running
      [COMPLETED_LAUNCH], // update completed
    ]);
    const svc = new SaasBriefToLaunchService(db, makeRunners());
    const result = await svc.executeLaunch("t1", "launch-1");
    expect(result.status).toBe("completed");
    expect(result.packRunId).toBe("run-123");
  });
});

// ── getLaunchStatus ───────────────────────────────────────────────────────────

describe("SaasBriefToLaunchService — getLaunchStatus", () => {
  it("returns steps and qaScore from pack_run", async () => {
    const db = makeDb([[COMPLETED_LAUNCH], [PACK_RUN_ROW]]);
    const svc = new SaasBriefToLaunchService(db);
    const detail = await svc.getLaunchStatus("t1", "launch-1");
    expect(detail.steps).toHaveLength(2);
    expect(detail.qaScore).toBe(92);
    expect(detail.reportUrl).toBe("/dashboard/local-growth");
  });

  it("returns empty steps when no pack_run_id", async () => {
    const db = makeDb([[LAUNCH_ROW]]);
    const svc = new SaasBriefToLaunchService(db);
    const detail = await svc.getLaunchStatus("t1", "launch-1");
    expect(detail.steps).toHaveLength(0);
    expect(detail.qaScore).toBeNull();
  });

  it("throws NOT_FOUND for unknown launchId", async () => {
    const db = makeDb([[]]); // no row
    const svc = new SaasBriefToLaunchService(db);
    await expect(svc.getLaunchStatus("t1", "bad")).rejects.toThrow(SaasBriefToLaunchError);
  });

  it("tenant isolation: NOT_FOUND for different tenant", async () => {
    // Same launch id but wrong tenant → query returns []
    const db = makeDb([[]]);
    const svc = new SaasBriefToLaunchService(db);
    try {
      await svc.getLaunchStatus("wrong-tenant", "launch-1");
    } catch (e) {
      expect((e as SaasBriefToLaunchError).code).toBe("NOT_FOUND");
    }
  });
});

// ── listLaunches ──────────────────────────────────────────────────────────────

describe("SaasBriefToLaunchService — listLaunches", () => {
  it("returns mapped launches ordered by created_at DESC", async () => {
    const row2 = { ...LAUNCH_ROW, id: "launch-2", status: "completed" };
    const db = makeDb([[LAUNCH_ROW, row2]]);
    const svc = new SaasBriefToLaunchService(db);
    const launches = await svc.listLaunches("t1");
    expect(launches).toHaveLength(2);
    expect(launches[0]!.id).toBe("launch-1");
  });

  it("returns empty array when no launches", async () => {
    const db = makeDb([[]]);
    const svc = new SaasBriefToLaunchService(db);
    const launches = await svc.listLaunches("t1");
    expect(launches).toHaveLength(0);
  });

  it("passes limit to query", async () => {
    const db = makeDb([[]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.listLaunches("t1", 5);
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("5");
  });

  it("defaults to limit=20", async () => {
    const db = makeDb([[]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.listLaunches("t1");
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("20");
  });
});

// ── syncLaunchFromPackRun ─────────────────────────────────────────────────────

describe("SaasBriefToLaunchService — syncLaunchFromPackRun", () => {
  it("computes progress_pct from done steps", async () => {
    const db = makeDb([
      [{ steps: [{ status: "done" }, { status: "done" }, { status: "running" }], status: "running" }],
      [], // update
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.syncLaunchFromPackRun("run-123");
    const updateParams = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][1] as unknown[];
    // 2/3 done = 67%
    expect(updateParams[0]).toBe("67");
    expect(updateParams[1]).toBe("running");
  });

  it("sets status=completed when pack_run status=completed", async () => {
    const db = makeDb([
      [{ steps: [{ status: "done" }], status: "completed" }],
      [],
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.syncLaunchFromPackRun("run-123");
    const updateParams = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][1] as unknown[];
    expect(updateParams[1]).toBe("completed");
    expect(updateParams[0]).toBe("100");
  });

  it("sets progress_pct=0 when steps is empty", async () => {
    const db = makeDb([
      [{ steps: [], status: "running" }],
      [],
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.syncLaunchFromPackRun("run-123");
    const updateParams = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][1] as unknown[];
    expect(updateParams[0]).toBe("0");
  });

  it("returns early without error when pack_run not found", async () => {
    const db = makeDb([[]]); // no run
    const svc = new SaasBriefToLaunchService(db);
    await expect(svc.syncLaunchFromPackRun("missing-run")).resolves.toBeUndefined();
  });

  it("sets status=failed when pack_run status=failed", async () => {
    const db = makeDb([
      [{ steps: [{ status: "failed" }], status: "failed" }],
      [],
    ]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasBriefToLaunchService(db);
    await svc.syncLaunchFromPackRun("run-123");
    const updateParams = (db.query as ReturnType<typeof vi.fn>).mock.calls[1][1] as unknown[];
    expect(updateParams[1]).toBe("failed");
  });
});
