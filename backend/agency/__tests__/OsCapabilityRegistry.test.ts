import { describe, expect, it } from "vitest";
import {
  assertOsCapabilityRegistryIntegrity,
  getOsCapability,
  listEliteOsServices,
  listOsCapabilities,
  OS_SECTOR_FLEET_POLICY,
} from "../OsCapabilityRegistry";

describe("OsCapabilityRegistry", () => {
  it("has 11 real services with integrity", () => {
    expect(listOsCapabilities()).toHaveLength(11);
    const check = assertOsCapabilityRegistryIntegrity();
    expect(check.violations).toEqual([]);
    expect(check.ok).toBe(true);
  });

  it("marks mesh-verified growth SKU services as elite (not ecommerce until E2E ALL_PASS)", () => {
    expect(listEliteOsServices()).toEqual(expect.arrayContaining(["seo", "web_landing"]));
    expect(listEliteOsServices()).not.toContain("ecommerce");
    expect(getOsCapability("ecommerce")?.status).toBe("partial");
  });

  it("forbids minting new sector flotilla agents as policy", () => {
    expect(OS_SECTOR_FLEET_POLICY.mintNewSectorAgents).toBe(false);
    expect(OS_SECTOR_FLEET_POLICY.role).toBe("legacy_satellite");
  });

  it("ads and email require CEO approval", () => {
    expect(getOsCapability("ads")?.ceoApprovalRequired).toBe(true);
    expect(getOsCapability("email")?.ceoApprovalRequired).toBe(true);
  });
});
