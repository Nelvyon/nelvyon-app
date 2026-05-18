import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const handlePaymentFailedMock = vi.fn().mockResolvedValue(undefined);
const handleReactivationMock = vi.fn().mockResolvedValue(undefined);
const handleSuspensionMock = vi.fn().mockResolvedValue(undefined);
const processCancellationMock = vi.fn().mockResolvedValue(undefined);
const isVoluntaryCancellationPendingMock = vi.fn().mockResolvedValue(false);
const sendEmailMock = vi.fn().mockResolvedValue(undefined);
const completeStepMock = vi.fn().mockResolvedValue(undefined);
const constructEventMock = vi.fn();
const retrieveSubscriptionMock = vi.fn();

vi.mock("../../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

vi.mock("../../../billing/dunningService", () => ({
  DunningService: {
    getInstance: () => ({
      handlePaymentFailed: handlePaymentFailedMock,
      handleReactivation: handleReactivationMock,
      handleSuspension: handleSuspensionMock,
    }),
  },
  resolveTenantIdFromUserId: vi.fn().mockResolvedValue("tenant-1"),
}));

vi.mock("../../../billing/cancellationService", () => ({
  CancellationService: {
    getInstance: () => ({
      isVoluntaryCancellationPending: isVoluntaryCancellationPendingMock,
      processCancellation: processCancellationMock,
    }),
  },
}));

vi.mock("../../../email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("../../../onboarding", () => ({
  completeStep: (...args: unknown[]) => completeStepMock(...args),
}));

vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => retrieveSubscriptionMock(...args) },
  })),
}));

import { handleStripeWebhook } from "../../../stripe/webhookHandler";
import { mapStripePriceToNelvyon } from "../../../stripe/stripeApi";

describe("flow: billing — suscripción → webhook Stripe → dunning → cancelación", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.stubEnv("STRIPE_PRICE_ID_PRO", "price_pro");
    vi.stubEnv("STRIPE_PRICE_ID_AGENCY", "price_agency");
    queryMock.mockReset();
    constructEventMock.mockReset();
    retrieveSubscriptionMock.mockReset();
    handlePaymentFailedMock.mockClear();
    handleReactivationMock.mockClear();
    processCancellationMock.mockClear();
    sendEmailMock.mockClear();
    isVoluntaryCancellationPendingMock.mockResolvedValue(false);
    queryMock.mockResolvedValue([]);
    retrieveSubscriptionMock.mockResolvedValue({
      id: "sub_stripe_1",
      metadata: { user_id: "user-1" },
      items: { data: [{ price: { id: "price_pro" } }] },
      current_period_end: Math.floor(new Date("2026-06-01").getTime() / 1000),
      cancel_at_period_end: false,
      status: "active",
      customer: "cus_1",
    });
  });

  it("webhook checkout.session.completed actualiza plan en DB", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_stripe_1",
          customer: "cus_1",
          metadata: { user_id: "user-1" },
          client_reference_id: "user-1",
        },
      },
    });

    queryMock
      .mockResolvedValueOnce([{ plan: "free" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: "a@test.com" }]);

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    const upsert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO subscriptions"));
    expect(upsert).toBeDefined();
    expect(upsert![1]).toEqual(
      expect.arrayContaining(["user-1", "sub_stripe_1", "cus_1", mapStripePriceToNelvyon("price_pro")]),
    );
    expect(sendEmailMock).toHaveBeenCalledWith("plan_activated", expect.any(Object));
  });

  it("webhook customer.subscription.updated refleja nuevo plan", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_sub_upd",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_stripe_1",
          metadata: { user_id: "user-1" },
          customer: "cus_1",
          items: { data: [{ price: { id: "price_agency" } }] },
          current_period_end: Math.floor(new Date("2026-06-01").getTime() / 1000),
          cancel_at_period_end: false,
          status: "active",
        },
      },
    });

    queryMock
      .mockResolvedValueOnce([{ plan: "pro" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: "a@test.com" }]);

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    const upsert = queryMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO subscriptions"));
    expect(upsert![1]).toEqual(expect.arrayContaining([mapStripePriceToNelvyon("price_agency")]));
  });

  it("webhook customer.subscription.deleted marca cancelled", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_sub_del",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_stripe_1",
          metadata: { user_id: "user-1" },
          current_period_end: Math.floor(new Date("2026-06-01").getTime() / 1000),
        },
      },
    });

    queryMock.mockResolvedValueOnce([{ status: "active" }]);

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("status='canceled'"),
      ["user-1"],
    );
  });

  it("webhook invoice.payment_failed activa dunning past_due", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_inv_fail",
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: "sub_stripe_1",
          attempt_count: 1,
        },
      },
    });

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    expect(handlePaymentFailedMock).toHaveBeenCalledWith("tenant-1", "sub_stripe_1", 1, "evt_inv_fail");
  });

  it("webhook tras suspensión reactiva vía handleReactivation", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_react",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_stripe_1",
          metadata: { user_id: "user-1" },
          customer: "cus_1",
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_end: Math.floor(new Date("2026-06-01").getTime() / 1000),
          cancel_at_period_end: false,
          status: "active",
        },
      },
    });

    queryMock.mockResolvedValueOnce([{ plan: "suspended" }]).mockResolvedValueOnce([]);

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    expect(handleReactivationMock).toHaveBeenCalledWith("tenant-1", "sub_stripe_1");
  });

  it("cancelación voluntaria ejecuta processCancellation", async () => {
    isVoluntaryCancellationPendingMock.mockResolvedValueOnce(true);
    constructEventMock.mockReturnValue({
      id: "evt_cancel_vol",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_stripe_1",
          metadata: { user_id: "user-1" },
          current_period_end: Math.floor(new Date("2026-06-01").getTime() / 1000),
        },
      },
    });
    queryMock.mockResolvedValueOnce([{ status: "active" }]);

    await handleStripeWebhook("{}", "sig", { query: queryMock } as never);

    expect(processCancellationMock).toHaveBeenCalledWith("user-1");
  });
});
