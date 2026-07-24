/**
 * Contract: certified packs are `available`; new ADR-055 packs may remain `beta`
 * until staging E2E ALL_PASS (then promote to available).
 */
import { describe, expect, it } from "vitest";
import { SERVICE_PACK_CATALOG } from "../servicePacksCatalog";

const CERTIFIED_PACK_IDS = [
  "local-business-growth",
  "ecommerce-growth",
  "saas-b2b-growth",
  "strategy-pack",
  "funnel-growth-pack",
  "retention-pack",
  "social-calendar-pack",
  "content-strategy-pack",
  "cro-audit-pack",
  "analytics-setup-pack",
  "brand-voice-pack",
] as const;

const PENDING_E2E_BETA_PACK_IDS = ["automations-ops-pack", "reputation-ops-pack"] as const;

describe("servicePacksCatalog availability honesty", () => {
  it("certified packs are available (ADR-050)", () => {
    for (const id of CERTIFIED_PACK_IDS) {
      const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
      expect(pack, id).toBeDefined();
      expect(pack!.availability, id).toBe("available");
    }
  });

  it("ADR-055 ops packs stay beta until E2E promotion", () => {
    for (const id of PENDING_E2E_BETA_PACK_IDS) {
      const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
      expect(pack, id).toBeDefined();
      expect(pack!.availability, id).toBe("beta");
    }
  });

  it("only ADR-055 pending packs may remain beta", () => {
    const betas = SERVICE_PACK_CATALOG.filter((p) => p.availability === "beta").map((p) => p.id);
    expect(betas.sort()).toEqual([...PENDING_E2E_BETA_PACK_IDS].sort());
  });
});
