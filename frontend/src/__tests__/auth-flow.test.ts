/**
 * Auth Flow Tests
 * Validates: session handling, role-based defaults, subscription sync logic.
 */
import { describe, it, expect, vi } from "vitest";

// Mock the web SDK
vi.mock("@metagptx/web-sdk", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1", email: "test@nelvyon.com" } } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({ data: null, error: null }),
    }),
  }),
}));

import { PLANS, isRouteAllowed, normalizePlanId, type PlanId } from "@/lib/plans";
import {
  hasPermission,
  isRoleAtLeast,
  getPermissionsForRole,
  type Role,
} from "@/lib/rbac";

/** Simulates the AuthContext subscription sync logic */
function resolveUserPlan(
  isSuperAdmin: boolean,
  subscriptionInfo: { has_subscription: boolean; status: string; plan_id?: string } | null
): PlanId {
  if (isSuperAdmin) return "enterprise";
  if (!subscriptionInfo) return "starter";
  if (subscriptionInfo.has_subscription && subscriptionInfo.status === "active" && subscriptionInfo.plan_id) {
    return normalizePlanId(subscriptionInfo.plan_id);
  }
  return "starter";
}

describe("Auth — Plan Resolution from Subscription", () => {
  it("super_admin should always get enterprise plan", () => {
    expect(resolveUserPlan(true, null)).toBe("enterprise");
    expect(resolveUserPlan(true, { has_subscription: false, status: "cancelled" })).toBe("enterprise");
  });

  it("active pro subscription should resolve to pro", () => {
    expect(resolveUserPlan(false, { has_subscription: true, status: "active", plan_id: "pro" })).toBe("pro");
  });

  it("active enterprise subscription should resolve to enterprise", () => {
    expect(resolveUserPlan(false, { has_subscription: true, status: "active", plan_id: "enterprise" })).toBe("enterprise");
  });

  it("no subscription should default to starter", () => {
    expect(resolveUserPlan(false, null)).toBe("starter");
    expect(resolveUserPlan(false, { has_subscription: false, status: "" })).toBe("starter");
  });

  it("cancelled subscription should default to starter", () => {
    expect(resolveUserPlan(false, { has_subscription: true, status: "cancelled", plan_id: "pro" })).toBe("starter");
  });

  it("past_due subscription should default to starter", () => {
    expect(resolveUserPlan(false, { has_subscription: true, status: "past_due", plan_id: "pro" })).toBe("starter");
  });

  it("invalid plan_id should default to starter", () => {
    expect(resolveUserPlan(false, { has_subscription: true, status: "active", plan_id: "invalid_plan" })).toBe("starter");
  });
});

describe("Auth — Role + Plan Combined Access", () => {
  /** Simulates combined access check: role permission AND plan route access */
  function canAccess(role: Role, planId: PlanId, route: string, permission: string): boolean {
    // Super admin bypasses all checks
    if (role === "super_admin") return true;
    // Must have both the role permission AND the plan route access
    return hasPermission(role, permission as never) && isRouteAllowed(planId, route);
  }

  it("admin with enterprise plan can access admin panel", () => {
    expect(canAccess("admin", "enterprise", "/saas/admin", "platform:health")).toBe(true);
  });

  it("admin with starter plan CANNOT access admin panel (plan restriction)", () => {
    expect(canAccess("admin", "starter", "/saas/admin", "platform:health")).toBe(false);
  });

  it("viewer with enterprise plan CANNOT manage billing (role restriction)", () => {
    expect(canAccess("viewer", "enterprise", "/saas/billing", "billing:manage")).toBe(false);
  });

  it("user with pro plan can access campaigns", () => {
    expect(canAccess("user", "pro", "/saas/campaigns", "clients:read")).toBe(true);
  });

  it("user with starter plan CANNOT access campaigns", () => {
    expect(canAccess("user", "starter", "/saas/campaigns", "clients:read")).toBe(false);
  });

  it("super_admin bypasses all restrictions", () => {
    expect(canAccess("super_admin", "starter", "/saas/admin", "platform:settings")).toBe(true);
    expect(canAccess("super_admin", "starter", "/saas/cybersecurity", "security:manage")).toBe(true);
  });

  it("manager with pro plan can delete clients and access pipelines", () => {
    expect(canAccess("manager", "pro", "/saas/pipelines", "clients:delete")).toBe(true);
  });

  it("manager with starter plan CANNOT access pipelines (plan restriction)", () => {
    expect(canAccess("manager", "starter", "/saas/pipelines", "clients:delete")).toBe(false);
  });
});

describe("Auth — Role Hierarchy Integrity", () => {
  const roles: Role[] = ["viewer", "user", "manager", "admin", "super_admin"];

  it("each role should have progressively more permissions", () => {
    for (let i = 1; i < roles.length; i++) {
      const lower = getPermissionsForRole(roles[i - 1]);
      const higher = getPermissionsForRole(roles[i]);
      expect(higher.size).toBeGreaterThan(lower.size);
    }
  });

  it("isRoleAtLeast should respect hierarchy", () => {
    expect(isRoleAtLeast("super_admin", "viewer")).toBe(true);
    expect(isRoleAtLeast("admin", "user")).toBe(true);
    expect(isRoleAtLeast("viewer", "admin")).toBe(false);
    expect(isRoleAtLeast("user", "super_admin")).toBe(false);
  });
});

describe("Auth — Session Edge Cases", () => {
  it("should handle null subscription gracefully", () => {
    const plan = resolveUserPlan(false, null);
    expect(plan).toBe("starter");
    expect(isRouteAllowed(plan, "/saas/home")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/dashboard")).toBe(true);
  });

  it("should handle empty subscription object", () => {
    const plan = resolveUserPlan(false, { has_subscription: false, status: "" });
    expect(plan).toBe("starter");
  });

  it("partner plan should only access partner routes", () => {
    const plan = resolveUserPlan(false, { has_subscription: true, status: "active", plan_id: "partner" });
    expect(plan).toBe("partner");
    expect(isRouteAllowed(plan, "/saas/partners")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/crm")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/campaigns")).toBe(false);
  });
});