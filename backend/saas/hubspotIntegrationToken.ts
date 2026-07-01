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
