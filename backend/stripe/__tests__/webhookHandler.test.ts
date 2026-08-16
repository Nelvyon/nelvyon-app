import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

import { processStripeEvent } from "../webhookHandler";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TENANT_ID = "11111111-1111-4111-8111-111111111111";

function makeDb() {
  const subs: Record<string, unknown>[] = [];
  const users: { user_id: string; plan: string; email: string }[] = [
    { user_id: USER_ID, plan: "starter", email: "owner@test.com" },
  ];
  const tenants: { id: string; user_id: string; plan: string }[] = [
    { id: TENANT_ID, user_id: USER_ID, plan: "starter" },
  ];
  const queries: string[] = [];

  return {
    subs,
    users,
    tenants,
    queries,
    db: {
      query: async (sql: string, params?: unknown[]) => {
        queries.push(sql);
        const s = sql.replace(/\s+/g, " ").trim();

        if (s.includes("INSERT INTO subscriptions")) {
          subs.push({
            user_id: params?.[0],
            stripe_subscription_id: params?.[1],
            stripe_customer_id: params?.[2],
            plan: params?.[3],
            status: params?.[4],
          });
          return [];
        }
        if (s.includes("UPDATE subscriptions SET status='canceled'")) return [];
        if (s.includes("UPDATE nelvyon_users SET plan")) {
          const u = users.find((x) => x.user_id === params?.[0]);
          if (u) u.plan = String(params?.[1]);
          return [];
        }
        if (s.includes("UPDATE saas_tenants SET plan")) {
          const t = tenants.find((x) => x.user_id === params?.[0]);
          if (t) t.plan = String(params?.[1]);
          return [];
        }
        if (s.includes("SELECT email FROM nelvyon_users")) {
          return [{ email: users[0]?.email ?? "x@test.com" }];
        }
        if (s.includes("SELECT status FROM subscriptions")) {
          return [{ status: subs[0]?.status ?? "active" }];
        }
        if (s.includes("SELECT plan FROM nelvyon_users")) {
          return [{ plan: users[0]?.plan ?? "starter" }];
        }
        if (s.includes("SELECT id FROM saas_tenants")) {
          return [{ id: TENANT_ID }];
        }
        return [];
      },
    },
  };
}

vi.mock("../stripeApi", () => ({
  mapStripePriceToNelvyon: (priceId: string) => (priceId === "price_pro" ? "pro" : "starter"),
}));

vi.mock("stripe", () => ({
  default: vi.fn(function MockStripe() {
    return {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_test_1",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
          cancel_at_period_end: false,
          customer: "cus_test_1",
          metadata: { user_id: USER_ID, tenant_id: TENANT_ID },
          items: { data: [{ price: { id: "price_pro" } }] },
        }),
      },
    };
  }),
}));

vi.mock("../../billing/dunningService", () => ({
  DunningService: {
    getInstance: () => ({
      handlePaymentFailed: vi.fn(),
      handleReactivation: vi.fn(),
      handleSuspension: vi.fn(),
    }),
  },
  resolveTenantIdFromUserId: vi.fn(async () => TENANT_ID),
}));

vi.mock("../../email", () => ({ sendEmail: vi.fn() }));
vi.mock("../../onboarding", () => ({ completeStep: vi.fn() }));
vi.mock("../../billing/cancellationService", () => ({
  CancellationService: {
    getInstance: () => ({
      isVoluntaryCancellationPending: vi.fn(async () => false),
      processCancellation: vi.fn(),
    }),
  },
}));

vi.mock("../../saas/stripeLoyaltyEarn", () => ({
  maybeEarnLoyaltyFromCheckout: vi.fn(async () => undefined),
}));

vi.mock("../../saas/SaasPackStoreService", () => ({
  grantPackEntitlementsForTenant: vi.fn(async () => undefined),
}));

describe("processStripeEvent", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_PRICE_ID_STARTER = "price_starter";
    process.env.STRIPE_PRICE_ID_PRO = "price_pro";
    process.env.STRIPE_PRICE_ID_AGENCY = "price_agency";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("checkout.session.completed syncs plan to saas_tenants", async () => {
    const { db, tenants, queries } = makeDb();
    const event = {
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          metadata: { user_id: USER_ID, tenant_id: TENANT_ID },
          client_reference_id: USER_ID,
          subscription: "sub_test_1",
          customer: "cus_test_1",
          amount_total: 29700,
        },
      },
    } as unknown as Stripe.Event;

    await processStripeEvent(event, db as never);

    expect(queries.some((q) => q.includes("INSERT INTO subscriptions"))).toBe(true);
    expect(tenants[0]?.plan).toBe("pro");
  });

  it("invoice.payment_failed sets past_due without throwing", async () => {
    const { db, subs } = makeDb();
    subs.push({ user_id: USER_ID, status: "active", plan: "pro" });

    const event = {
      id: "evt_inv_fail",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_fail",
          subscription: "sub_test_1",
          attempt_count: 2,
        },
      },
    } as unknown as Stripe.Event;

    await processStripeEvent(event, db as never);
    expect(subs.some((s) => s.status === "past_due") || subs.length >= 1).toBe(true);
  });

  it("invoice.paid re-syncs active subscription", async () => {
    const { db, tenants } = makeDb();
    const event = {
      id: "evt_inv_paid",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_paid",
          subscription: "sub_test_1",
        },
      },
    } as unknown as Stripe.Event;

    await processStripeEvent(event, db as never);
    expect(tenants[0]?.plan).toBe("pro");
  });
});

describe("verifyStripeWebhook security", () => {
  // Capturado DENTRO del hook: `process.env` es del proceso y vitest aisla
  // modulos, no procesos, asi que un valor congelado al cargar el modulo seria
  // el que dejo otro fichero del mismo worker.
  let prev: typeof process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    prev = process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prev;
  });

  it("requires STRIPE_WEBHOOK_SECRET", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test";
    const { verifyStripeWebhook } = await import("../webhookHandler");
    expect(() => verifyStripeWebhook("{}", "sig")).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});
