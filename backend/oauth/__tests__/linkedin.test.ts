import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LinkedInOAuthProvider } from "../LinkedInOAuthProvider";

const fetchMock = vi.fn();

describe("LinkedInOAuthProvider", () => {
  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = "test-linkedin-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "test-linkedin-secret";
    process.env.LINKEDIN_REDIRECT_URI = "https://nelvyon.com/api/oauth/linkedin/callback";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAuthUrl contiene linkedin.com y los scopes", () => {
    const url = new LinkedInOAuthProvider().getAuthUrl("state-li");
    expect(url).toContain("linkedin.com");
    expect(url).toContain("r_ads");
    expect(url).toContain("rw_ads");
    expect(url).toContain("state=state-li");
    expect(url).toContain("client_id=test-linkedin-client-id");
  });

  it("exchangeCode obtiene token y userinfo", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "li-access",
          refresh_token: "li-refresh",
          expires_in: 3600,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: "linkedin-user-1",
          name: "LinkedIn User",
          email: "li@example.com",
        }),
      });

    const result = await new LinkedInOAuthProvider().exchangeCode("auth-code");

    expect(result.accessToken).toBe("li-access");
    expect(result.refreshToken).toBe("li-refresh");
    expect(result.accountId).toBe("linkedin-user-1");
    expect(result.accountName).toBe("LinkedIn User");
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/oauth/v2/accessToken");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("/v2/userinfo");
    const init = fetchMock.mock.calls[1]![1] as { headers?: Record<string, string> };
    expect(init?.headers?.Authorization).toBe("Bearer li-access");
  });

  it("refreshAccessToken intercambia refresh token", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "li-access-new",
        expires_in: 7200,
      }),
    });

    const result = await new LinkedInOAuthProvider().refreshAccessToken("li-refresh");

    expect(result.accessToken).toBe("li-access-new");
    const init = fetchMock.mock.calls[0]![1] as { method?: string; body?: string };
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("grant_type=refresh_token");
    expect(String(init?.body)).toContain("refresh_token=li-refresh");
  });
});
