const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "https://nelvyon.com/api/oauth/google/callback";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export class GoogleOAuthProvider {
  static readonly SCOPES = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "email",
    "profile",
  ] as const;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: GoogleOAuthProvider.SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    accountId: string;
    accountName: string;
  }> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Google token exchange failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      throw new Error("Google token response missing access_token");
    }

    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000);

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`Google userinfo failed: ${userRes.status}`);
    }
    const user = (await userRes.json()) as { email?: string; name?: string };
    const accountId = user.email ?? "unknown";
    const accountName = user.name ?? accountId;

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? "",
      expiresAt,
      accountId,
      accountName,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Google token refresh failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      throw new Error("Google refresh response missing access_token");
    }
    return {
      accessToken: tokenJson.access_token,
      expiresAt: new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000),
    };
  }
}
