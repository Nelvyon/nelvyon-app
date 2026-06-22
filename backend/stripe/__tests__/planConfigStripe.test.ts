import { afterEach, describe, expect, it, vi } from "vitest";

import { getStripePriceEnvVarName, getStripePriceId } from "../../billing/planConfig";
import {
  mapStripePriceToNelvyon,
  retrieveStripePrice,
  StripePriceNotFoundError,
  validateStripePriceForPlan,
} from "../stripeApi";

describe("Stripe plan config", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
  });

  it("getStripePriceId resuelve solo STRIPE_PRICE_ID_*", () => {
    process.env.STRIPE_PRICE_ID_PRO = "price_pro_test";
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    expect(getStripePriceId("pro")).toBe("price_pro_test");
    expect(getStripePriceEnvVarName("pro")).toBe("STRIPE_PRICE_ID_PRO");
  });

  it("getStripePriceId falla si falta env var (sin fallback legacy)", () => {
    delete process.env.STRIPE_PRICE_ID_STARTER;
    delete process.env.STRIPE_PRICE_STARTER_MONTHLY;
    expect(() => getStripePriceId("starter")).toThrow("Falta variable de entorno: STRIPE_PRICE_ID_STARTER");
  });

  it("mapStripePriceToNelvyon invierte price id a plan", () => {
    process.env.STRIPE_PRICE_ID_AGENCY = "price_agency_test";
    expect(mapStripePriceToNelvyon("price_agency_test")).toBe("agency");
  });
});

describe("validateStripePriceForPlan", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllGlobals();
  });

  it("retrieveStripePrice llama GET /prices/:id", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "price_live_1", active: true }), { status: 200 }),
    );

    const price = await retrieveStripePrice("price_live_1");
    expect(price.id).toBe("price_live_1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/prices/price_live_1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("validateStripePriceForPlan lanza StripePriceNotFoundError en 404", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PRICE_ID_STARTER = "price_wrong_typo";
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              message: "No such price: 'price_wrong_typo'",
              type: "invalid_request_error",
              code: "resource_missing",
            },
          }),
          { status: 404 },
        ),
      ),
    );

    const err = await validateStripePriceForPlan("starter").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StripePriceNotFoundError);
    expect(err).toMatchObject({
      priceId: "price_wrong_typo",
      envVar: "STRIPE_PRICE_ID_STARTER",
    });
    expect((err as StripePriceNotFoundError).stripeMessage).toContain("No such price: 'price_wrong_typo'");
  });
});
