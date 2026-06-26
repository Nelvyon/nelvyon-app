/**
 * S53 — SaasDataPlaybooksService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasDataPlaybooksService,
  SaasDataPlaybooksError,
  type TenantDataContext,
} from "../SaasDataPlaybooksService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

function baseCtx(over: Partial<TenantDataContext> = {}): TenantDataContext {
  return {
    companyName: "Pizzería Napoli",
    industry: "restaurants",
    sectorKey: "restaurants",
    openRate: 0.3,
    ctr: 0.04,
    roas: 3.5,
    qaScore: 90,
    launchesUsed: 2,
    benchmarkOverall: 80,
    sectorAvgOpen: 0.2,
    autopilotEnabled: true,
    compliancePending: 0,
    topPackId: "local-business-growth",
    ...over,
  };
}

// ── interpolate ─────────────────────────────────────────────────────────────────

describe("SaasDataPlaybooksService — interpolate", () => {
  it("replaces known tokens with real values", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const out = svc.interpolate("{{company_name}} abre {{open_rate}} vs {{sector_avg_open}}", baseCtx());
    expect(out).toBe("Pizzería Napoli abre 30.0% vs 20.0%");
  });

  it("formats roas with x suffix and handles null", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    expect(svc.interpolate("{{roas}}", baseCtx({ roas: 2.1 }))).toBe("2.10x");
    expect(svc.interpolate("{{roas}}", baseCtx({ roas: null }))).toBe("sin datos");
  });

  it("maps pack_name from topPackId", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    expect(svc.interpolate("{{pack_name}}", baseCtx())).toBe("Crecimiento Local");
  });

  it("leaves unknown tokens intact", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    expect(svc.interpolate("{{nope}}", baseCtx())).toBe("{{nope}}");
  });
});

// ── generateFromContext ─────────────────────────────────────────────────────────

describe("SaasDataPlaybooksService — generateFromContext", () => {
  it("healthy tenant generates no playbooks", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx());
    expect(pbs).toHaveLength(0);
  });

  it("low open rate → email playbook with real numbers", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ openRate: 0.1, sectorAvgOpen: 0.2 }));
    const email = pbs.find((p) => p.slug === "improve-email-open-rate")!;
    expect(email).toBeDefined();
    expect(email.category).toBe("email");
    expect(email.triggerReason).toContain("10.0%");
    expect(email.steps.length).toBeGreaterThan(0);
  });

  it("null roas → ads attribution playbook", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ roas: null }));
    expect(pbs.find((p) => p.slug === "fix-ads-attribution")).toBeDefined();
  });

  it("roas below 1 → ads playbook", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ roas: 0.7 }));
    expect(pbs.find((p) => p.slug === "fix-ads-attribution")).toBeDefined();
  });

  it("no launches → launch-growth-pack with packId", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ launchesUsed: 0, qaScore: null, topPackId: null }));
    const launch = pbs.find((p) => p.slug === "launch-growth-pack")!;
    expect(launch).toBeDefined();
    expect(launch.packId).toBe("local-business-growth");
    expect(launch.steps.some((s) => s.stepType === "launch_pack")).toBe(true);
  });

  it("low qa score → launch playbook (quality variant)", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ qaScore: 70 }));
    expect(pbs.find((p) => p.slug === "launch-growth-pack")?.title).toContain("calidad");
  });

  it("low benchmark → close-sector-gaps", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ benchmarkOverall: 30 }));
    expect(pbs.find((p) => p.slug === "close-sector-gaps")).toBeDefined();
  });

  it("compliance pending → compliance playbook", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ compliancePending: 3 }));
    const c = pbs.find((p) => p.slug === "complete-compliance-vault")!;
    expect(c).toBeDefined();
    expect(c.triggerReason).toContain("3");
  });

  it("autopilot off → enable-autopilot playbook", () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const pbs = svc.generateFromContext("t1", baseCtx({ autopilotEnabled: false }));
    const a = pbs.find((p) => p.slug === "enable-autopilot")!;
    expect(a).toBeDefined();
    expect(a.steps[0]!.stepType).toBe("enable_autopilot");
  });
});

// ── buildTenantContext ──────────────────────────────────────────────────────────

describe("SaasDataPlaybooksService — buildTenantContext", () => {
  it("aggregates company, email and qa metrics", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ company_name: "Acme", industry: "ecommerce" }];
      if (sql.includes("FROM saas_campanias")) return [{ sent: "1000", opened: "250", clicked: "40" }];
      if (sql.includes("FROM saas_deliverable_revenue")) return [{ avg_roas: "2.5" }];
      if (sql.includes("FROM saas_pack_launches")) return [{ avg_qa: "88", launches: "3", top_pack: "ecommerce-growth" }];
      if (sql.includes("FROM saas_benchmark_snapshots")) return [{ summary: { overallScore: 60 }, industry_metrics: { email_open_rate: 0.15 } }];
      if (sql.includes("FROM saas_autopilot_settings")) return [{ enabled: true }];
      if (sql.includes("FROM saas_compliance_vault")) return [{ pending: "2" }];
      return [];
    });
    const svc = new SaasDataPlaybooksService(db);
    const ctx = await svc.buildTenantContext("t1");
    expect(ctx.companyName).toBe("Acme");
    expect(ctx.sectorKey).toBe("ecommerce");
    expect(ctx.openRate).toBeCloseTo(0.25, 4);
    expect(ctx.roas).toBeCloseTo(2.5, 2);
    expect(ctx.qaScore).toBeCloseTo(88, 0);
    expect(ctx.launchesUsed).toBe(3);
    expect(ctx.benchmarkOverall).toBe(60);
    expect(ctx.sectorAvgOpen).toBeCloseTo(0.15, 4);
    expect(ctx.autopilotEnabled).toBe(true);
    expect(ctx.compliancePending).toBe(2);
  });

  it("returns safe defaults when all queries fail/empty", async () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    const ctx = await svc.buildTenantContext("t1");
    expect(ctx.openRate).toBeNull();
    expect(ctx.roas).toBeNull();
    expect(ctx.launchesUsed).toBe(0);
    expect(ctx.autopilotEnabled).toBe(false);
  });
});

// ── upsertGeneratedPlaybooks ────────────────────────────────────────────────────

describe("SaasDataPlaybooksService — upsertGeneratedPlaybooks", () => {
  const gen = [{
    slug: "enable-autopilot", title: "Activa Autopilot", triggerReason: "off",
    category: "growth" as const, priority: 55, renderedSummary: "...", packId: null, ctaHref: "/saas/autopilot",
    steps: [{ stepType: "enable_autopilot" as const, title: "Enciende", body: "..." }],
  }];

  it("inserts playbook + steps", async () => {
    const inserts: string[] = [];
    const db = makeDb((sql) => {
      inserts.push(sql);
      if (sql.includes("SELECT id, status FROM saas_data_playbooks")) return [];
      if (sql.includes("INSERT INTO saas_data_playbooks")) return [{ id: "pb-1", tenant_id: "t1", slug: "enable-autopilot", title: "Activa Autopilot", trigger_reason: "off", category: "growth", priority: 55, status: "suggested", context_snapshot: {}, rendered_summary: "...", pack_id: null, cta_href: "/saas/autopilot", created_at: "", updated_at: "", activated_at: null, completed_at: null }];
      return [];
    });
    const svc = new SaasDataPlaybooksService(db);
    const saved = await svc.upsertGeneratedPlaybooks("t1", gen, baseCtx());
    expect(saved).toHaveLength(1);
    expect(inserts.some((s) => s.includes("INSERT INTO saas_data_playbook_steps"))).toBe(true);
  });

  it("skips slug already dismissed", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT id, status FROM saas_data_playbooks")) return [{ id: "pb-x", status: "dismissed" }];
      return [];
    });
    const svc = new SaasDataPlaybooksService(db);
    const saved = await svc.upsertGeneratedPlaybooks("t1", gen, baseCtx());
    expect(saved).toHaveLength(0);
  });
});

// ── lifecycle ───────────────────────────────────────────────────────────────────

describe("SaasDataPlaybooksService — lifecycle", () => {
  function row(over: Record<string, unknown> = {}) {
    return {
      id: "pb-1", tenant_id: "t1", slug: "s", title: "t", trigger_reason: "r",
      category: "growth", priority: 50, status: "suggested", context_snapshot: {},
      rendered_summary: null, pack_id: null, cta_href: null,
      created_at: "", updated_at: "", activated_at: null, completed_at: null, ...over,
    };
  }

  it("activatePlaybook sets status active", async () => {
    const db = makeDb(() => [row({ status: "active" })]);
    const svc = new SaasDataPlaybooksService(db);
    expect((await svc.activatePlaybook("t1", "pb-1")).status).toBe("active");
  });

  it("activatePlaybook throws NOT_FOUND when no row", async () => {
    const svc = new SaasDataPlaybooksService(NO_DATA);
    await expect(svc.activatePlaybook("t1", "x")).rejects.toThrow(SaasDataPlaybooksError);
  });

  it("dismissPlaybook sets status dismissed", async () => {
    const db = makeDb(() => [row({ status: "dismissed" })]);
    const svc = new SaasDataPlaybooksService(db);
    expect((await svc.dismissPlaybook("t1", "pb-1")).status).toBe("dismissed");
  });

  it("completeStep marks step completed", async () => {
    const db = makeDb(() => [{ id: "st-1", playbook_id: "pb-1", sort_order: 0, step_type: "action", title: "x", body: "y", metadata: {}, completed: true }]);
    const svc = new SaasDataPlaybooksService(db);
    expect((await svc.completeStep("t1", "pb-1", "st-1")).completed).toBe(true);
  });

  it("completePlaybook sets status completed", async () => {
    const db = makeDb(() => [row({ status: "completed" })]);
    const svc = new SaasDataPlaybooksService(db);
    expect((await svc.completePlaybook("t1", "pb-1")).status).toBe("completed");
  });

  it("getPlaybook returns playbook + steps", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_data_playbook_steps")) return [{ id: "st-1", playbook_id: "pb-1", sort_order: 0, step_type: "insight", title: "x", body: "y", metadata: {}, completed: false }];
      if (sql.includes("FROM saas_data_playbooks")) return [row()];
      return [];
    });
    const svc = new SaasDataPlaybooksService(db);
    const pb = await svc.getPlaybook("t1", "pb-1");
    expect(pb.steps).toHaveLength(1);
  });

  it("getSummary aggregates counts by status", async () => {
    const db = makeDb(() => [
      { status: "suggested", count: "4" },
      { status: "active", count: "1" },
      { status: "completed", count: "2" },
    ]);
    const svc = new SaasDataPlaybooksService(db);
    const s = await svc.getSummary("t1");
    expect(s.suggested).toBe(4);
    expect(s.active).toBe(1);
    expect(s.completed).toBe(2);
  });
});
