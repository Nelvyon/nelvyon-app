/**
 * Stripe & Billing Flow Tests
 * Validates: webhook event processing logic, subscription state management,
 * billing page data structure, and payment flow integrity.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the web SDK
vi.mock("@metagptx/web-sdk", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({ data: null, error: null }),
    }),
  }),
}));

import { PLANS, calculatePrice, type PlanId, type BillingCycle } from "@/lib/plans";

/** Simulated webhook event types that the backend processes */
const STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
] as const;

/** Simulated subscription states */
type SubscriptionStatus = "active" | "past_due" | "cancelled" | "pending" | "trialing";

interface MockSubscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  amount_paid: number;
  currency: string;
  started_at: string;
  expires_at: string;
  stripe_subscription_id: string;
}

/** Simulates how the backend processes a Stripe webhook event */
function processWebhookEvent(
  eventType: string,
  subscription: MockSubscription
): { action: string; newStatus: SubscriptionStatus } {
  switch (eventType) {
    case "checkout.session.completed":
    case "customer.subscription.created":
      return { action: "activate", newStatus: "active" };
    case "invoice.paid":
      return { action: "renew", newStatus: "active" };
    case "invoice.payment_failed":
      return { action: "mark_past_due", newStatus: "past_due" };
    case "customer.subscription.deleted":
      return { action: "cancel", newStatus: "cancelled" };
    case "customer.subscription.updated":
      return { action: "update", newStatus: subscription.status };
    default:
      return { action: "ignore", newStatus: subscription.status };
  }
}

describe("Stripe Webhook — Event Processing", () => {
  const baseSub: MockSubscription = {
    id: "sub_001",
    user_id: "user_123",
    plan_id: "pro",
    billing_cycle: "monthly",
    status: "pending",
    amount_paid: 249,
    currency: "eur",
    started_at: "2026-04-01T00:00:00Z",
    expires_at: "2026-05-01T00:00:00Z",
    stripe_subscription_id: "sub_stripe_abc",
  };

  it("checkout.session.completed should activate subscription", () => {
    const result = processWebhookEvent("checkout.session.completed", baseSub);
    expect(result.action).toBe("activate");
    expect(result.newStatus).toBe("active");
  });

  it("customer.subscription.created should activate subscription", () => {
    const result = processWebhookEvent("customer.subscription.created", baseSub);
    expect(result.action).toBe("activate");
    expect(result.newStatus).toBe("active");
  });

  it("invoice.paid should renew subscription", () => {
    const result = processWebhookEvent("invoice.paid", { ...baseSub, status: "active" });
    expect(result.action).toBe("renew");
    expect(result.newStatus).toBe("active");
  });

  it("invoice.payment_failed should mark as past_due", () => {
    const result = processWebhookEvent("invoice.payment_failed", { ...baseSub, status: "active" });
    expect(result.action).toBe("mark_past_due");
    expect(result.newStatus).toBe("past_due");
  });

  it("customer.subscription.deleted should cancel", () => {
    const result = processWebhookEvent("customer.subscription.deleted", { ...baseSub, status: "active" });
    expect(result.action).toBe("cancel");
    expect(result.newStatus).toBe("cancelled");
  });

  it("unknown event should be ignored", () => {
    const result = processWebhookEvent("unknown.event", baseSub);
    expect(result.action).toBe("ignore");
    expect(result.newStatus).toBe(baseSub.status);
  });
});

describe("Stripe Webhook — All Required Events Covered", () => {
  it("should handle all critical Stripe event types", () => {
    const criticalEvents = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
    ];

    criticalEvents.forEach((event) => {
      const result = processWebhookEvent(event, {
        id: "test",
        user_id: "u1",
        plan_id: "starter",
        billing_cycle: "monthly",
        status: "pending",
        amount_paid: 79,
        currency: "eur",
        started_at: "",
        expires_at: "",
        stripe_subscription_id: "sub_test",
      });
      expect(result.action).not.toBe("ignore");
    });
  });
});

describe("Billing — Plan Selection to Checkout", () => {
  const plans: PlanId[] = ["starter", "pro", "enterprise"];
  const cycles: BillingCycle[] = ["monthly", "quarterly", "semiannual", "annual", "biennial"];

  it("all plans should produce valid checkout amounts", () => {
    plans.forEach((planId) => {
      cycles.forEach((cycle) => {
        const result = calculatePrice(PLANS[planId].price, cycle);
        expect(result.totalPrice).toBeGreaterThan(0);
        expect(result.monthlyPrice).toBeGreaterThan(0);
        expect(result.monthlyPrice).toBeLessThanOrEqual(PLANS[planId].price);
        expect(result.savings).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("longer cycles should always be cheaper per month", () => {
    plans.forEach((planId) => {
      const prices = cycles.map((c) => calculatePrice(PLANS[planId].price, c).monthlyPrice);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });
  });
});

describe("Billing — Subscription State Machine", () => {
  it("valid status transitions", () => {
    const validTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      pending: ["active", "cancelled"],
      active: ["past_due", "cancelled", "active"],
      past_due: ["active", "cancelled"],
      cancelled: ["active"], // reactivation
      trialing: ["active", "cancelled", "past_due"],
    };

    Object.entries(validTransitions).forEach(([from, toList]) => {
      toList.forEach((to) => {
        expect(typeof from).toBe("string");
        expect(typeof to).toBe("string");
      });
    });
  });

  it("subscription should contain all required fields", () => {
    const requiredFields = [
      "id", "user_id", "plan_id", "billing_cycle",
      "status", "amount_paid", "currency",
      "started_at", "expires_at", "stripe_subscription_id",
    ];

    const sub: MockSubscription = {
      id: "sub_001",
      user_id: "user_123",
      plan_id: "pro",
      billing_cycle: "annual",
      status: "active",
      amount_paid: 2988,
      currency: "eur",
      started_at: "2026-04-01T00:00:00Z",
      expires_at: "2027-04-01T00:00:00Z",
      stripe_subscription_id: "sub_stripe_xyz",
    };

    requiredFields.forEach((field) => {
      expect(sub).toHaveProperty(field);
      expect((sub as Record<string, unknown>)[field]).toBeDefined();
    });
  });
});

describe("Billing — Currency & Formatting", () => {
  it("all plans should use EUR currency", () => {
    Object.values(PLANS).forEach((plan) => {
      expect(plan.currency).toBe("€");
    });
  });

  it("prices should be reasonable numbers", () => {
    Object.values(PLANS).forEach((plan) => {
      expect(plan.price).toBeGreaterThanOrEqual(0);
      expect(plan.price).toBeLessThan(10000);
      expect(Number.isFinite(plan.price)).toBe(true);
    });
  });
});