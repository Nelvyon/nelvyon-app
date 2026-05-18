import { beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../../../../backend/db/DbClient", () => ({
  DbClient: class {
    static getInstance() {
      return { query: queryMock };
    }
  },
}));

vi.mock("@nelvyon/auth", () => ({
  authenticate: vi.fn().mockResolvedValue({ userId: "user-1", email: "u@test.com", tenantId: "t1", plan: "pro" }),
}));

import { GET } from "@/app/api/user/payment-method/route";

describe("GET /api/user/payment-method", () => {
  beforeEach(() => {
    queryMock.mockReset();
    process.env.STRIPE_SECRET_KEY = "sk_test_key";
    global.fetch = vi.fn();
  });

  it("suscripción activa devuelve tarjeta y updateUrl del portal Stripe", async () => {
    queryMock.mockResolvedValueOnce([
      {
        stripe_subscription_id: "sub_01abcdef",
        stripe_customer_id: "cus_01abcdef",
        status: "active",
      },
    ]);

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            customer: "cus_01abcdef",
            default_payment_method: {
              card: { last4: "4242", brand: "visa", exp_month: 12, exp_year: 2030 },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://billing.stripe.com/session/test_portal" }), { status: 200 }),
      );

    const res = await GET(new NextRequest("http://localhost/api/user/payment-method"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      lastFour?: string;
      cardType?: string;
      updateUrl?: string;
    };
    expect(body.lastFour).toBe("4242");
    expect(body.cardType).toBe("Visa");
    expect(body.updateUrl).toBe("https://billing.stripe.com/session/test_portal");
  });

  it("sin suscripción activa devuelve updateUrl null", async () => {
    queryMock.mockResolvedValueOnce([
      {
        stripe_subscription_id: null,
        stripe_customer_id: null,
        status: "inactive",
      },
    ]);

    const res = await GET(new NextRequest("http://localhost/api/user/payment-method"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updateUrl: string | null };
    expect(body.updateUrl).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
