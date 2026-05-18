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
  authenticate: vi.fn().mockResolvedValue({ userId: "user-1", email: "u@test.com", tenantId: "t1", plan: "starter" }),
}));

import { authenticate } from "@nelvyon/auth";

import { POST } from "@/app/api/user/change-plan/route";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/user/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/change-plan", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.mocked(authenticate).mockResolvedValue({
      userId: "user-1",
      email: "u@test.com",
      tenantId: "t1",
      plan: "starter",
    });
    process.env.STRIPE_SECRET_KEY = "sk_test_key";
    process.env.STRIPE_PRICE_ID_STARTER = "price_starter_env";
    process.env.STRIPE_PRICE_ID_PRO = "price_pro_env";
    process.env.STRIPE_PRICE_ID_AGENCY = "price_agency_env";
    global.fetch = vi.fn();
  });

  it("mismo plan → 400 y no llama a Stripe", async () => {
    queryMock.mockResolvedValueOnce([
      {
        stripe_subscription_id: "sub_abc",
        plan: "starter",
        subscription_status: "active",
      },
    ]);

    const res = await POST(post({ newPlan: "starter" }));
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error?: string };
    expect(j.error).toMatch(/Ya estás en este plan|este plan/i);
    expect(fetch).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("upgrade → POST a Stripe con price_id del plan destino", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          stripe_subscription_id: "sub_upgrade",
          plan: "starter",
          subscription_status: "active",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: { data: [{ id: "si_item_1" }] },
            current_period_end: 1782854400,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ current_period_end: 1782854400 }), { status: 200 }),
      );

    const res = await POST(post({ newPlan: "pro" }));
    expect(res.status).toBe(200);
    const out = (await res.json()) as { success?: boolean; newPlan?: string };
    expect(out.success).toBe(true);
    expect(out.newPlan).toBe("pro");

    const updateCall = vi.mocked(fetch).mock.calls.find((c) => {
      const u = String(c[0]);
      return u.includes("/subscriptions/sub_upgrade") && (c[1] as RequestInit)?.method === "POST";
    });
    expect(updateCall).toBeDefined();
    const init = updateCall![1] as RequestInit;
    const body = new URLSearchParams(String(init.body));
    expect(body.get("items[0][price]")).toBe("price_pro_env");
    expect(body.get("proration_behavior")).toBe("always_invoice");
  });
});
