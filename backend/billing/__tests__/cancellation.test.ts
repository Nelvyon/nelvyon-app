// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const sendMock = vi.fn().mockResolvedValue({});
const scheduleCancelMock = vi.fn();
const removeScheduleMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: sendMock }),
}));

vi.mock("../../stripe/stripeApi", () => ({
  scheduleSubscriptionCancelAtPeriodEnd: (...args: unknown[]) => scheduleCancelMock(...args),
  removeScheduledSubscriptionChange: (...args: unknown[]) => removeScheduleMock(...args),
}));

import { CancellationService } from "../cancellationService";

describe("CancellationService", () => {
  let service: CancellationService;

  beforeEach(() => {
    queryMock.mockReset();
    sendMock.mockClear();
    scheduleCancelMock.mockReset();
    removeScheduleMock.mockReset();
    scheduleCancelMock.mockResolvedValue({
      currentBillingPeriod: { endsAt: "2026-06-15T00:00:00.000Z" },
    });
    removeScheduleMock.mockResolvedValue(undefined);
    service = new CancellationService({ query: queryMock } as never);
  });

  it("initiateCancellation llama Stripe y guarda en BD", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          user_id: "u-1",
          email: "a@test.com",
          full_name: "Ana",
          plan: "pro",
          stripe_subscription_id: "sub_123",
          subscription_status: "active",
          current_period_end: null,
          cancel_at_period_end: false,
          period_end_date: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.initiateCancellation("u-1", "precio", "muy caro");

    expect(scheduleCancelMock).toHaveBeenCalledWith("sub_123");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("cancel_at_period_end = true"),
      expect.arrayContaining(["u-1", "precio", "muy caro"]),
    );
    expect(result.periodEnd).toBeInstanceOf(Date);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("processCancellation degrada plan a free", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          user_id: "u-1",
          email: "a@test.com",
          full_name: "Ana",
          plan: "pro",
          stripe_subscription_id: "sub_123",
          subscription_status: "active",
          current_period_end: null,
          cancel_at_period_end: true,
          period_end_date: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.processCancellation("u-1");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("plan = 'free'"),
      expect.arrayContaining(["u-1"]),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("scheduled_deletion_at"),
      expect.any(Array),
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("reactivateSubscription limpia cancel_at_period_end", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          user_id: "u-1",
          email: "a@test.com",
          full_name: "Ana",
          plan: "pro",
          stripe_subscription_id: "sub_123",
          subscription_status: "active",
          current_period_end: null,
          cancel_at_period_end: true,
          period_end_date: "2026-06-15T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.reactivateSubscription("u-1");

    expect(removeScheduleMock).toHaveBeenCalledWith("sub_123");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("cancel_at_period_end = false"),
      ["u-1"],
    );
  });
});
