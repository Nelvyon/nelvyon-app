/**
 * Contract: certified packs are `available` after staging E2E ALL_PASS (ADR-050 / ADR-055).
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
  "automations-ops-pack",
  "reputation-ops-pack",
] as const;

describe("servicePacksCatalog availability honesty", () => {
  it("certified packs are available", () => {
    for (const id of CERTIFIED_PACK_IDS) {
      const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
      expect(pack, id).toBeDefined();
      expect(pack!.availability, id).toBe("available");
    }
  });

  it("no pack remains beta after ADR-055 E2E promotion", () => {
    const betas = SERVICE_PACK_CATALOG.filter((p) => p.availability === "beta");
    expect(betas.map((p) => p.id)).toEqual([]);
  });
});
