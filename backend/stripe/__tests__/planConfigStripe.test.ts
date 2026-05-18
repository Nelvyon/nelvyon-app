import { afterEach, describe, expect, it } from "vitest";

import { getStripePriceId } from "../../billing/planConfig";
import { mapStripePriceToNelvyon } from "../stripeApi";

describe("Stripe plan config", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("getStripePriceId resuelve STRIPE_PRICE_ID_*", () => {
    process.env.STRIPE_PRICE_ID_PRO = "price_pro_test";
    expect(getStripePriceId("pro")).toBe("price_pro_test");
  });

  it("mapStripePriceToNelvyon invierte price id a plan", () => {
    process.env.STRIPE_PRICE_ID_AGENCY = "price_agency_test";
    expect(mapStripePriceToNelvyon("price_agency_test")).toBe("agency");
  });
});
