import { DbClient } from "../db/DbClient";
import { decryptSecret, encryptSecret } from "./SaasSsoService";
import type { AdsPlatform } from "./SaasAdsDashboardService";

type ConnectionRow = {
  id: string; tenant_id: string; platform: string; account_id: string; account_name: string;
  access_token: string; refresh_token: string | null; token_expires_at: string | null;
  extra_config: Record<string, unknown>; is_active: boolean; created_at: Date;
};

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now() + 60_000;
}

async function refreshMetaToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string | null } | null> {
  const clientId = process.env.META_CLIENT_ID?.trim();
  const clientSecret = process.env.META_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${encodeURIComponent(refreshToken)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiresAt };
}

async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string | null } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiresAt };
}

async function refreshLinkedInToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string | null } | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiresAt };
}

async function refreshSnapchatToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string | null; refreshToken?: string } | null> {
  const clientId = process.env.SNAPCHAT_CLIENT_ID?.trim();
  const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://accounts.snapchat.com/login/oauth2/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!data.access_token) return null;
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return { accessToken: data.access_token, expiresAt, refreshToken: data.refresh_token };
}

async function persistToken(
  conn: ConnectionRow,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: string | null,
  db: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
): Promise<string> {
  await db.query(
    `UPDATE saas_ads_connections SET access_token=$2, refresh_token=COALESCE($3, refresh_token),
            token_expires_at=$4, updated_at=NOW() WHERE id=$1`,
    [conn.id, accessToken, refreshToken, expiresAt],
  );
  return accessToken;
}

/** Refresh ads platform token when expired; returns usable access token. */
export async function refreshAdsAccessTokenIfNeeded(
  conn: ConnectionRow,
  db: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> } = DbClient.getInstance(),
): Promise<string> {
  if (!isExpired(conn.token_expires_at)) return conn.access_token;
  const refreshRaw = conn.refresh_token?.trim();
  if (!refreshRaw) return conn.access_token;

  let refreshed: { accessToken: string; expiresAt: string | null; refreshToken?: string } | null = null;
  if (conn.platform === "meta") refreshed = await refreshMetaToken(refreshRaw);
  else if (conn.platform === "google") refreshed = await refreshGoogleToken(refreshRaw);
  else if (conn.platform === "linkedin") refreshed = await refreshLinkedInToken(refreshRaw);
  else if (conn.platform === "snapchat") refreshed = await refreshSnapchatToken(refreshRaw);

  if (!refreshed) return conn.access_token;
  return persistToken(conn, refreshed.accessToken, refreshed.refreshToken ?? refreshRaw, refreshed.expiresAt, db);
}

/** Load connection row and ensure fresh token. */
export async function resolveAdsConnectionToken(
  tenantId: string,
  platform: AdsPlatform,
  db: { query: <T = ConnectionRow>(sql: string, params?: unknown[]) => Promise<T[]> } = DbClient.getInstance(),
): Promise<ConnectionRow | null> {
  const rows = await db.query<ConnectionRow>(
    `SELECT id, tenant_id, platform, account_id, account_name, access_token, refresh_token,
            token_expires_at, extra_config, is_active, created_at
     FROM saas_ads_connections WHERE tenant_id=$1 AND platform=$2 AND is_active=true
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, platform],
  );
  const conn = rows[0];
  if (!conn) return null;
  const access_token = await refreshAdsAccessTokenIfNeeded(conn, db);
  return { ...conn, access_token };
}
