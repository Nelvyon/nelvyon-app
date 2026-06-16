import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { buildPortalInviteUrl, osPortalApi } from "@/features/os-shell/portal/api";

describe("osPortalApi", () => {
  it("creates invite with tenant scope", async () => {
    postMock.mockResolvedValue({ invite_id: "i1", token: "tok", email: "a@b.com" });
    await osPortalApi.createInvite({ client_id: "c1", email: "a@b.com" });
    expect(postMock).toHaveBeenCalledWith("/api/platform/portal/invites", {
      body: { client_id: "c1", email: "a@b.com" },
      tenantScoped: true,
    });
  });

  it("lists invites by client", async () => {
    getMock.mockResolvedValue({ items: [], total: 0 });
    await osPortalApi.listInvites("c1");
    expect(getMock).toHaveBeenCalledWith("/api/platform/portal/invites?client_id=c1", {
      tenantScoped: true,
    });
  });

  it("builds accept-invite url", () => {
    expect(buildPortalInviteUrl("abc", "https://app.test")).toBe(
      "https://app.test/client/accept-invite?token=abc",
    );
  });
});
