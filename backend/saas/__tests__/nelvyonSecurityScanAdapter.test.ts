import { describe, expect, it } from "vitest";

import {
  assertSecurityBlock1Contract,
  getEnabledSecurityScanners,
  getSecurityScanPlans,
} from "../../security/NelvyonSecurityScanAdapter";

describe("NelvyonSecurityScanAdapter (Labs block 1)", () => {
  it("exposes gitleaks + trivy plans with licenses and rollback", () => {
    const plans = getSecurityScanPlans();
    expect(plans.map((p) => p.id).sort()).toEqual(["gitleaks", "trivy"]);
    const g = plans.find((p) => p.id === "gitleaks")!;
    expect(g.license).toBe("MIT");
    expect(g.alreadyInNelvyon).toBe(true);
    expect(g.ciJob).toMatch(/gitleaks/i);
    const t = plans.find((p) => p.id === "trivy")!;
    expect(t.license).toBe("Apache-2.0");
    expect(t.alreadyInNelvyon).toBe(false);
    expect(t.rollback).toMatch(/NELVYON_TRIVY_ENABLED/);
  });

  it("contract assertion passes", () => {
    expect(assertSecurityBlock1Contract()).toEqual({ ok: true, violations: [] });
  });

  it("respects feature flags", () => {
    const prevG = process.env.NELVYON_GITLEAKS_ENABLED;
    const prevT = process.env.NELVYON_TRIVY_ENABLED;
    try {
      process.env.NELVYON_GITLEAKS_ENABLED = "0";
      process.env.NELVYON_TRIVY_ENABLED = "0";
      expect(getEnabledSecurityScanners()).toEqual([]);
      process.env.NELVYON_GITLEAKS_ENABLED = "1";
      process.env.NELVYON_TRIVY_ENABLED = "1";
      expect(getEnabledSecurityScanners().sort()).toEqual(["gitleaks", "trivy"]);
    } finally {
      if (prevG === undefined) delete process.env.NELVYON_GITLEAKS_ENABLED;
      else process.env.NELVYON_GITLEAKS_ENABLED = prevG;
      if (prevT === undefined) delete process.env.NELVYON_TRIVY_ENABLED;
      else process.env.NELVYON_TRIVY_ENABLED = prevT;
    }
  });
});
