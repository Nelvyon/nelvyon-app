import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { AffiliateService } from "../../../affiliates/AffiliateService";

const profileRow = {
  id: "p1",
  user_id: "user-1",
  code: "NELA1B2C3D4",
  commission_rate: "20.00",
  status: "active" as const,
  total_clicks: 0,
  total_conversions: 0,
  total_earned: "0.00",
  pending_payout: "0.00",
  created_at: "2026-05-16T00:00:00.000Z",
  updated_at: "2026-05-16T00:00:00.000Z",
};

describe("flow: afiliados — registro → click → conversión → comisión", () => {
  beforeEach(() => {
    AffiliateService.reset();
    queryMock.mockReset();
  });

  it("getOrCreateProfile genera código único NEL*", async () => {
    queryMock.mockResolvedValueOnce([]);
    queryMock.mockResolvedValueOnce([{ ...profileRow, code: "NEL1234ABCD" }]);

    const profile = await AffiliateService.instance().getOrCreateProfile("user-new");
    expect(profile.code.startsWith("NEL")).toBe(true);
    expect(String(queryMock.mock.calls[1]![0])).toContain("INSERT INTO affiliate_profiles");
  });

  it("trackClick incrementa clicks en DB", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: "p1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await AffiliateService.instance().trackClick("NELTEST01", { ipHash: "abc" });

    expect(String(queryMock.mock.calls[2]![0])).toContain("total_clicks = total_clicks + 1");
  });

  it("trackClick código inactivo no hace nada", async () => {
    queryMock.mockResolvedValueOnce([]);
    await AffiliateService.instance().trackClick("NELBADCODE", {});
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("trackConversion 20% de 197 = 39.40", async () => {
    queryMock
      .mockResolvedValueOnce([{ commission_rate: "20.00" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await AffiliateService.instance().trackConversion("NELTEST01", {
      convertedUserId: "buyer-1",
      plan: "pro",
      amount: 197,
    });

    const insertArgs = queryMock.mock.calls[1]![1] as unknown[];
    expect(insertArgs[4]).toBe(39.4);
    const updateArgs = queryMock.mock.calls[2]![1] as unknown[];
    expect(updateArgs[1]).toBe(39.4);
  });

  it("trackConversion actualiza pending_payout", async () => {
    queryMock
      .mockResolvedValueOnce([{ commission_rate: "20.00" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await AffiliateService.instance().trackConversion("NELTEST01", {
      convertedUserId: "buyer-1",
      plan: "pro",
      amount: 100,
    });

    expect(String(queryMock.mock.calls[2]![0])).toContain("pending_payout = pending_payout +");
  });

  it("getStats devuelve link con código correcto", async () => {
    queryMock.mockResolvedValueOnce([profileRow]).mockResolvedValueOnce([]);

    const stats = await AffiliateService.instance().getStats("user-1");
    expect(stats.affiliateLink).toBe("https://nelvyon.com/?ref=NELA1B2C3D4");
    expect(stats.profile.code).toBe("NELA1B2C3D4");
  });
});
