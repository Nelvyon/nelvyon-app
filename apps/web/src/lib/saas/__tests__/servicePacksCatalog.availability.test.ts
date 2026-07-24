/**
 * Contract: five beta packs must stay `availability: "beta"` until cert promote.
 * Growth packs remain `available`.
 */
import { describe, expect, it } from "vitest";
import { SERVICE_PACK_CATALOG } from "../servicePacksCatalog";

const BETA_PACK_IDS = [
  "social-calendar-pack",
  "content-strategy-pack",
  "cro-audit-pack",
  "analytics-setup-pack",
  "brand-voice-pack",
  "strategy-pack",
  "funnel-growth-pack",
  "retention-pack",
] as const;

const GROWTH_PACK_IDS = [
  "local-business-growth",
  "ecommerce-growth",
  "saas-b2b-growth",
] as const;

describe("servicePacksCatalog availability honesty", () => {
  it("beta packs are not marked available", () => {
    for (const id of BETA_PACK_IDS) {
      const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
      expect(pack, id).toBeDefined();
      expect(pack!.availability, id).toBe("beta");
    }
  });

  it("growth packs remain available", () => {
    for (const id of GROWTH_PACK_IDS) {
      const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
      expect(pack, id).toBeDefined();
      expect(pack!.availability, id).toBe("available");
    }
  });
});
