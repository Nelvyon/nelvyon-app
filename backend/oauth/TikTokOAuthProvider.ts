function tiktokAppId(): string {
  return process.env.TIKTOK_APP_ID ?? "";
}

function tiktokAppSecret(): string {
  return process.env.TIKTOK_APP_SECRET ?? "";
}

function tiktokRedirectUri(): string {
  return process.env.TIKTOK_REDIRECT_URI ?? "https://nelvyon.com/api/oauth/tiktok/callback";
}

const AUTH_URL = "https://ads.tiktok.com/marketing_api/auth";
const TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";

export class TikTokOAuthProvider {
  static readonly SCOPES = ["tt.advertiser.read", "tt.advertiser.management"] as const;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      app_id: tiktokAppId(),
      redirect_uri: tiktokRedirectUri(),
      response_type: "code",
      scope: TikTokOAuthProvider.SCOPES.join(","),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    expiresAt: Date;
    accountId: string;
    accountName: string;
  }> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: tiktokAppId(),
        secret: tiktokAppSecret(),
        auth_code: code,
      }),
    });
    if (!res.ok) {
      throw new Error(`TikTok token exchange failed: ${res.status}`);
    }
    const json = (await res.json()) as {
      data?: {
        access_token?: string;
        expires_in?: number;
        advertiser_ids?: string[];
        display_name?: string;
      };
    };
    const data = json.data;
    if (!data?.access_token) {
      throw new Error("TikTok token response missing access_token");
    }

    const accountId = data.advertiser_ids?.[0] ?? "";
    const accountName = data.display_name ?? accountId;
    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

    return {
      accessToken: data.access_token,
      expiresAt,
      accountId,
      accountName,
    };
  }
}
