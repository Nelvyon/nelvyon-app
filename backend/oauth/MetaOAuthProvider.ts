function metaAppId(): string {
  return process.env.META_APP_ID ?? "";
}

function metaAppSecret(): string {
  return process.env.META_APP_SECRET ?? "";
}

function metaRedirectUri(): string {
  return process.env.META_REDIRECT_URI ?? "https://nelvyon.com/api/oauth/meta/callback";
}

const GRAPH_VERSION = "v19.0";
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export class MetaOAuthProvider {
  static readonly SCOPES = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "public_profile",
    "email",
  ] as const;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: metaAppId(),
      redirect_uri: metaRedirectUri(),
      response_type: "code",
      scope: MetaOAuthProvider.SCOPES.join(","),
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
    const tokenParams = new URLSearchParams({
      client_id: metaAppId(),
      redirect_uri: metaRedirectUri(),
      client_secret: metaAppSecret(),
      code,
    });
    const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${tokenParams.toString()}`);
    if (!tokenRes.ok) {
      throw new Error(`Meta token exchange failed: ${tokenRes.status}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!tokenJson.access_token) {
      throw new Error("Meta token response missing access_token");
    }

    const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 3600) * 1000);

    const meParams = new URLSearchParams({
      fields: "id,name,email",
      access_token: tokenJson.access_token,
    });
    const meRes = await fetch(`${GRAPH_BASE}/me?${meParams.toString()}`);
    if (!meRes.ok) {
      throw new Error(`Meta /me failed: ${meRes.status}`);
    }
    const me = (await meRes.json()) as { id?: string; name?: string; email?: string };
    const accountId = me.id ?? "unknown";
    const accountName = me.name ?? me.email ?? accountId;

    return {
      accessToken: tokenJson.access_token,
      expiresAt,
      accountId,
      accountName,
    };
  }

  async getLongLivedToken(shortLivedToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: metaAppId(),
      client_secret: metaAppSecret(),
      fb_exchange_token: shortLivedToken,
    });
    const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Meta long-lived token exchange failed: ${res.status}`);
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error("Meta long-lived response missing access_token");
    }
    return {
      accessToken: json.access_token,
      expiresAt: new Date(Date.now() + SIXTY_DAYS_MS),
    };
  }
}
