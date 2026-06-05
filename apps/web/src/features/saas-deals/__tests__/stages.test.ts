import { describe, expect, it } from "vitest";

import {
  SAAS_DEAL_STAGES,
  dealStageLabel,
  isOpenDealStage,
  nextDealStage,
  prevDealStage,
} from "../stages";

describe("saas-deals stages", () => {
  it("defines six official SaaS deal stages", () => {
    expect(SAAS_DEAL_STAGES).toEqual([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "won",
      "lost",
    ]);
  });

  it("labels stages in Spanish", () => {
    expect(dealStageLabel("proposal")).toBe("Propuesta");
    expect(dealStageLabel("won")).toBe("Ganado");
  });

  it("navigates stages forward and backward", () => {
    expect(nextDealStage("new")).toBe("contacted");
    expect(prevDealStage("contacted")).toBe("new");
    expect(nextDealStage("lost")).toBeNull();
    expect(prevDealStage("new")).toBeNull();
  });

  it("classifies open vs closed stages", () => {
    expect(isOpenDealStage("qualified")).toBe(true);
    expect(isOpenDealStage("won")).toBe(false);
    expect(isOpenDealStage("lost")).toBe(false);
  });
});
