import { describe, expect, it } from "vitest";

import { SaasBillingSyncService } from "../SaasBillingSyncService";
import type { SaasTenantRow } from "../saasTenantMapper";

type SubscriptionRow = { plan_id: string; status: string; workspace_id?: number; user_id?: string };

function tenantRow(overrides: Partial<SaasTenantRow> & Pick<SaasTenantRow, "id" | "user_id">): SaasTenantRow {
  return {
    workspace_id: 10,
    company_name: "Acme",
    industry: "SaaS",
    plan: "starter",
    website: null,
    phone: null,
    employees: null,
    goals: [],
    onboarding_completed: true,
    onboarding_step: 4,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeBillingSyncDb(opts?: {
  tenant?: SaasTenantRow | null;
  subscription?: SubscriptionRow | null;
  legacySubscription?: SubscriptionRow | null;
}) {
  const tenant =
    opts?.tenant === null
      ? null
      : (opts?.tenant ?? tenantRow({ id: "t-1", user_id: "u-1", workspace_id: 10, plan: "starter" }));
  let tenantPlan = tenant?.plan ?? "starter";
  const subscription = opts?.subscription ?? null;
  const legacySubscription = opts?.legacySubscription ?? null;
  const updateCalls: unknown[][] = [];

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();

    if (s.includes("FROM saas_tenants") && s.includes("WHERE workspace_id = $1") && s.includes(SAAS_TENANT_MARKER)) {
      return tenant && tenant.workspace_id === Number(params[0]) ? ([tenant] as T[]) : ([] as T[]);
    }
    if (s.includes("FROM saas_tenants") && s.includes("WHERE user_id = $1")) {
      return tenant && tenant.user_id === String(params[0]) ? ([tenant] as T[]) : ([] as T[]);
    }
    if (s.includes("FROM subscriptions") && s.includes("WHERE workspace_id = $1")) {
      return subscription && subscription.workspace_id === Number(params[0])
        ? ([{ plan_id: subscription.plan_id, status: subscription.status }] as T[])
        : subscription && subscription.workspace_id === undefined
          ? ([{ plan_id: subscription.plan_id, status: subscription.status }] as T[])
          : ([] as T[]);
    }
    if (s.includes("FROM subscriptions") && s.includes("WHERE user_id::text = $1")) {
      return legacySubscription
        ? ([{ plan_id: legacySubscription.plan_id, status: legacySubscription.status }] as T[])
        : ([] as T[]);
    }
    if (s.startsWith("UPDATE saas_tenants")) {
      updateCalls.push(params);
      tenantPlan = String(params[0]);
      if (tenant) tenant.plan = tenantPlan;
      return tenant ? ([{ id: tenant.id, plan: tenantPlan }] as T[]) : ([] as T[]);
    }
    if (s.includes("FROM saas_tenants") && s.includes("WHERE workspace_id IS NOT NULL")) {
      return tenant?.workspace_id
        ? ([{ id: tenant.id, user_id: tenant.user_id, workspace_id: tenant.workspace_id, plan: tenant.plan }] as T[])
        : ([] as T[]);
    }
    return [] as T[];
  }

  return { query, tenant, updateCalls, getPlan: () => tenantPlan };
}

const SAAS_TENANT_MARKER = "onboarding_completed";

describe("SaasBillingSyncService", () => {
  it("syncs pro from active subscription (apply)", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10, "apply");
    expect(result.synced).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.targetPlan).toBe("pro");
    expect(db.getPlan()).toBe("pro");
    expect(db.updateCalls).toHaveLength(1);
  });

  it("maps agency to enterprise", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "agency", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10, "apply");
    expect(result.targetPlan).toBe("enterprise");
    expect(db.getPlan()).toBe("enterprise");
  });

  it("skips canceled subscription without updating plan", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "canceled", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10, "apply");
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("STATUS_NOT_SYNCABLE");
    expect(db.updateCalls).toHaveLength(0);
    expect(db.getPlan()).toBe("starter");
  });

  it("skips when no tenant for workspace", async () => {
    const db = makeBillingSyncDb({ tenant: null });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(99, "apply");
    expect(result.skipReason).toBe("NO_TENANT");
    expect(db.updateCalls).toHaveLength(0);
  });

  it("skips when no subscription", async () => {
    const db = makeBillingSyncDb({ subscription: null });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10, "apply");
    expect(result.skipReason).toBe("NO_SUBSCRIPTION");
    expect(db.updateCalls).toHaveLength(0);
  });

  it("skips when plan already matches", async () => {
    const db = makeBillingSyncDb({
      tenant: tenantRow({ id: "t-1", user_id: "u-1", workspace_id: 10, plan: "pro" }),
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10, "apply");
    expect(result.skipReason).toBe("PLAN_UNCHANGED");
    expect(db.updateCalls).toHaveLength(0);
  });

  it("dry-run reports synced without UPDATE", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10);
    expect(result.mode).toBe("dry-run");
    expect(result.synced).toBe(true);
    expect(result.targetPlan).toBe("pro");
    expect(db.updateCalls).toHaveLength(0);
    expect(db.getPlan()).toBe("starter");
  });

  it("syncFromSubscriptionHint uses override without subscription row", async () => {
    const db = makeBillingSyncDb({ subscription: null });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromSubscriptionHint(
      { workspaceId: 10, planId: "pro", status: "active" },
      "apply",
    );
    expect(result.synced).toBe(true);
    expect(result.targetPlan).toBe("pro");
    expect(db.getPlan()).toBe("pro");
  });

  it("syncFromUserId uses legacy subscription when tenant has no workspace", async () => {
    const db = makeBillingSyncDb({
      tenant: tenantRow({ id: "t-2", user_id: "u-2", workspace_id: null, plan: "starter" }),
      legacySubscription: { plan_id: "pro", status: "active" },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromUserId("u-2", "apply");
    expect(result.synced).toBe(true);
    expect(result.targetPlan).toBe("pro");
  });

  it("runBatch dry-run scans tenants", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const report = await svc.runBatch("dry-run");
    expect(report.scanned).toBe(1);
    expect(report.synced).toBe(1);
    expect(report.skipped).toBe(0);
    expect(db.updateCalls).toHaveLength(0);
  });

  it("runBatch apply syncs one tenant", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const report = await svc.runBatch("apply");
    expect(report.synced).toBe(1);
    expect(db.getPlan()).toBe("pro");
  });

  it("defaults to dry-run mode", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const result = await svc.syncFromWorkspaceId(10);
    expect(result.mode).toBe("dry-run");
    expect(db.updateCalls).toHaveLength(0);
  });

  it("runBackfill scoped dry-run defaults without UPDATE", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const report = await svc.runBackfill("dry-run", { workspaceId: 10 });
    expect(report.scanned).toBe(1);
    expect(report.synced).toBe(1);
    expect(report.bySkipReason?.PLAN_UNCHANGED).toBe(0);
    expect(db.updateCalls).toHaveLength(0);
  });

  it("runBackfill global includes bySkipReason", async () => {
    const db = makeBillingSyncDb({
      tenant: tenantRow({ id: "t-1", user_id: "u-1", workspace_id: 10, plan: "pro" }),
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const report = await svc.runBackfill();
    expect(report.scanned).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.bySkipReason?.PLAN_UNCHANGED).toBe(1);
  });

  it("runBackfill defaults to dry-run mode", async () => {
    const db = makeBillingSyncDb({
      subscription: { plan_id: "pro", status: "active", workspace_id: 10 },
    });
    const svc = new SaasBillingSyncService(db);
    const report = await svc.runBackfill(undefined, { workspaceId: 10 });
    expect(report.mode).toBe("dry-run");
    expect(db.updateCalls).toHaveLength(0);
  });
});
