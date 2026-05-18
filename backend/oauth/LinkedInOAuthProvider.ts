function linkedinClientId(): string {
  return process.env.LINKEDIN_CLIENT_ID ?? "";
}

function linkedinClientSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET ?? "";
}

function linkedinRedirectUri(): string {
  return process.env.LINKEDIN_REDIRECT_URI ?? "https://nelvyon.com/api/oauth/linkedin/callback";
}

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export class LinkedInOAuthProvider {
  static readonly SCOPES = [
    "r_ads",
    "rw_ads",
    "r_ads_reporting",
    "r_basicprofile",
    "r_emailaddress",
  ] as const;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: linkedinClientId(),
      redirect_uri: linkedinRedirectUri(),
      scope: LinkedInOAuthProvider.SCOPES.join(" "),
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
        redirect_uri: linkedinRedirectUri(),
        client_id: linkedinClientId(),
        client_secret: linkedinClientSecret(),
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`LinkedIn token exchange failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      throw new Error("LinkedIn token response missing access_token");
    }

    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000);

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`LinkedIn userinfo failed: ${userRes.status}`);
    }
    const userinfo = (await userRes.json()) as { sub?: string; name?: string; email?: string };
    const accountId = userinfo.sub ?? "unknown";
    const accountName = userinfo.name ?? userinfo.email ?? accountId;

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
        client_id: linkedinClientId(),
        client_secret: linkedinClientSecret(),
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`LinkedIn token refresh failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      throw new Error("LinkedIn refresh response missing access_token");
    }
    return {
      accessToken: tokenJson.access_token,
      expiresAt: new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000),
    };
  }
}
