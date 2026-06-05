import { afterEach, describe, expect, it, vi } from "vitest";

import { saasDealsApi } from "../api";

describe("saasDealsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists deals from official SaaS API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ deals: [], total: 0 }), { status: 200 }),
    );

    await saasDealsApi.list({ open_only: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/saas/deals?open_only=true",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("changes deal stage via dedicated endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ deal: { id: "d1", stage: "won" } }), { status: 200 }),
    );

    await saasDealsApi.changeStage("d1", "won", 100);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/saas/deals/d1/stage",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ stage: "won", probability: 100 }),
      }),
    );
  });

  it("loads contact detail with dealsContext", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          contact: { id: "c1", name: "Acme" },
          dealsContext: { deals: [], dealCount: 0, totalValue: 0, primaryStage: null, recentActivities: [] },
        }),
        { status: 200 },
      ),
    );

    const res = await saasDealsApi.getContactDetail("c1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/saas/crm/contacts/c1",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(res.dealsContext?.dealCount).toBe(0);
  });
});
