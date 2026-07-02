import { DbClient } from "../db/DbClient";
import { OAuthService } from "../oauth/OAuthService";
import { getSaasAdsDashboardService } from "./SaasAdsDashboardService";
import { getSaasIntegrationsHubService } from "./SaasIntegrationsHubService";
import { getSaasOnboardingService } from "./SaasOnboardingService";
import { getSaasSocialService } from "./SaasSocialService";

/** OAuth provider id → integration catalog slugs fed by the same token. */
export const OAUTH_PROVIDER_SLUGS: Record<string, string[]> = {
  google: ["google", "google_analytics", "google_calendar"],
  meta: ["meta"],
  linkedin: ["linkedin"],
  tiktok: ["tiktok"],
  snapchat: ["snapchat"],
  hubspot: ["hubspot"],
  salesforce: ["salesforce"],
  pipedrive: ["pipedrive"],
  zoho: ["zoho"],
  slack: ["slack"],
};

export type OAuthSlugStatus = { connected: boolean; accountName: string | null };

/** Catalog slug → OAuth provider id for disconnect. */
export function slugToOAuthProvider(slug: string): string | null {
  if (slug === "google_analytics" || slug === "google_calendar") return "google";
  if (slug in OAUTH_PROVIDER_SLUGS) return slug;
  return null;
}

export async function syncOAuthProviderToHub(
  userId: string,
  provider: string,
  accountName?: string | null,
): Promise<void> {
  const tenant = await getSaasOnboardingService().getTenant(userId);
  if (!tenant) return;
  const hub = getSaasIntegrationsHubService();
  const slugs = OAUTH_PROVIDER_SLUGS[provider] ?? [provider];
  for (const slug of slugs) {
    await hub.recordConnection(tenant.id, slug, {
      status: "connected",
      externalAccountName: accountName ?? null,
    });
  }
}

const ADS_OAUTH_PLATFORMS: Record<string, "meta" | "google" | "linkedin" | "tiktok" | "snapchat"> = {
  meta: "meta",
  google: "google",
  linkedin: "linkedin",
  tiktok: "tiktok",
  snapchat: "snapchat",
};

const SOCIAL_OAUTH_PLATFORMS: Record<string, "meta" | "linkedin"> = {
  meta: "meta",
  linkedin: "linkedin",
};

/** After OAuth, wire tokens into ads + social product tables (not only integrations hub). */
export async function syncOAuthToProductModules(
  userId: string,
  provider: string,
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountId?: string;
    accountName?: string;
  },
): Promise<void> {
  const tenant = await getSaasOnboardingService().getTenant(userId);
  if (!tenant || !data.accessToken?.trim()) return;

  const accountId = data.accountId?.trim() || `${provider}-primary`;
  const accountName = data.accountName?.trim() || accountId;
  const tokenExpiresAt = data.expiresAt?.toISOString();

  const adsPlatform = ADS_OAUTH_PLATFORMS[provider];
  if (adsPlatform) {
    try {
      await getSaasAdsDashboardService().connectAccount(tenant.id, {
        platform: adsPlatform,
        accountId,
        accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt,
      });
    } catch {
      /* non-fatal — manual connect still available */
    }
  }

  const socialPlatform = SOCIAL_OAUTH_PLATFORMS[provider];
  if (socialPlatform) {
    try {
      await getSaasSocialService().connectAccount(tenant.id, {
        platform: socialPlatform,
        accountId,
        accountName,
        accessToken: data.accessToken,
        tokenExpiresAt,
      });
    } catch {
      /* non-fatal */
    }
  }
}

export async function loadOAuthSlugStatus(
  userId: string,
  workspaceId: number | null,
): Promise<Map<string, OAuthSlugStatus>> {
  const map = new Map<string, OAuthSlugStatus>();

  try {
    for (const c of await OAuthService.instance().listConnections(userId)) {
      if (!c.isActive) continue;
      const slugs = OAUTH_PROVIDER_SLUGS[c.provider] ?? [c.provider];
      for (const slug of slugs) {
        map.set(slug, {
          connected: true,
          accountName: c.externalAccountName ?? null,
        });
      }
    }
  } catch {
    /* non-fatal */
  }

  if (workspaceId != null) {
    try {
      const rows = await DbClient.getInstance().query<{
        provider: string;
        account_name: string | null;
      }>(
        `SELECT provider, account_name FROM oauth_tokens
         WHERE workspace_id = $1 AND user_id = $2::text AND access_token IS NOT NULL`,
        [workspaceId, userId],
      );
      for (const row of rows) {
        const slugs = OAUTH_PROVIDER_SLUGS[row.provider] ?? [row.provider];
        for (const slug of slugs) {
          map.set(slug, { connected: true, accountName: row.account_name });
        }
      }
    } catch {
      /* non-fatal — table may be absent in some test DBs */
    }
  }

  return map;
}

export async function resolveOAuthProviderByState(state: string): Promise<string | null> {
  try {
    const rows = await DbClient.getInstance().query<{ provider: string }>(
      `SELECT provider FROM oauth_tokens
       WHERE extra_json::jsonb->>'state' = $1
       LIMIT 1`,
      [state],
    );
    return rows[0]?.provider ?? null;
  } catch {
    return null;
  }
}

export async function revokeOAuthProvider(userId: string, slug: string, workspaceId: number | null): Promise<void> {
  const provider = slugToOAuthProvider(slug);
  if (!provider) return;

  if (["hubspot", "slack"].includes(provider) && workspaceId != null) {
    try {
      await DbClient.getInstance().query(
        `UPDATE oauth_tokens
         SET access_token = NULL, refresh_token = NULL, error = 'disconnected', updated_at = NOW()
         WHERE workspace_id = $1 AND user_id = $2::text AND provider = $3`,
        [workspaceId, userId, provider],
      );
    } catch {
      /* non-fatal */
    }
    return;
  }

  try {
    await OAuthService.instance().deleteConnection(userId, provider as "google" | "meta" | "tiktok" | "linkedin");
  } catch {
    /* non-fatal */
  }
}
