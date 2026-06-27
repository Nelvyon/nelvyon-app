/**
 * O25 — OsRetainerAutopilotService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsRetainerAutopilotService,
  OsRetainerError,
  expectedServicesFromSettings,
  computeCycleStatus,
  type RetainerAutopilotPort,
  type RetainerRecurringLogPort,
  type RetainerDeliverablesPort,
  type RetainerService,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

function cycleRow(over: Record<string, unknown> = {}) {
  return {
    id: "cyc-1", tenant_id: "11111111-1111-1111-1111-111111111111", workspace_id: 1, period_key: "2026-06",
    status: "verified", services_expected: ["seo", "social"], services_delivered: ["seo", "social"],
    deliverable_ids: ["d1"], recurring_run_ids: ["d1"], certificate_ids: [], portal_visible: true,
    verified_at: "2026-06-30T00:00:00Z", metadata: {}, ...over,
  };
}

function autopilotPort(over: Partial<RetainerAutopilotPort> = {}): RetainerAutopilotPort {
  return {
    getSettings: async (t) => ({ tenantId: t, seoEnabled: true, socialEnabled: true, reputationEnabled: false, adsEnabled: false }),
    listEligibleTenants: async () => ["t1", "t2"],
    ...over,
  };
}
function recurringPort(runs: Array<{ serviceType: RetainerService; status: string; deliverableId: string | null }>): RetainerRecurringLogPort {
  return { listRuns: async () => runs };
}
function deliverablesPort(items: Array<{ id: string; serviceType: string }> = []): RetainerDeliverablesPort {
  return { listByTenantPeriod: async () => items };
}

function svc(db: SaasPostgresPort, ap = autopilotPort(), rec = recurringPort([]), del = deliverablesPort()) {
  return new OsRetainerAutopilotService(db, ap, rec, del);
}

// ── pure helpers ─────────────────────────────────────────────────────────────────

describe("O25 — helpers", () => {
  it("periodKey YYYY-MM UTC", () => {
    expect(svc(makeDb(() => [])).periodKey(new Date(Date.UTC(2026, 5, 9)))).toBe("2026-06");
  });

  it("expectedServicesFromSettings returns only enabled", () => {
    expect(expectedServicesFromSettings({ tenantId: "t", seoEnabled: true, socialEnabled: true, reputationEnabled: false, adsEnabled: false })).toEqual(["seo", "social"]);
  });

  it("expectedServicesFromSettings null → []", () => {
    expect(expectedServicesFromSettings(null)).toEqual([]);
  });

  it("computeCycleStatus all delivered → verified", () => {
    const r = computeCycleStatus(["seo", "social"], [
      { serviceType: "seo", status: "completed", deliverableId: "a" },
      { serviceType: "social", status: "completed", deliverableId: "b" },
    ]);
    expect(r.status).toBe("verified");
    expect(r.delivered).toEqual(["seo", "social"]);
  });

  it("computeCycleStatus one missing → partial", () => {
    const r = computeCycleStatus(["seo", "social"], [{ serviceType: "seo", status: "completed", deliverableId: "a" }]);
    expect(r.status).toBe("partial");
  });

  it("computeCycleStatus failed run, none completed → failed", () => {
    const r = computeCycleStatus(["seo"], [{ serviceType: "seo", status: "failed", deliverableId: null }]);
    expect(r.status).toBe("failed");
  });

  it("computeCycleStatus no expected → open", () => {
    expect(computeCycleStatus([], []).status).toBe("open");
  });
});

// ── syncCycle ────────────────────────────────────────────────────────────────────

describe("O25 — syncCycle", () => {
  function syncDb(extra?: (sql: string, params: unknown[]) => unknown[] | null) {
    return makeDb((sql, params) => {
      const e = extra?.(sql, params);
      if (e) return e;
      if (sql.includes("INSERT INTO os_retainer_cycles")) {
        const p = params as unknown[];
        return [cycleRow({ status: p[2], services_expected: JSON.parse(p[3] as string), services_delivered: JSON.parse(p[4] as string), deliverable_ids: JSON.parse(p[5] as string), verified_at: p[7] })];
      }
      return [];
    });
  }

  it("verified when all expected delivered + links deliverables", async () => {
    const s = svc(
      syncDb(),
      autopilotPort(),
      recurringPort([{ serviceType: "seo", status: "completed", deliverableId: "d1" }, { serviceType: "social", status: "completed", deliverableId: "d2" }]),
      deliverablesPort([{ id: "del-1", serviceType: "seo_report" }]),
    );
    const cycle = await s.syncCycle("11111111-1111-1111-1111-111111111111", "2026-06");
    expect(cycle.status).toBe("verified");
    expect(cycle.deliverableIds).toContain("del-1");
    expect(cycle.verifiedAt).not.toBeNull();
  });

  it("partial when one service missing", async () => {
    const s = svc(
      syncDb(),
      autopilotPort(),
      recurringPort([{ serviceType: "seo", status: "completed", deliverableId: "d1" }]),
    );
    const cycle = await s.syncCycle("11111111-1111-1111-1111-111111111111", "2026-06");
    expect(cycle.status).toBe("partial");
  });

  it("uses ON CONFLICT (idempotent)", async () => {
    const sqls: string[] = [];
    const s = svc(syncDb((sql) => { sqls.push(sql); return null; }));
    await s.syncCycle("11111111-1111-1111-1111-111111111111", "2026-06");
    expect(sqls.some((x) => x.includes("ON CONFLICT (tenant_id, period_key)"))).toBe(true);
  });
});

// ── syncAllEligibleTenants ───────────────────────────────────────────────────────

describe("O25 — syncAllEligibleTenants", () => {
  it("syncs each eligible tenant", async () => {
    let count = 0;
    const db = makeDb((sql) => { if (sql.includes("INSERT INTO os_retainer_cycles")) { count++; return [cycleRow()]; } return []; });
    const s = svc(db, autopilotPort({ listEligibleTenants: async () => ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"] }));
    const r = await s.syncAllEligibleTenants("2026-06");
    expect(r.synced).toBe(2);
    expect(count).toBe(2);
  });

  it("returns 0 when no eligible tenants", async () => {
    const s = svc(makeDb(() => []), autopilotPort({ listEligibleTenants: async () => [] }));
    expect((await s.syncAllEligibleTenants()).synced).toBe(0);
  });
});

// ── getCycle / listCycles / getSummary ───────────────────────────────────────────

describe("O25 — queries", () => {
  it("getCycle returns mapped cycle", async () => {
    const db = makeDb(() => [cycleRow()]);
    const c = await svc(db).getCycle("11111111-1111-1111-1111-111111111111", "2026-06");
    expect(c.status).toBe("verified");
    expect(c.portalVisible).toBe(true);
  });

  it("getCycle throws NOT_FOUND when absent", async () => {
    await expect(svc(makeDb(() => [])).getCycle("t", "2026-06")).rejects.toThrow(OsRetainerError);
  });

  it("getSummary aggregates by status", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("GROUP BY status")) return [{ status: "verified", count: "5" }, { status: "partial", count: "2" }];
      if (sql.includes("COUNT(DISTINCT tenant_id)")) return [{ c: "6" }];
      if (sql.includes("ORDER BY period_key DESC LIMIT 1")) return [{ period_key: "2026-06" }];
      return [];
    });
    const s = await svc(db).getSummary();
    expect(s.verified).toBe(5);
    expect(s.partial).toBe(2);
    expect(s.tenantsTracked).toBe(6);
    expect(s.lastPeriod).toBe("2026-06");
  });
});

// ── getPortalRetainerView ────────────────────────────────────────────────────────

describe("O25 — getPortalRetainerView", () => {
  it("builds service checklist for active retainer", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_retainer_cycles WHERE tenant_id")) return [cycleRow()];
      if (sql.includes("SELECT * FROM os_retainer_cycles")) return [cycleRow(), cycleRow({ period_key: "2026-05" })];
      return [];
    });
    const s = svc(db, autopilotPort(), recurringPort([
      { serviceType: "seo", status: "completed", deliverableId: "d1" },
      { serviceType: "social", status: "pending", deliverableId: null },
    ]));
    const view = await s.getPortalRetainerView("11111111-1111-1111-1111-111111111111");
    expect(view.active).toBe(true);
    expect(view.services).toHaveLength(2);
    expect(view.services.find((x) => x.type === "seo")?.status).toBe("delivered");
    expect(view.services.find((x) => x.type === "social")?.status).toBe("pending");
  });

  it("inactive when no services enabled", async () => {
    const s = svc(makeDb(() => []), autopilotPort({ getSettings: async (t) => ({ tenantId: t, seoEnabled: false, socialEnabled: false, reputationEnabled: false, adsEnabled: false }) }));
    const view = await s.getPortalRetainerView("t1");
    expect(view.active).toBe(false);
    expect(view.services).toEqual([]);
  });

  it("getPortalRetainerViewByWorkspace resolves tenant", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants WHERE workspace_id")) return [{ id: "11111111-1111-1111-1111-111111111111" }];
      if (sql.includes("SELECT * FROM os_retainer_cycles WHERE tenant_id")) return [cycleRow()];
      if (sql.includes("SELECT * FROM os_retainer_cycles")) return [cycleRow()];
      return [];
    });
    const s = svc(db, autopilotPort(), recurringPort([{ serviceType: "seo", status: "completed", deliverableId: "d1" }, { serviceType: "social", status: "completed", deliverableId: "d2" }]));
    const view = await s.getPortalRetainerViewByWorkspace(42);
    expect(view.active).toBe(true);
  });

  it("getPortalRetainerViewByWorkspace → inactive when no tenant", async () => {
    const s = svc(makeDb(() => []));
    const view = await s.getPortalRetainerViewByWorkspace(999);
    expect(view.active).toBe(false);
  });
});
