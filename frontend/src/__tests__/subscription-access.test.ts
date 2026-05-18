/**
 * Subscription & Plan Access Tests
 * Validates that route access is correctly gated by subscription plan.
 * Covers: plan hierarchy, route gating, billing calculations, promo codes.
 */
import { describe, it, expect } from "vitest";
import {
  PLANS,
  isRouteAllowed,
  calculatePrice,
  getAllPricing,
  BILLING_OPTIONS,
  generateInviteCode,
  applyPromo,
  savePromos,
  loadPromos,
  type PlanId,
  type BillingCycle,
} from "@/lib/plans";

describe("Plan Route Access — Starter", () => {
  const plan: PlanId = "starter";

  it("should allow access to dashboard", () => {
    expect(isRouteAllowed(plan, "/saas/home")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/dashboard")).toBe(true);
  });

  it("should allow access to CRM", () => {
    expect(isRouteAllowed(plan, "/saas/crm")).toBe(true);
  });

  it("should allow access to billing", () => {
    expect(isRouteAllowed(plan, "/saas/billing")).toBe(true);
  });

  it("should allow access to email-marketing", () => {
    expect(isRouteAllowed(plan, "/saas/email-marketing")).toBe(true);
  });

  it("should DENY access to pipelines (Pro feature)", () => {
    expect(isRouteAllowed(plan, "/saas/pipelines")).toBe(false);
  });

  it("should DENY access to campaigns (Pro feature)", () => {
    expect(isRouteAllowed(plan, "/saas/campaigns")).toBe(false);
  });

  it("should DENY access to funnels (Pro feature)", () => {
    expect(isRouteAllowed(plan, "/saas/funnels")).toBe(false);
  });

  it("should DENY access to autopilot (Enterprise feature)", () => {
    expect(isRouteAllowed(plan, "/saas/autopilot")).toBe(false);
  });

  it("should DENY access to cybersecurity (Enterprise feature)", () => {
    expect(isRouteAllowed(plan, "/saas/cybersecurity")).toBe(false);
  });

  it("should DENY access to admin panel (Enterprise feature)", () => {
    expect(isRouteAllowed(plan, "/saas/admin")).toBe(false);
  });
});

describe("Plan Route Access — Pro", () => {
  const plan: PlanId = "pro";

  it("should allow all Starter routes", () => {
    expect(isRouteAllowed(plan, "/saas/home")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/dashboard")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/crm")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/billing")).toBe(true);
  });

  it("should allow Pro-specific routes", () => {
    expect(isRouteAllowed(plan, "/saas/pipelines")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/campaigns")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/funnels")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/social")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/workflows")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/calls")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/analytics")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/integrations")).toBe(true);
  });

  it("should DENY Enterprise-only routes", () => {
    expect(isRouteAllowed(plan, "/saas/autopilot")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/cybersecurity")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/video-ads")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/agents-marketplace")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/admin")).toBe(false);
  });
});

describe("Plan Route Access — Enterprise", () => {
  const plan: PlanId = "enterprise";

  it("should allow ALL routes including Enterprise-only", () => {
    expect(isRouteAllowed(plan, "/saas/home")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/dashboard")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/crm")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/pipelines")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/campaigns")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/autopilot")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/cybersecurity")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/video-ads")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/agents-marketplace")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/admin")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/partners")).toBe(true);
  });
});

describe("Plan Route Access — Partner", () => {
  const plan: PlanId = "partner";

  it("should only allow partner-specific routes", () => {
    expect(isRouteAllowed(plan, "/saas/home")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/dashboard")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/partners")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/contracts")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/templates")).toBe(true);
    expect(isRouteAllowed(plan, "/saas/settings")).toBe(true);
  });

  it("should DENY non-partner routes", () => {
    expect(isRouteAllowed(plan, "/saas/crm")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/campaigns")).toBe(false);
    expect(isRouteAllowed(plan, "/saas/autopilot")).toBe(false);
  });
});

describe("Plan Route Access — Sub-routes", () => {
  it("should allow sub-routes of allowed routes", () => {
    expect(isRouteAllowed("starter", "/saas/crm/details")).toBe(true);
    expect(isRouteAllowed("pro", "/saas/campaigns/new")).toBe(true);
    expect(isRouteAllowed("enterprise", "/saas/admin/users")).toBe(true);
  });

  it("should deny sub-routes of disallowed routes", () => {
    expect(isRouteAllowed("starter", "/saas/campaigns/new")).toBe(false);
    expect(isRouteAllowed("pro", "/saas/autopilot/config")).toBe(false);
  });
});

