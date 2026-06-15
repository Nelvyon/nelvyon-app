import { describe, expect, it } from "vitest";

import { connectStatusLabel, mapStripeAccountStatus } from "@/lib/partners/partnerStripeConnect";

describe("partnerStripeConnect", () => {
  it("maps active account when charges and payouts enabled", () => {
    expect(
      mapStripeAccountStatus({
        id: "acct_1",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    ).toBe("active");
  });

  it("maps pending when details not submitted", () => {
    expect(
      mapStripeAccountStatus({
        id: "acct_1",
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }),
    ).toBe("pending");
  });

  it("labels statuses in Spanish", () => {
    expect(connectStatusLabel("active")).toBe("Completo");
    expect(connectStatusLabel("pending")).toBe("Pendiente");
    expect(connectStatusLabel("not_started")).toBe("Sin configurar");
  });
});
