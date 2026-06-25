/**
 * S36 — Funnel depth tests: A/B variants, analytics v2, public slug, pause, recordEvent
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasFunnelService, SaasFunnelError, resetSaasFunnelServiceForTests } from "../SaasFunnelService";

beforeEach(() => { resetSaasFunnelServiceForTests(); });

// ── Fixtures ─────────────────────────────────────────────────────────────────

const funnelRow = {
  id: "f1", tenant_id: "t1", name: "S36 Funnel", description: null,
  status: "draft", slug: "s36-funnel", public_slug: null, published_at: null,
  steps_count: 2, created_at: new Date(), updated_at: new Date(),
};
const activeFunnelRow = {
  ...funnelRow, id: "f-active", status: "active", public_slug: "s36-funnel-abc123", published_at: new Date(),
};
const stepRow1 = {
  id: "s1", funnel_id: "f1", tenant_id: "t1", step_order: 0,
  type: "landing", name: "Landing", content: "<h1>Hi</h1>",
  cta_label: "Next", cta_url: null, visitors: 100, conversions: 40,
  created_at: new Date(), updated_at: new Date(),
};
const stepRow2 = {
  id: "s2", funnel_id: "f1", tenant_id: "t1", step_order: 1,
  type: "form", name: "Form", content: "<form/>",
  cta_label: "Submit", cta_url: null, visitors: 40, conversions: 15,
  created_at: new Date(), updated_at: new Date(),
};
const variantRowA = {
  id: "v-a", step_id: "s1", variant_key: "A", content: { html: "<h1>A</h1>", ctaLabel: "Get A", ctaUrl: "" },
  weight_pct: 60, visitors: 60, conversions: 20, created_at: new Date(), updated_at: new Date(),
};
const variantRowB = {
  id: "v-b", step_id: "s1", variant_key: "B", content: { html: "<h1>B</h1>", ctaLabel: "Get B", ctaUrl: "" },
  weight_pct: 40, visitors: 40, conversions: 10, created_at: new Date(), updated_at: new Date(),
};

// ── makeDb helper ─────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown[]> = {}) {
  const defaults: Record<string, unknown[]> = {
    funnels: [funnelRow],
    steps: [stepRow1, stepRow2],
    variants: [variantRowA, variantRowB],
    events: [],
  };
  const data = { ...defaults, ...overrides };

  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_funnel_step_variants") && sql.includes("WHERE step_id")) return data.variants;
      if (sql.includes("FROM saas_funnel_step_variants") && sql.includes("ANY")) return data.variants;
      if (sql.includes("INSERT INTO saas_funnel_step_variants")) return [variantRowA];
      if (sql.includes("UPDATE saas_funnel_step_variants")) return [variantRowA];
      if (sql.includes("INSERT INTO saas_funnel_events")) return [{ id: "e1" }];
      if (sql.includes("UPDATE saas_funnel_steps")) return [];
      if (sql.includes("FROM saas_funnels") && sql.includes("public_slug=$1")) return data.funnels;
      if (sql.includes("FROM saas_funnels") && sql.includes("id=$2")) return data.funnels;
      if (sql.includes("FROM saas_funnels")) return data.funnels;
      if (sql.includes("FROM saas_funnel_steps")) return data.steps;
      if (sql.includes("UPDATE saas_funnels")) return [];
      if (sql.includes("INSERT INTO saas_funnels")) return [funnelRow];
      return [];
    }),
  };
}

// ── listVariants ──────────────────────────────────────────────────────────────

describe("SaasFunnelService.listVariants", () => {
  it("returns variants for a step", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const variants = await svc.listVariants("s1");
    expect(variants).toHaveLength(2);
    expect(variants[0].variantKey).toBe("A");
    expect(variants[1].variantKey).toBe("B");
  });

  it("returns empty array when no variants", async () => {
    const db = makeDb({ variants: [] });
    const svc = new SaasFunnelService(db as never);
    const variants = await svc.listVariants("s99");
    expect(variants).toEqual([]);
  });

  it("maps weightPct and visitors correctly", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const [a, b] = await svc.listVariants("s1");
    expect(a!.weightPct).toBe(60);
    expect(b!.weightPct).toBe(40);
    expect(a!.visitors).toBe(60);
    expect(b!.conversions).toBe(10);
  });
});

// ── createVariant ─────────────────────────────────────────────────────────────

describe("SaasFunnelService.createVariant", () => {
  it("creates variant A with defaults", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const v = await svc.createVariant("s1", { variantKey: "A" });
    expect(v.variantKey).toBe("A");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO saas_funnel_step_variants"),
      expect.any(Array),
    );
  });

  it("throws VALIDATION for invalid variantKey", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    // @ts-expect-error — testing invalid input
    await expect(svc.createVariant("s1", { variantKey: "C" })).rejects.toThrow(
      expect.objectContaining({ code: "VALIDATION" }),
    );
  });

  it("throws VALIDATION for weight_pct out of range", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await expect(svc.createVariant("s1", { variantKey: "A", weightPct: 150 })).rejects.toThrow(
      expect.objectContaining({ code: "VALIDATION" }),
    );
  });
});

// ── pickVariant (A/B determinism) ─────────────────────────────────────────────

describe("SaasFunnelService.pickVariant — determinism", () => {
  it("same sessionId always returns same variant", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const r1 = await svc.pickVariant("s1", "session-abc");
    const r2 = await svc.pickVariant("s1", "session-abc");
    expect(r1?.variantKey).toBe(r2?.variantKey);
  });

  it("returns null when no variants exist", async () => {
    const db = makeDb({ variants: [] });
    const svc = new SaasFunnelService(db as never);
    const r = await svc.pickVariant("s1", "any-session");
    expect(r).toBeNull();
  });

  it("respects weight distribution roughly (60/40 smoke test)", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const results: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 100; i++) {
      const v = await svc.pickVariant("s1", `session-${i}`);
      if (v) results[v.variantKey] = (results[v.variantKey] ?? 0) + 1;
    }
    // With 60/40 weights, expect A > B
    expect(results.A).toBeGreaterThan(results.B ?? 0);
  });

  it("only variant A returned when weight 100/0", async () => {
    const db = makeDb({
      variants: [
        { ...variantRowA, weight_pct: 100 },
        { ...variantRowB, weight_pct: 0 },
      ],
    });
    const svc = new SaasFunnelService(db as never);
    for (let i = 0; i < 20; i++) {
      const v = await svc.pickVariant("s1", `sess-${i}`);
      expect(v?.variantKey).toBe("A");
    }
  });
});

// ── recordEvent ───────────────────────────────────────────────────────────────

describe("SaasFunnelService.recordEvent", () => {
  it("inserts a visit event", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await svc.recordEvent("t1", {
      funnelId: "f1", stepId: "s1", eventType: "visit", sessionId: "sess1",
    });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO saas_funnel_events"),
      expect.any(Array),
    );
  });

  it("increments step counters on visit event", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await svc.recordEvent("t1", { funnelId: "f1", stepId: "s1", eventType: "visit" });
    const updateCalls = db.query.mock.calls.filter((c: [string]) =>
      c[0].includes("UPDATE saas_funnel_steps"),
    );
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it("increments step counters on conversion event", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await svc.recordEvent("t1", { funnelId: "f1", stepId: "s1", eventType: "conversion" });
    const updateCalls = db.query.mock.calls.filter((c: [string]) =>
      c[0].includes("UPDATE saas_funnel_steps"),
    );
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it("also updates variant counters when variantKey provided", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await svc.recordEvent("t1", {
      funnelId: "f1", stepId: "s1", variantKey: "A", eventType: "visit",
    });
    const variantUpdate = db.query.mock.calls.filter((c: [string]) =>
      c[0].includes("UPDATE saas_funnel_step_variants"),
    );
    expect(variantUpdate.length).toBeGreaterThan(0);
  });

  it("accepts all valid eventTypes without throwing", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const types: Array<"visit" | "conversion" | "checkout_start" | "checkout_complete"> = [
      "visit", "conversion", "checkout_start", "checkout_complete",
    ];
    for (const eventType of types) {
      await expect(
        svc.recordEvent("t1", { funnelId: "f1", eventType }),
      ).resolves.not.toThrow();
    }
  });
});

// ── publish v2 ────────────────────────────────────────────────────────────────

describe("SaasFunnelService.publish v2", () => {
  it("throws VALIDATION when funnel has no steps", async () => {
    const db = makeDb({ steps: [] });
    const svc = new SaasFunnelService(db as never);
    await expect(svc.publish("t1", "f1")).rejects.toThrow(
      expect.objectContaining({ code: "VALIDATION" }),
    );
  });

  it("generates public_slug when not set", async () => {
    const db = makeDb({ funnels: [{ ...funnelRow, public_slug: null }] });
    const svc = new SaasFunnelService(db as never);
    await svc.publish("t1", "f1");
    const updateCall = db.query.mock.calls.find((c: [string]) =>
      c[0].includes("UPDATE saas_funnels") && c[0].includes("public_slug"),
    );
    expect(updateCall).toBeDefined();
    // The slug value should be non-null in the params
    const slugParam = updateCall![1] as unknown[];
    expect(slugParam.some(p => typeof p === "string" && p.length > 0)).toBe(true);
  });

  it("preserves existing public_slug on re-publish", async () => {
    const db = makeDb({ funnels: [{ ...funnelRow, public_slug: "existing-slug-xyz" }] });
    const svc = new SaasFunnelService(db as never);
    await svc.publish("t1", "f1");
    const updateCall = db.query.mock.calls.find((c: [string]) =>
      c[0].includes("UPDATE saas_funnels") && c[0].includes("public_slug"),
    );
    const params = updateCall![1] as string[];
    expect(params).toContain("existing-slug-xyz");
  });
});

// ── pause ──────────────────────────────────────────────────────────────────────

describe("SaasFunnelService.pause", () => {
  it("throws NOT_FOUND when funnel does not exist", async () => {
    const db = makeDb({ funnels: [] });
    const svc = new SaasFunnelService(db as never);
    await expect(svc.pause("t1", "f-missing")).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("throws VALIDATION when funnel is not active", async () => {
    const db = makeDb({ funnels: [{ ...funnelRow, status: "draft" }] });
    const svc = new SaasFunnelService(db as never);
    await expect(svc.pause("t1", "f1")).rejects.toThrow(
      expect.objectContaining({ code: "VALIDATION" }),
    );
  });

  it("pauses an active funnel", async () => {
    const db = makeDb({ funnels: [{ ...funnelRow, status: "active" }] });
    const svc = new SaasFunnelService(db as never);
    await expect(svc.pause("t1", "f1")).resolves.not.toThrow();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE saas_funnels"),
      expect.arrayContaining(["paused"]),
    );
  });
});

// ── getByPublicSlug ───────────────────────────────────────────────────────────

describe("SaasFunnelService.getByPublicSlug", () => {
  it("returns null for unknown slug", async () => {
    const db = makeDb({ funnels: [] });
    const svc = new SaasFunnelService(db as never);
    const r = await svc.getByPublicSlug("no-such-slug");
    expect(r).toBeNull();
  });

  it("returns funnel with steps for active slug", async () => {
    const db = makeDb({ funnels: [activeFunnelRow] });
    const svc = new SaasFunnelService(db as never);
    const f = await svc.getByPublicSlug("s36-funnel-abc123");
    expect(f).not.toBeNull();
    expect(f!.publicSlug).toBe("s36-funnel-abc123");
    expect(f!.steps).toHaveLength(2);
  });

  it("returns null when DB returns no rows (simulates inactive status filter)", async () => {
    // The service queries WHERE status='active' — DB handles filter, mock returns empty
    const db = makeDb({ funnels: [] });
    const svc = new SaasFunnelService(db as never);
    const r = await svc.getByPublicSlug("paused-funnel-slug");
    expect(r).toBeNull();
  });
});

// ── getAnalytics v2 ───────────────────────────────────────────────────────────

describe("SaasFunnelService.getAnalytics v2", () => {
  it("returns overall CVR based on total steps visitors+conversions", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const a = await svc.getAnalytics("t1", "f1");
    // totalVisitors = sum of all steps: 100+40=140
    expect(a.totalVisitors).toBe(140);
    // totalConversions = 40+15=55; overallCvr = 55/140 ≈ 39.3
    expect(a.overallCvr).toBeGreaterThan(0);
  });

  it("includes per-step CVR", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const a = await svc.getAnalytics("t1", "f1");
    const step1 = a.steps.find(s => s.id === "s1");
    expect(step1).toBeDefined();
    expect(step1!.cvr).toBeCloseTo(40); // 40/100
  });

  it("calculates drop-off on first step (not last)", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const a = await svc.getAnalytics("t1", "f1");
    // step1 (index 0): nextVisitors=40, dropOff=(100-40)/100=60%
    const step1 = a.steps.find(s => s.id === "s1");
    expect(step1!.dropOff).toBeCloseTo(60);
    // step2 is last, no drop-off
    const step2 = a.steps.find(s => s.id === "s2");
    expect(step2!.dropOff).toBe(0);
  });

  it("includes per-variant CVR in steps", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    const a = await svc.getAnalytics("t1", "f1");
    const step1 = a.steps.find(s => s.id === "s1");
    expect(step1!.variants.length).toBeGreaterThan(0);
    const vA = step1!.variants.find(v => v.variantKey === "A");
    expect(vA).toBeDefined();
    expect(vA!.cvr).toBeCloseTo(33.3, 0); // 20/60 ≈ 33.3%
  });

  it("handles funnel with zero visitors gracefully", async () => {
    const db = makeDb({
      steps: [{ ...stepRow1, visitors: 0, conversions: 0 }, { ...stepRow2, visitors: 0, conversions: 0 }],
      variants: [],
    });
    const svc = new SaasFunnelService(db as never);
    const a = await svc.getAnalytics("t1", "f1");
    expect(a.overallCvr).toBe(0);
    expect(a.steps.length).toBeGreaterThan(0);
    expect(a.steps[0]!.cvr).toBe(0);
  });

  it("throws NOT_FOUND for unknown funnel", async () => {
    const db = makeDb({ funnels: [] });
    const svc = new SaasFunnelService(db as never);
    await expect(svc.getAnalytics("t1", "f-missing")).rejects.toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });
});

// ── updateVariant ─────────────────────────────────────────────────────────────

describe("SaasFunnelService.updateVariant", () => {
  it("updates weight_pct", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await svc.updateVariant("v-a", { weightPct: 70 });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE saas_funnel_step_variants"),
      expect.arrayContaining([70]),
    );
  });

  it("throws VALIDATION for negative weight", async () => {
    const db = makeDb();
    const svc = new SaasFunnelService(db as never);
    await expect(svc.updateVariant("v-a", { weightPct: -1 })).rejects.toThrow(
      expect.objectContaining({ code: "VALIDATION" }),
    );
  });
});