describe("Plan Route Access — Invalid plan", () => {
  it("should return false for invalid plan ID", () => {
    expect(isRouteAllowed("nonexistent" as PlanId, "/saas/dashboard")).toBe(false);
  });
});

describe("Billing Calculations", () => {
  it("monthly should have no discount", () => {
    const result = calculatePrice(79, "monthly");
    expect(result.monthlyPrice).toBe(79);
    expect(result.totalPrice).toBe(79);
    expect(result.savings).toBe(0);
    expect(result.savingsPercent).toBe(0);
  });

  it("quarterly should have 10% discount", () => {
    const result = calculatePrice(79, "quarterly");
    expect(result.savingsPercent).toBe(10);
    expect(result.monthlyPrice).toBe(71.1);
    expect(result.totalPrice).toBe(213.3);
    expect(result.savings).toBeCloseTo(23.7, 1);
  });

  it("annual should have 25% discount", () => {
    const result = calculatePrice(79, "annual");
    expect(result.savingsPercent).toBe(25);
    expect(result.monthlyPrice).toBe(59.25);
    expect(result.totalPrice).toBe(711);
    expect(result.savings).toBe(237);
  });

  it("biennial should have 35% discount", () => {
    const result = calculatePrice(249, "biennial");
    expect(result.savingsPercent).toBe(35);
    expect(result.monthlyPrice).toBe(161.85);
    expect(result.totalPrice).toBe(3884.4);
  });

  it("getAllPricing should return pricing for all cycles", () => {
    const pricing = getAllPricing("pro");
    expect(pricing).toHaveLength(BILLING_OPTIONS.length);
    expect(pricing[0].cycle).toBe("monthly");
    expect(pricing[0].monthlyPrice).toBe(249);
    // Each subsequent cycle should have lower monthly price
    for (let i = 1; i < pricing.length; i++) {
      expect(pricing[i].monthlyPrice).toBeLessThan(pricing[0].monthlyPrice);
    }
  });

  it("getAllPricing should return empty for invalid plan", () => {
    const pricing = getAllPricing("invalid" as PlanId);
    expect(pricing).toHaveLength(0);
  });
});

describe("Plan Definitions — Integrity", () => {
  const planIds: PlanId[] = ["starter", "pro", "enterprise", "partner"];

  it("all plans should be defined", () => {
    planIds.forEach((id) => {
      expect(PLANS[id]).toBeDefined();
      expect(PLANS[id].id).toBe(id);
    });
  });

  it("all plans should have required fields", () => {
    planIds.forEach((id) => {
      const plan = PLANS[id];
      expect(plan.name).toBeTruthy();
      expect(plan.price).toBeGreaterThanOrEqual(0);
      expect(plan.currency).toBeTruthy();
      expect(plan.color).toMatch(/^#/);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.allowedRoutes.length).toBeGreaterThan(0);
    });
  });

  it("plan prices should be cheaper than GHL equivalents", () => {
    expect(PLANS.starter.price).toBeLessThan(97);
    expect(PLANS.pro.price).toBeLessThan(297);
    expect(PLANS.enterprise.price).toBeLessThan(497);
  });

  it("higher plans should have more routes", () => {
    expect(PLANS.pro.allowedRoutes.length).toBeGreaterThan(PLANS.starter.allowedRoutes.length);
    expect(PLANS.enterprise.allowedRoutes.length).toBeGreaterThan(PLANS.pro.allowedRoutes.length);
  });

  it("higher plans should have more features", () => {
    expect(PLANS.pro.features.length).toBeGreaterThan(PLANS.starter.features.length);
    expect(PLANS.enterprise.features.length).toBeGreaterThan(PLANS.pro.features.length);
  });
});

describe("Invite Code Generation", () => {
  it("should generate codes with NVY- prefix", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^NVY-/);
  });

  it("should generate unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBe(50);
  });

  it("should generate codes of consistent length", () => {
    const code = generateInviteCode();
    expect(code.length).toBe(13); // NVY-XXXX-XXXX
  });
});