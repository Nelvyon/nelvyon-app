import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { portalApi } from "@/features/client_portal_v1/api";

describe("portalApi", () => {
  it("login without tenant scope", async () => {
    postMock.mockResolvedValue({ access_token: "t", user: {} });
    await portalApi.login({ email: "a@b.com", password: "secret" });
    expect(postMock).toHaveBeenCalledWith(
      "/api/platform/portal/auth/login",
      expect.objectContaining({ tenantScoped: false, body: { email: "a@b.com", password: "secret" } }),
    );
  });

  it("lists deliverables with optional project filter", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });
    await portalApi.listDeliverables({ project_id: "uuid-1" });
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/platform/portal/deliverables?"),
      expect.objectContaining({ tenantScoped: false }),
    );
    const url = String(getMock.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("project_id=uuid-1");
  });

  it("rejects deliverable with feedback body", async () => {
    postMock.mockResolvedValue({ id: "d1", status: "changes_requested" });
    await portalApi.rejectDeliverable("d1", "Please revise");
    expect(postMock).toHaveBeenCalledWith(
      "/api/platform/portal/deliverables/d1/reject",
      expect.objectContaining({
        tenantScoped: false,
        body: { feedback: "Please revise" },
      }),
    );
  });
});
