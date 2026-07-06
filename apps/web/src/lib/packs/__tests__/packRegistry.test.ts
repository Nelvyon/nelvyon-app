import { describe, it, expect } from "vitest";
import { resolveKickoffPackId } from "../packRegistry";
import { LOCAL_GROWTH_PACK_ID, ECOMMERCE_GROWTH_PACK_ID } from "../types";

describe("resolveKickoffPackId", () => {
  it("resolves growth pack ids directly", () => {
    expect(resolveKickoffPackId(LOCAL_GROWTH_PACK_ID)).toBe(LOCAL_GROWTH_PACK_ID);
  });

  it("maps catalog satellite SKUs to launchPackId", () => {
    expect(resolveKickoffPackId("seo-local-pack")).toBe(LOCAL_GROWTH_PACK_ID);
    expect(resolveKickoffPackId("meta-ads-pack")).toBe(ECOMMERCE_GROWTH_PACK_ID);
  });

  it("returns null for unknown pack", () => {
    expect(resolveKickoffPackId("not-a-pack")).toBeNull();
  });
});

describe("buildBetaPackStepDefinitions", () => {
  it("includes sku steps for each SKU in sequence", async () => {
    const { buildBetaPackStepDefinitions } = await import("../types");
    const steps = buildBetaPackStepDefinitions(["NELVYON-LANDING", "NELVYON-SEO"]);
    expect(steps.some((s) => s.key === "sku_landing")).toBe(true);
    expect(steps.some((s) => s.key === "sku_seo")).toBe(true);
  });
});
