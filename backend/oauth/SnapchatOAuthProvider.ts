function snapchatClientId(): string {
  return process.env.SNAPCHAT_CLIENT_ID ?? "";
}

function snapchatClientSecret(): string {
  return process.env.SNAPCHAT_CLIENT_SECRET ?? "";
}

function snapchatRedirectUri(): string {
  return process.env.SNAPCHAT_REDIRECT_URI ?? "https://app.nelvyon.com/api/oauth/snapchat/callback";
}

const AUTH_URL = "https://accounts.snapchat.com/login/oauth2/authorize";
const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";

export class SnapchatOAuthProvider {
  static readonly SCOPES = ["snapchat-marketing-api"] as const;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: snapchatClientId(),
      redirect_uri: snapchatRedirectUri(),
      response_type: "code",
      scope: SnapchatOAuthProvider.SCOPES.join(" "),
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    accountId: string;
    accountName: string;
  }> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: snapchatRedirectUri(),
        client_id: snapchatClientId(),
        client_secret: snapchatClientSecret(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Snapchat token exchange failed: ${res.status}`);
    }
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      throw new Error("Snapchat token response missing access_token");
    }

    const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt,
      accountId: "snapchat-primary",
      accountName: "Snapchat Ads",
    };
  }
}
