import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { billingApi } from "@/features/billing/api";

describe("billing upgrade API contracts", () => {
  it("loads plans from payment endpoint", async () => {
    getMock.mockResolvedValue({ plans: [] });
    await billingApi.plans();
    expect(getMock).toHaveBeenCalledWith("/api/v1/payment/plans");
  });

  it("creates checkout session with tenant scope", async () => {
    postMock.mockResolvedValue({ session_id: "cs_1", url: "https://example.test" });
    await billingApi.createPaymentSession({
      plan_id: "pro",
      billing_cycle: "monthly",
      success_url: "/billing/upgrade?checkout=success",
      cancel_url: "/billing/upgrade?checkout=cancelled",
    });
    expect(postMock).toHaveBeenCalledWith(
      "/api/v1/payment/create_payment_session",
      expect.objectContaining({ tenantScoped: true }),
    );
  });

  it("verifies payment with session id and tenant scope", async () => {
    postMock.mockResolvedValue({ status: "paid", payment_status: "paid" });
    await billingApi.verifyPayment("cs_test");
    expect(postMock).toHaveBeenCalledWith(
      "/api/v1/payment/verify_payment",
      expect.objectContaining({ tenantScoped: true, body: { session_id: "cs_test" } }),
    );
  });
});
