import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MetaOAuthProvider } from "../MetaOAuthProvider";

const fetchMock = vi.fn();

describe("MetaOAuthProvider", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "test-app-id";
    process.env.META_APP_SECRET = "test-app-secret";
    process.env.META_REDIRECT_URI = "https://nelvyon.com/api/oauth/meta/callback";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAuthUrl contiene facebook.com y los scopes", () => {
    const url = new MetaOAuthProvider().getAuthUrl("state-xyz");
    expect(url).toContain("facebook.com");
    expect(url).toContain("ads_management");
    expect(url).toContain("ads_read");
    expect(url).toContain("state=state-xyz");
    expect(url).toContain("client_id=test-app-id");
  });

  it("exchangeCode obtiene token y perfil /me", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "short-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "meta-user-1", name: "Meta User", email: "meta@example.com" }),
      });

    const result = await new MetaOAuthProvider().exchangeCode("auth-code");

    expect(result.accessToken).toBe("short-token");
    expect(result.accountId).toBe("meta-user-1");
    expect(result.accountName).toBe("Meta User");
    expect(fetchMock.mock.calls[0]![0]).toContain("graph.facebook.com");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/oauth/access_token");
    expect(fetchMock.mock.calls[1]![0]).toContain("/me?");
  });

  it("getLongLivedToken intercambia token con expiresAt ~60 días", async () => {
    const before = Date.now();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "long-lived-token" }),
    });

    const result = await new MetaOAuthProvider().getLongLivedToken("short-token");

    expect(result.accessToken).toBe("long-lived-token");
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const diff = result.expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(sixtyDaysMs - 5000);
    expect(diff).toBeLessThanOrEqual(sixtyDaysMs + 5000);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("grant_type=fb_exchange_token");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("fb_exchange_token=short-token");
  });
});
