import { describe, it, expect } from "vitest";
import { parseFunnelCheckoutStepConfig } from "../funnelCheckoutStepConfig";

describe("parseFunnelCheckoutStepConfig", () => {
  it("parses amount + currency + productName", () => {
    const cfg = parseFunnelCheckoutStepConfig(
      JSON.stringify({ amount: 9900, currency: "EUR", productName: "Plan Pro" }),
      "Checkout",
    );
    expect(cfg).toEqual({ amount: 9900, currency: "eur", productName: "Plan Pro" });
  });

  it("accepts priceCents alias", () => {
    const cfg = parseFunnelCheckoutStepConfig(JSON.stringify({ priceCents: 5000 }), "Offer");
    expect(cfg?.amount).toBe(5000);
    expect(cfg?.productName).toBe("Offer");
  });

  it("rejects amount below minimum", () => {
    expect(parseFunnelCheckoutStepConfig(JSON.stringify({ amount: 10 }), "X")).toBeNull();
  });

  it("rejects HTML content", () => {
    expect(parseFunnelCheckoutStepConfig("<h1>Buy</h1>", "Checkout")).toBeNull();
  });

  it("rejects empty content", () => {
    expect(parseFunnelCheckoutStepConfig(null, "Checkout")).toBeNull();
  });
});
