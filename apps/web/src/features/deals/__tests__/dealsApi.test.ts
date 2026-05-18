import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}));

import { dealsApi } from "@/features/deals/api";

describe("dealsApi", () => {
  it("lists deals with tenant scope", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 });
    await dealsApi.list({ stage: "lead" });
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/entities/deals?"),
      expect.objectContaining({ tenantScoped: true }),
    );
  });

  it("includes client_id in list query when filtering by client", async () => {
    getMock.mockClear();
    getMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 });
    await dealsApi.list({ clientId: 12 });
    const url = String(getMock.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("query=");
    const queryParam = new URL(url, "http://example.test").searchParams.get("query");
    expect(queryParam).toBeTruthy();
    expect(JSON.parse(decodeURIComponent(queryParam!))).toEqual({ client_id: 12 });
  });

  it("creates follow-up activity scoped to deal", async () => {
    postMock.mockResolvedValue({ id: 1 });
    await dealsApi.createFollowUp(9, { title: "Call back" });
    expect(postMock).toHaveBeenCalledWith(
      "/api/v1/entities/activities",
      expect.objectContaining({
        tenantScoped: true,
        body: expect.objectContaining({ deal_id: 9, type: "follow_up", title: "Call back" }),
      }),
    );
  });
});
