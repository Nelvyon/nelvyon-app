import { describe, expect, it } from "vitest";

import {
  mapBillablePlanToSaasPlan,
  normalizeBillablePlanId,
  shouldSyncSaasTenantPlan,
  isSaasPlanSyncStatus,
} from "../saasTenantMapper";

describe("normalizeBillablePlanId", () => {
  it("trims and lowercases", () => {
    expect(normalizeBillablePlanId("  PRO  ")).toBe("pro");
  });

  it("empty becomes empty string", () => {
    expect(normalizeBillablePlanId("")).toBe("");
    expect(normalizeBillablePlanId(null)).toBe("");
    expect(normalizeBillablePlanId(undefined)).toBe("");
  });
});

describe("mapBillablePlanToSaasPlan", () => {
  it.each([
    ["starter", "starter"],
    ["pro", "pro"],
    ["enterprise", "enterprise"],
    ["agency", "enterprise"],
    ["partner", "starter"],
    ["AGENCY", "enterprise"],
    ["", "starter"],
    ["unknown", "starter"],
  ] as const)("maps %s → %s", (input, expected) => {
    expect(mapBillablePlanToSaasPlan(input)).toBe(expected);
  });
});

describe("shouldSyncSaasTenantPlan / isSaasPlanSyncStatus", () => {
  it.each(["active", "trialing", "past_due", "ACTIVE"])("allows sync for %s", (status) => {
    expect(shouldSyncSaasTenantPlan(status)).toBe(true);
    expect(isSaasPlanSyncStatus(status)).toBe(true);
  });

  it.each(["canceled", "pending", "suspended", "paused", "unpaid", "inactive"])(
    "blocks sync for %s",
    (status) => {
      expect(shouldSyncSaasTenantPlan(status)).toBe(false);
      expect(isSaasPlanSyncStatus(status)).toBe(false);
    },
  );
});
