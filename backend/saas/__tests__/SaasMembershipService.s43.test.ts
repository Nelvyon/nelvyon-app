/**
 * S43 — SaasMembershipService unit tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SaasMembershipService,
} from "../SaasMembershipService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── Stable affiliate mock (single instance) ───────────────────────────────────

const mockTrackConversion = vi.fn().mockResolvedValue(null);

vi.mock("../SaasAffiliateService", () => ({
  getSaasAffiliateService: () => ({ trackConversion: mockTrackConversion }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1", tenant_id: "t1", name: "Pro", slug: "pro",
    price_amount: "29.99", price_currency: "EUR", billing_interval: "month",
    includes: { courses: ["c1"], communities: ["com1"], features: ["Acceso total"] },
    affiliate_commission_pct: "10", is_active: true, stripe_price_id: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1", tenant_id: "t1", plan_id: "plan-1", contact_id: null,
    contact_email: "user@test.com", status: "active", stripe_subscription_id: null,
    starts_at: new Date().toISOString(), expires_at: null, affiliate_ref: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

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

beforeEach(() => { mockTrackConversion.mockClear(); });
afterEach(() => { vi.restoreAllMocks(); });

// ── Plans ─────────────────────────────────────────────────────────────────────

describe("listPlans", () => {
  it("returns mapped plans", async () => {
    const svc = new SaasMembershipService(makeDb([[makePlanRow()]]));
    const plans = await svc.listPlans("t1");
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe("Pro");
    expect(plans[0].priceAmount).toBe(29.99);
    expect(plans[0].billingInterval).toBe("month");
  });

  it("returns empty when no plans", async () => {
    const svc = new SaasMembershipService(makeDb([[]]));
    expect(await svc.listPlans("t1")).toEqual([]);
  });
});

describe("createPlan", () => {
  it("creates plan and returns it", async () => {
    const row = makePlanRow({ name: "Starter", slug: "starter" });
    const svc = new SaasMembershipService(makeDb([[row]]));
    const plan = await svc.createPlan("t1", { name: "Starter", priceAmount: 9.99 });
    expect(plan.name).toBe("Starter");
    expect(plan.slug).toBe("starter");
  });

  it("throws VALIDATION when name is empty", async () => {
    const svc = new SaasMembershipService(makeDb([[]]));
    await expect(svc.createPlan("t1", { name: "" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("auto-generates slug from name", async () => {
    const db = { query: vi.fn().mockResolvedValue([makePlanRow({ slug: "mi-plan-pro" })]) } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.createPlan("t1", { name: "Mi Plan Pro" });
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO saas_membership_plans"),
      expect.arrayContaining(["mi-plan-pro"])
    );
  });
});

describe("updatePlan", () => {
  it("updates and returns plan", async () => {
    const updated = makePlanRow({ name: "Pro Plus", price_amount: "49.99" });
    const svc = new SaasMembershipService(makeDb([[makePlanRow()], [updated]]));
    const plan = await svc.updatePlan("t1", "plan-1", { name: "Pro Plus", priceAmount: 49.99 });
    expect(plan.name).toBe("Pro Plus");
    expect(plan.priceAmount).toBe(49.99);
  });

  it("throws NOT_FOUND when plan does not exist", async () => {
    const svc = new SaasMembershipService(makeDb([[]]));
    await expect(svc.updatePlan("t1", "bad-id", { name: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("deletePlan", () => {
  it("calls DELETE query", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.deletePlan("t1", "plan-1");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM saas_membership_plans"),
      ["plan-1", "t1"]
    );
  });
});

// ── Members ───────────────────────────────────────────────────────────────────

describe("subscribeMember", () => {
  it("creates member and grants access to includes", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([makePlanRow()])   // plan lookup
        .mockResolvedValueOnce([makeMemberRow()]) // UPSERT member
        .mockResolvedValueOnce([])                // access grant course c1
        .mockResolvedValueOnce([]),               // access grant community com1
    } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    const member = await svc.subscribeMember("t1", {
      planId: "plan-1",
      contactEmail: "user@test.com",
    });
    expect(member.contactEmail).toBe("user@test.com");
    expect(member.status).toBe("active");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("saas_membership_access"),
      expect.arrayContaining(["t1", "mem-1", "course", "c1"])
    );
  });

  it("throws NOT_FOUND for inactive/missing plan", async () => {
    const svc = new SaasMembershipService(makeDb([[]]));
    await expect(svc.subscribeMember("t1", { planId: "bad", contactEmail: "x@y.com" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calls affiliate trackConversion when affiliateRef provided", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([makePlanRow()])
        .mockResolvedValueOnce([makeMemberRow({ affiliate_ref: "AFF123" })])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.subscribeMember("t1", {
      planId: "plan-1",
      contactEmail: "user@test.com",
      affiliateRef: "AFF123",
    });
    expect(mockTrackConversion).toHaveBeenCalledWith("t1", "AFF123", 29.99);
  });

  it("does NOT call affiliate when no affiliateRef", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([makePlanRow()])
        .mockResolvedValueOnce([makeMemberRow()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.subscribeMember("t1", { planId: "plan-1", contactEmail: "user@test.com" });
    expect(mockTrackConversion).not.toHaveBeenCalled();
  });
});

describe("cancelMember", () => {
  it("calls UPDATE status=cancelled", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.cancelMember("t1", "mem-1");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("status='cancelled'"),
      ["mem-1", "t1"]
    );
  });
});

describe("listMembers", () => {
  it("returns all members when no planId filter", async () => {
    const svc = new SaasMembershipService(makeDb([[makeMemberRow(), makeMemberRow({ id: "mem-2" })]]));
    const members = await svc.listMembers("t1");
    expect(members).toHaveLength(2);
  });

  it("filters by planId when provided", async () => {
    const db = { query: vi.fn().mockResolvedValue([makeMemberRow()]) } as unknown as SaasPostgresPort;
    const svc = new SaasMembershipService(db);
    await svc.listMembers("t1", "plan-1");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(
      expect.stringContaining("plan_id=$2"),
      ["t1", "plan-1"]
    );
  });
});

// ── Access ────────────────────────────────────────────────────────────────────

describe("checkAccess", () => {
  it("returns true when direct access row exists", async () => {
    const svc = new SaasMembershipService(makeDb([[{ id: "access-1" }], []]));
    expect(await svc.checkAccess("t1", "user@test.com", "course", "c1")).toBe(true);
  });

  it("returns true when access via plan includes JSONB", async () => {
    const svc = new SaasMembershipService(makeDb([[], [{ id: "mem-1" }]]));
    expect(await svc.checkAccess("t1", "user@test.com", "course", "c1")).toBe(true);
  });

  it("returns false when no access grant", async () => {
    const svc = new SaasMembershipService(makeDb([[], []]));
    expect(await svc.checkAccess("t1", "user@test.com", "course", "c-locked")).toBe(false);
  });
});

// ── Portal ────────────────────────────────────────────────────────────────────

describe("getMemberPortal", () => {
  it("returns plan + includes for active member", async () => {
    const memberWithIncludes = {
      ...makeMemberRow(),
      includes: { courses: ["c1", "c2"], communities: ["com1"], features: [] },
    };
    const svc = new SaasMembershipService(makeDb([
      [memberWithIncludes],
      [makePlanRow()],
    ]));
    const portal = await svc.getMemberPortal("t1", "user@test.com");
    expect(portal.plans).toHaveLength(1);
    expect(portal.courses).toContain("c1");
    expect(portal.communities).toContain("com1");
  });

  it("returns empty portal for unknown email", async () => {
    const svc = new SaasMembershipService(makeDb([[]]));
    const portal = await svc.getMemberPortal("t1", "unknown@test.com");
    expect(portal.plans).toHaveLength(0);
    expect(portal.courses).toHaveLength(0);
  });
});
