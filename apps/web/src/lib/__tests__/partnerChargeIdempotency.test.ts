/**
 * Un reintento no puede cobrar dos veces.
 *
 * HALLAZGO: `chargePartnerClientPack` llamaba a `createConnectPaymentIntent`
 * sin clave de idempotencia. Un doble clic o un reintento de red creaba un
 * PaymentIntent NUEVO —otro cobro real al cliente del partner— y el ledger
 * escribia dos filas, porque deduplica por `pi.id` y ese id tambien era otro.
 *
 * Se comprueba en la capa que habla con Stripe: es donde la clave tiene efecto
 * (Stripe deduplica por `Idempotency-Key` durante 24h).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const peticiones: Array<{ headers: Record<string, string>; body: string }> = [];

beforeEach(() => {
  peticiones.length = 0;
  process.env.STRIPE_SECRET_KEY = "sk_test_ficticia_para_tests";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const headers = Object.fromEntries(
        Object.entries((init.headers ?? {}) as Record<string, string>),
      );
      peticiones.push({ headers, body: String(init.body ?? "") });
      return {
        ok: true,
        json: async () => ({ id: "pi_fake", client_secret: "cs_fake", status: "requires_payment_method" }),
      } as unknown as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clave de idempotencia hacia Stripe", () => {
  it("la envia como cabecera cuando se le da", async () => {
    const { createConnectPaymentIntent } = await import("@/lib/partners/partnerStripeConnect");
    await createConnectPaymentIntent({
      amountCents: 60000,
      currency: "eur",
      connectedAccountId: "acct_x",
      applicationFeeCents: 19900,
      idempotencyKey: "clave-estable-1",
    });
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].headers["Idempotency-Key"]).toBe("clave-estable-1");
  });

  it("dos llamadas con la misma clave la repiten: Stripe deduplica, no nosotros", async () => {
    const { createConnectPaymentIntent } = await import("@/lib/partners/partnerStripeConnect");
    const args = {
      amountCents: 60000,
      currency: "eur",
      connectedAccountId: "acct_x",
      applicationFeeCents: 19900,
      idempotencyKey: "clave-estable-2",
    };
    await createConnectPaymentIntent(args);
    await createConnectPaymentIntent(args);
    const claves = peticiones.map((p) => p.headers["Idempotency-Key"]);
    expect(claves).toEqual(["clave-estable-2", "clave-estable-2"]);
  });

  it("sin clave no manda la cabecera: es opcional, no un valor vacio", async () => {
    // Mandar una cabecera vacia seria peor que no mandarla: Stripe la
    // rechazaria y el cobro fallaria entero.
    const { createConnectPaymentIntent } = await import("@/lib/partners/partnerStripeConnect");
    await createConnectPaymentIntent({
      amountCents: 100,
      currency: "eur",
      connectedAccountId: "acct_x",
      applicationFeeCents: 50,
    });
    expect(peticiones[0].headers["Idempotency-Key"]).toBeUndefined();
  });
});
