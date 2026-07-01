import { DbClient } from "../db/DbClient";
import { getSaasIntegrationsHubService } from "./SaasIntegrationsHubService";
import { decryptSecret, encryptSecret } from "./SaasSsoService";

/** Resolve HubSpot bearer token: connection vault first, then oauth_tokens fallback. */
export async function resolveHubSpotAccessToken(tenantId: string): Promise<string | null> {
  const db = DbClient.getInstance();

  const connRows = await db.query<{ access_token_enc: string | null }>(
    `SELECT access_token_enc FROM saas_integration_connections
     WHERE tenant_id=$1 AND connector_slug='hubspot' AND status='connected' LIMIT 1`,
    [tenantId],
  );
  const enc = connRows[0]?.access_token_enc?.trim();
  if (enc) {
    try {
      return decryptSecret(enc);
    } catch {
      /* fall through */
    }
  }

  const tenantRows = await db.query<{ workspace_id: number | null }>(
    `SELECT workspace_id FROM saas_tenants WHERE id=$1 LIMIT 1`,
    [tenantId],
  );
  const workspaceId = tenantRows[0]?.workspace_id;
  if (workspaceId == null) return null;

  const oauthRows = await db.query<{ access_token: string }>(
    `SELECT access_token FROM oauth_tokens
     WHERE workspace_id=$1 AND provider='hubspot' AND access_token IS NOT NULL
     ORDER BY updated_at DESC LIMIT 1`,
    [workspaceId],
  );
  return oauthRows[0]?.access_token?.trim() ?? null;
}

/** Refresh HubSpot access token when refresh_token_enc is stored. */
export async function refreshHubSpotAccessTokenIfNeeded(tenantId: string): Promise<string | null> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ refresh_token_enc: string | null; access_token_enc: string | null }>(
    `SELECT refresh_token_enc, access_token_enc FROM saas_integration_connections
     WHERE tenant_id=$1 AND connector_slug='hubspot' AND status='connected' LIMIT 1`,
    [tenantId],
  );
  const refreshEnc = rows[0]?.refresh_token_enc?.trim();
  if (!refreshEnc) return resolveHubSpotAccessToken(tenantId);

  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return resolveHubSpotAccessToken(tenantId);

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(refreshEnc);
  } catch {
    return resolveHubSpotAccessToken(tenantId);
  }

  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return resolveHubSpotAccessToken(tenantId);
  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token) return resolveHubSpotAccessToken(tenantId);

  await getSaasIntegrationsHubService().recordConnection(tenantId, "hubspot", {
    status: "connected",
    accessTokenEnc: encryptSecret(data.access_token),
    refreshTokenEnc: data.refresh_token ? encryptSecret(data.refresh_token) : null,
  });
  return data.access_token;
}

/** Copy oauth_tokens HubSpot credentials into saas_integration_connections (encrypted). */
export async function bridgeHubSpotOAuthToken(
  tenantId: string,
  workspaceId: number,
  userId: string,
): Promise<void> {
  const db = DbClient.getInstance();
  const rows = await db.query<{
    access_token: string;
    refresh_token: string | null;
    account_name: string | null;
  }>(
    `SELECT access_token, refresh_token, account_name FROM oauth_tokens
     WHERE workspace_id=$1 AND user_id=$2::text AND provider='hubspot' AND access_token IS NOT NULL
     LIMIT 1`,
    [workspaceId, userId],
  );
  const row = rows[0];
  if (!row?.access_token?.trim()) return;

  await getSaasIntegrationsHubService().recordConnection(tenantId, "hubspot", {
    status: "connected",
    externalAccountName: row.account_name,
    accessTokenEnc: encryptSecret(row.access_token),
    refreshTokenEnc: row.refresh_token ? encryptSecret(row.refresh_token) : null,
  });
}
