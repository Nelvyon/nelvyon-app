// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

import {
  discountedMonthlyPrice,
  EarlyAdopterService,
} from "../earlyAdopterService";

describe("EarlyAdopterService", () => {
  let service: EarlyAdopterService;

  beforeEach(() => {
    queryMock.mockReset();
    service = new EarlyAdopterService({ query: queryMock } as never);
    delete process.env.STRIPE_EARLY_ADOPTER_COUPON_ID;
    delete process.env.PADDLE_EARLY_ADOPTER_DISCOUNT_CODE;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isEarlyAdopterActive devuelve true con cupos y fecha futura", async () => {
    queryMock.mockResolvedValueOnce([
      {
        enabled: true,
        max_slots: 200,
        used_slots: 10,
        discount_pct: 40,
        expires_at: "2099-01-01T00:00:00.000Z",
      },
    ]);

    await expect(service.isEarlyAdopterActive()).resolves.toBe(true);
  });

  it("isEarlyAdopterActive devuelve false cuando no quedan cupos", async () => {
    queryMock.mockResolvedValueOnce([
      {
        enabled: true,
        max_slots: 200,
        used_slots: 200,
        discount_pct: 40,
        expires_at: "2099-01-01T00:00:00.000Z",
      },
    ]);

    await expect(service.isEarlyAdopterActive()).resolves.toBe(false);
  });

  it("getEarlyAdopterStatus calcula slotsLeft", async () => {
    queryMock.mockResolvedValueOnce([
      {
        enabled: true,
        max_slots: 200,
        used_slots: 50,
        discount_pct: 40,
        expires_at: "2099-06-01T12:00:00.000Z",
      },
    ]);

    const status = await service.getEarlyAdopterStatus();
    expect(status.active).toBe(true);
    expect(status.slotsLeft).toBe(150);
    expect(status.discountPct).toBe(40);
  });

  it("claimEarlyAdopterSlot reserva plaza y devuelve discount code", async () => {
    process.env.STRIPE_EARLY_ADOPTER_COUPON_ID = "coupon_early40";

    queryMock
      .mockResolvedValueOnce([
        {
          enabled: true,
          max_slots: 200,
          used_slots: 1,
          discount_pct: 40,
          expires_at: "2099-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ is_early_adopter: false }])
      .mockResolvedValueOnce([{ used_slots: 2 }])
      .mockResolvedValueOnce([]);

    const result = await service.claimEarlyAdopterSlot("user-1");
    expect(result).toEqual({ claimed: true, discountCode: "coupon_early40" });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE nelvyon_users SET is_early_adopter = true"),
      ["user-1"],
    );
  });

  it("claimEarlyAdopterSlot idempotente si el usuario ya es early adopter", async () => {
    process.env.STRIPE_EARLY_ADOPTER_COUPON_ID = "coupon_early40";

    queryMock
      .mockResolvedValueOnce([
        {
          enabled: true,
          max_slots: 200,
          used_slots: 1,
          discount_pct: 40,
          expires_at: "2099-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ is_early_adopter: true }]);

    const result = await service.claimEarlyAdopterSlot("user-1");
    expect(result).toEqual({ claimed: true, discountCode: "coupon_early40" });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("claimEarlyAdopterSlot falla si no hay cupos", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          enabled: true,
          max_slots: 200,
          used_slots: 200,
          discount_pct: 40,
          expires_at: "2099-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ is_early_adopter: false }]);

    const result = await service.claimEarlyAdopterSlot("user-1");
    expect(result).toEqual({ claimed: false, discountCode: null });
  });
});

describe("discountedMonthlyPrice", () => {
  it("aplica 40% de descuento a precios de planes", () => {
    expect(discountedMonthlyPrice(47, 40)).toBe(28);
    expect(discountedMonthlyPrice(197, 40)).toBe(118);
    expect(discountedMonthlyPrice(497, 40)).toBe(298);
  });
});
