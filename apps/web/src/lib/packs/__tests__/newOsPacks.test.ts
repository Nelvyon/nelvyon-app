import { describe, expect, it } from "vitest";
import { buildStrategy90dPlan } from "../strategyPackProduction";
import { buildFunnelMap } from "../funnelPackProduction";
import { buildRetentionPlan } from "../retentionPackProduction";
import { isOsPackFeatureEnabled } from "../osPackFlags";
import { validateStrategyPackIntake } from "../strategyPack";
import { validateFunnelGrowthIntake } from "../funnelGrowthPack";
import { validateRetentionPackIntake } from "../retentionPack";

describe("new OS packs contracts", () => {
  it("builds strategy 90d plan with QA≥85 metadata", () => {
    const plan = buildStrategy90dPlan(
      {
        business_name: "Acme",
        sector: "local",
        city: "Madrid",
        value_proposition: "Citas online",
        primary_cta: "Reservar",
        goals: ["leads"],
        horizon_days: 90,
      },
      90,
    );
    expect(plan.horizon_days).toBe(90);
    expect(plan.okrs.length).toBeGreaterThan(0);
    expect(plan.qa_score).toBeGreaterThanOrEqual(85);
    expect(plan.production).toBe(true);
  });

  it("builds funnel map with ≥3 steps", () => {
    const map = buildFunnelMap(
      {
        business_name: "Shop",
        sector: "ecommerce",
        city: "Barcelona",
        value_proposition: "Envío 24h",
        primary_cta: "Comprar",
        funnel_steps: 4,
      },
      88,
    );
    expect(map.steps).toHaveLength(4);
    expect(map.tracking_events).toHaveLength(4);
    expect(map.qa_score).toBeGreaterThanOrEqual(85);
  });

  it("builds retention plan with churn rules", () => {
    const plan = buildRetentionPlan(
      {
        business_name: "SaaS Co",
        sector: "saas_b2b",
        city: "Remote",
        value_proposition: "CRM AI",
        primary_cta: "Demo",
        cohort: "active_30d",
      },
      87,
    );
    expect(plan.sequence.length).toBeGreaterThanOrEqual(3);
    expect(plan.churn_rules.length).toBeGreaterThan(0);
    expect(plan.qa_score).toBeGreaterThanOrEqual(85);
  });

  it("validates intakes", () => {
    expect(
      validateStrategyPackIntake({
        business_name: "A",
        sector: "local",
        city: "M",
        value_proposition: "V",
        primary_cta: "C",
      }),
    ).not.toBeNull();
    expect(
      validateFunnelGrowthIntake({
        business_name: "A",
        sector: "ecommerce",
        city: "M",
        value_proposition: "V",
        primary_cta: "C",
        funnel_steps: 3,
      }),
    ).not.toBeNull();
    expect(
      validateRetentionPackIntake({
        business_name: "A",
        sector: "saas_b2b",
        city: "M",
        value_proposition: "V",
        primary_cta: "C",
      }),
    ).not.toBeNull();
  });

  it("feature flag defaults OFF when explicit 0", () => {
    const prev = process.env.NELVYON_STRATEGY_PACK;
    process.env.NELVYON_STRATEGY_PACK = "0";
    expect(isOsPackFeatureEnabled("NELVYON_STRATEGY_PACK")).toBe(false);
    if (prev === undefined) delete process.env.NELVYON_STRATEGY_PACK;
    else process.env.NELVYON_STRATEGY_PACK = prev;
  });
});
