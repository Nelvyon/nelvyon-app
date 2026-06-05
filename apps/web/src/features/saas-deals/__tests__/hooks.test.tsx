import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { saasDealsApi } from "../api";
import { saasDealsQueryKeys, useChangeDealStage } from "../hooks";
import type { DealListResponse } from "../types";

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useChangeDealStage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("optimistically updates list cache and reverts on API error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const listKey = saasDealsQueryKeys.list({});
    const initial: DealListResponse = {
      total: 1,
      deals: [
        {
          id: "d1",
          tenantId: "t1",
          contactId: null,
          title: "Deal",
          value: 100,
          currency: "EUR",
          stage: "new",
          probability: 10,
          expectedCloseDate: null,
          source: null,
          ownerUserId: null,
          notes: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    };
    queryClient.setQueryData(listKey, initial);

    vi.spyOn(saasDealsApi, "changeStage").mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChangeDealStage(), { wrapper: wrapper(queryClient) });

    await expect(result.current.mutateAsync({ dealId: "d1", stage: "contacted" })).rejects.toThrow("Network error");

    await waitFor(() => {
      const cached = queryClient.getQueryData<DealListResponse>(listKey);
      expect(cached?.deals[0]?.stage).toBe("new");
    });
  });

  it("calls changeStage API on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const changeStage = vi.spyOn(saasDealsApi, "changeStage").mockResolvedValue({
      deal: {
        id: "d1",
        tenantId: "t1",
        contactId: null,
        title: "Deal",
        value: 100,
        currency: "EUR",
        stage: "won",
        probability: 100,
        expectedCloseDate: null,
        source: null,
        ownerUserId: null,
        notes: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    });

    const { result } = renderHook(() => useChangeDealStage(), { wrapper: wrapper(queryClient) });
    await result.current.mutateAsync({ dealId: "d1", stage: "won" });

    expect(changeStage).toHaveBeenCalledWith("d1", "won", undefined);
  });
});
