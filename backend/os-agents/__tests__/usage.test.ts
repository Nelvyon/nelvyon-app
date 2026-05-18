// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

import { getUsageSummary, hasReachedLimit, trackUsage } from "../../usage";

describe("usage", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("trackUsage inserta evento", async () => {
    queryMock.mockResolvedValue([]);
    await trackUsage("user-1", "ads-google", "ads");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain("INSERT INTO usage_events");
  });

  it("getUsageSummary devuelve datos correctos", async () => {
    queryMock
      .mockResolvedValueOnce([{ plan: "pro" }])
      .mockResolvedValueOnce([{ monthly_calls: 2000 }])
      .mockResolvedValueOnce([{ count: "150" }]);
    const summary = await getUsageSummary("user-1");
    expect(summary.plan).toBe("pro");
    expect(summary.monthlyLimit).toBe(2000);
    expect(summary.usedThisMonth).toBe(150);
    expect(summary.percentUsed).toBe(8);
  });

  it("hasReachedLimit devuelve true cuando se supera el límite", async () => {
    queryMock
      .mockResolvedValueOnce([{ plan: "free" }])
      .mockResolvedValueOnce([{ monthly_calls: 10 }])
      .mockResolvedValueOnce([{ count: "10" }]);
    const reached = await hasReachedLimit("user-1");
    expect(reached).toBe(true);
  });
});
