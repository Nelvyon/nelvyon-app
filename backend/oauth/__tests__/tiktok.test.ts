import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TikTokOAuthProvider } from "../TikTokOAuthProvider";

const fetchMock = vi.fn();

describe("TikTokOAuthProvider", () => {
  beforeEach(() => {
    process.env.TIKTOK_APP_ID = "test-tiktok-app-id";
    process.env.TIKTOK_APP_SECRET = "test-tiktok-secret";
    process.env.TIKTOK_REDIRECT_URI = "https://nelvyon.com/api/oauth/tiktok/callback";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAuthUrl contiene tiktok.com y los scopes", () => {
    const url = new TikTokOAuthProvider().getAuthUrl("state-abc");
    expect(url).toContain("tiktok.com");
    expect(url).toContain("tt.advertiser.read");
    expect(url).toContain("tt.advertiser.management");
    expect(url).toContain("state=state-abc");
    expect(url).toContain("app_id=test-tiktok-app-id");
  });

  it("exchangeCode obtiene token y datos del anunciante", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          access_token: "tiktok-access-token",
          expires_in: 86400,
          advertiser_ids: ["adv-123"],
          display_name: "TikTok Advertiser",
        },
      }),
    });

    const result = await new TikTokOAuthProvider().exchangeCode("auth-code");

    expect(result.accessToken).toBe("tiktok-access-token");
    expect(result.accountId).toBe("adv-123");
    expect(result.accountName).toBe("TikTok Advertiser");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [callUrl, init] = fetchMock.mock.calls[0]!;
    expect(String(callUrl)).toContain("business-api.tiktok.com");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    const body = JSON.parse(String(init?.body)) as {
      app_id: string;
      secret: string;
      auth_code: string;
    };
    expect(body.app_id).toBe("test-tiktok-app-id");
    expect(body.secret).toBe("test-tiktok-secret");
    expect(body.auth_code).toBe("auth-code");
  });
});
