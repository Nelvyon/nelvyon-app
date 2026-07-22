import { afterEach, describe, expect, it } from "vitest";
import {
  assertCeoPartnerPayoutAuthorized,
  isCeoPartnerPayoutEnabled,
} from "../ceoPartnerPayoutGate";

describe("CEO partner payout gate", () => {
  afterEach(() => {
    delete process.env.NELVYON_CEO_PARTNER_PAYOUTS;
  });

  it("defaults OFF", () => {
    expect(isCeoPartnerPayoutEnabled()).toBe(false);
    expect(() => assertCeoPartnerPayoutAuthorized()).toThrow(/CEO_GATE/);
  });

  it("allows when NELVYON_CEO_PARTNER_PAYOUTS=1", () => {
    process.env.NELVYON_CEO_PARTNER_PAYOUTS = "1";
    expect(isCeoPartnerPayoutEnabled()).toBe(true);
    expect(() => assertCeoPartnerPayoutAuthorized()).not.toThrow();
  });
});
