import { describe, expect, it } from "vitest";
import { calculatePartnerCommission } from "../commissionCalc";

describe("calculatePartnerCommission", () => {
  it("calculates pct without marking payable", () => {
    const r = calculatePartnerCommission({ amountEur: 100, commissionPct: 20 });
    expect(r.commissionEur).toBe(20);
    expect(r.payable).toBe(false);
  });

  it("rejects invalid pct", () => {
    expect(() => calculatePartnerCommission({ amountEur: 10, commissionPct: 150 })).toThrow(/commissionPct/);
  });
});
