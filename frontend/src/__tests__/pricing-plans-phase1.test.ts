import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CORE_PLAN_IDS, PLANS, normalizePlanId } from "@/lib/plans";

describe("PRICING-PLANS-1 FASE 1 — planes base", () => {
  it("define exactamente 3 planes core públicos", () => {
    expect(CORE_PLAN_IDS).toEqual(["starter", "pro", "enterprise"]);
  });

  it("expone módulos base coherentes por plan", () => {
    expect(PLANS.starter.modules.contacts).toBe(true);
    expect(PLANS.starter.modules.helpdesk).toBe(true);
    expect(PLANS.starter.modules.campaigns).toBe(true);
    expect(PLANS.starter.modules.workflows).toBe(true);
    expect(PLANS.starter.modules.analytics).toBe(false);
    expect(PLANS.starter.modules.integrations).toBe(false);

    expect(PLANS.pro.modules.analytics).toBe(true);
    expect(PLANS.pro.modules.integrations).toBe(true);
    expect(PLANS.enterprise.modules.analytics).toBe(true);
    expect(PLANS.enterprise.modules.integrations).toBe(true);
  });

  it("expone límites base por plan (contactos, campañas, workflows, usuarios)", () => {
    expect(PLANS.starter.limits).toEqual({
      contacts: 2500,
      activeCampaigns: 10,
      activeWorkflows: 10,
      workspaceUsers: 3,
    });
    expect(PLANS.pro.limits).toEqual({
      contacts: 25000,
      activeCampaigns: 200,
      activeWorkflows: 100,
      workspaceUsers: 20,
    });
    expect(PLANS.enterprise.limits).toEqual({
      contacts: null,
      activeCampaigns: null,
      activeWorkflows: null,
      workspaceUsers: null,
    });
  });

  it("normaliza plan_id externos sin hardcodes por archivo", () => {
    expect(normalizePlanId("starter")).toBe("starter");
    expect(normalizePlanId("pro")).toBe("pro");
    expect(normalizePlanId("enterprise")).toBe("enterprise");
    expect(normalizePlanId("partner")).toBe("partner");
    expect(normalizePlanId("otro-plan")).toBe("starter");
  });

  it("pricing pública usa planes core centralizados", () => {
    const src = readFileSync(
      join(__dirname, "..", "pages", "saas", "SaasPricing.tsx"),
      "utf-8"
    );
    expect(src).toContain("const PLAN_ORDER: PlanId[] = [...CORE_PLAN_IDS]");
  });
});
