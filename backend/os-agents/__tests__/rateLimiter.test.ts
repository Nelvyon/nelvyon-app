// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

import { RateLimitExceededError, enforceRateLimit } from "../../usage";

describe("rateLimiter", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("no lanza error cuando no se ha alcanzado el límite", async () => {
    queryMock
      .mockResolvedValueOnce([{ plan: "pro" }])
      .mockResolvedValueOnce([{ monthly_calls: 2000 }])
      .mockResolvedValueOnce([{ count: "150" }]);
    await expect(enforceRateLimit("user-1")).resolves.toBeUndefined();
  });

  it("lanza RateLimitExceededError cuando se alcanza el límite", async () => {
    queryMock
      .mockResolvedValueOnce([{ plan: "free" }])
      .mockResolvedValueOnce([{ monthly_calls: 10 }])
      .mockResolvedValueOnce([{ count: "10" }])
      .mockResolvedValueOnce([{ plan: "free" }])
      .mockResolvedValueOnce([{ monthly_calls: 10 }]);
    await expect(enforceRateLimit("user-1")).rejects.toThrow(RateLimitExceededError);
  });

  it("RateLimitExceededError tiene plan y limit correctos", async () => {
    queryMock
      .mockResolvedValueOnce([{ plan: "starter" }])
      .mockResolvedValueOnce([{ monthly_calls: 500 }])
      .mockResolvedValueOnce([{ count: "500" }])
      .mockResolvedValueOnce([{ plan: "starter" }])
      .mockResolvedValueOnce([{ monthly_calls: 500 }]);
    try {
      await enforceRateLimit("user-1");
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitExceededError);
      expect((err as RateLimitExceededError).plan).toBe("starter");
      expect((err as RateLimitExceededError).limit).toBe(500);
    }
  });
});
