import { DbClient } from "../db/DbClient";
import { getSaasIntegrationsHubService } from "./SaasIntegrationsHubService";
import { decryptSecret, encryptSecret } from "./SaasSsoService";

const REFRESH_ENDPOINTS: Record<string, { url: string; useForm: boolean }> = {
  hubspot: { url: "https://api.hubapi.com/oauth/v1/token", useForm: true },
  salesforce: { url: "https://login.salesforce.com/services/oauth2/token", useForm: true },
  pipedrive: { url: "https://oauth.pipedrive.com/oauth/token", useForm: true },
  zoho: { url: "https://accounts.zoho.com/oauth/v2/token", useForm: true },
};

const ENV_KEYS: Record<string, [string, string]> = {
  hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  salesforce: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
  pipedrive: ["PIPEDRIVE_CLIENT_ID", "PIPEDRIVE_CLIENT_SECRET"],
  zoho: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET"],
};

export type CrmConnectorSlug = "hubspot" | "salesforce" | "pipedrive" | "zoho";

export async function resolveCrmAccessToken(tenantId: string, slug: CrmConnectorSlug): Promise<string | null> {
  const db = DbClient.getInstance();
  const connRows = await db.query<{ access_token_enc: string | null }>(
    `SELECT access_token_enc FROM saas_integration_connections
     WHERE tenant_id=$1 AND connector_slug=$2 AND status='connected' LIMIT 1`,
    [tenantId, slug],
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
     WHERE workspace_id=$1 AND provider=$2 AND access_token IS NOT NULL
     ORDER BY updated_at DESC LIMIT 1`,
    [workspaceId, slug],
  );
  return oauthRows[0]?.access_token?.trim() ?? null;
}

export async function refreshCrmAccessTokenIfNeeded(
  tenantId: string,
  slug: CrmConnectorSlug,
): Promise<string | null> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ refresh_token_enc: string | null }>(
    `SELECT refresh_token_enc FROM saas_integration_connections
     WHERE tenant_id=$1 AND connector_slug=$2 AND status='connected' LIMIT 1`,
    [tenantId, slug],
  );
  const refreshEnc = rows[0]?.refresh_token_enc?.trim();
  if (!refreshEnc) return resolveCrmAccessToken(tenantId, slug);

  const [clientIdKey, clientSecretKey] = ENV_KEYS[slug] ?? [];
  const clientId = clientIdKey ? process.env[clientIdKey]?.trim() : "";
  const clientSecret = clientSecretKey ? process.env[clientSecretKey]?.trim() : "";
  const endpoint = REFRESH_ENDPOINTS[slug];
  if (!clientId || !clientSecret || !endpoint) return resolveCrmAccessToken(tenantId, slug);

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(refreshEnc);
  } catch {
    return resolveCrmAccessToken(tenantId, slug);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: endpoint.useForm ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
    body: endpoint.useForm ? body : undefined,
  });
  if (!res.ok) return resolveCrmAccessToken(tenantId, slug);

  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token) return resolveCrmAccessToken(tenantId, slug);

  await getSaasIntegrationsHubService().recordConnection(tenantId, slug, {
    status: "connected",
    accessTokenEnc: encryptSecret(data.access_token),
    refreshTokenEnc: data.refresh_token ? encryptSecret(data.refresh_token) : null,
  });
  return data.access_token;
}
