import { describe, expect, it } from "vitest";

import { buildDealDedupeKey, mapLegacyDealStageToSaas, pickDealEtlWinner } from "../saasDealsDedupe";

describe("saasDealsDedupe", () => {
  it("buildDealDedupeKey normaliza título", () => {
    const a = buildDealDedupeKey("t1", "c1", "  Big Deal  ", 1000);
    const b = buildDealDedupeKey("t1", "c1", "big deal", 1000);
    expect(a).toBe(b);
  });

  it("mapLegacyDealStageToSaas", () => {
    expect(mapLegacyDealStageToSaas("closed_won")).toBe("won");
    expect(mapLegacyDealStageToSaas("negotiation")).toBe("proposal");
    expect(mapLegacyDealStageToSaas("lead")).toBe("new");
  });

  it("pickDealEtlWinner prioriza crm_deals", () => {
    const pick = pickDealEtlWinner([
      { source: "deals" as const, legacyId: "9" },
      { source: "crm_deals" as const, legacyId: "1" },
    ]);
    expect(pick.source).toBe("crm_deals");
  });
});
