import { describe, expect, it } from "vitest";

import { fetchNelvyonAuthMe, fetchNelvyonTokenFromCookie } from "@/core/auth/authApi";

describe("nelvyon auth api helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchNelvyonAuthMe calls same-origin /api/auth/me with Bearer", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "u1",
        email: "u@test.com",
        tenantId: "t1",
        plan: "free",
        fullName: "Test",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const me = await fetchNelvyonAuthMe("abc.jwt");
    expect(me.userId).toBe("u1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer abc.jwt" }),
        credentials: "same-origin",
      }),
    );
  });

  it("fetchNelvyonTokenFromCookie reads /api/auth/token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tok" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(fetchNelvyonTokenFromCookie()).resolves.toBe("tok");
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/token", expect.objectContaining({ credentials: "same-origin" }));
  });
});
