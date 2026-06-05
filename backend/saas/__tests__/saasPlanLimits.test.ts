import { describe, expect, it } from "vitest";

import { assertBelowPlanLimit, getSaasPlanLimit, SaasPlanQuotaError } from "../saasPlanLimits";

describe("saasPlanLimits", () => {
  it("starter has finite contact limit", () => {
    expect(getSaasPlanLimit("starter", "contacts")).toBe(2500);
  });

  it("enterprise has unlimited deals", () => {
    expect(getSaasPlanLimit("enterprise", "deals")).toBeNull();
  });

  it("assertBelowPlanLimit throws when at limit", () => {
    expect(() => assertBelowPlanLimit("starter", "campanias", 10)).toThrow(SaasPlanQuotaError);
  });

  it("allows create below limit", () => {
    expect(() => assertBelowPlanLimit("starter", "workflows", 5)).not.toThrow();
  });
});
