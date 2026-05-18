import { fetchAuthMe, fetchWorkspaceList } from "@/core/auth/authApi";

describe("auth bridge api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /auth/me with Bearer token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "u1", email: "u@test.com", role: "user", workspace_memberships: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);
    await fetchAuthMe("abc.jwt");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/me"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer abc.jwt" }),
      }),
    );
  });

  it("calls /workspace/list with Bearer token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", mockFetch);
    await fetchWorkspaceList("xyz.jwt");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/workspace/list"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer xyz.jwt" }),
      }),
    );
  });
});
