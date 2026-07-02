import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import {
  INTEGRATIONS_CATALOG,
  getCatalogBySlug,
  type IntegrationConnector,
  type IntegrationCatalogStatus,
} from "./integrationsCatalog";
import { getSaasAdsDashboardService } from "./SaasAdsDashboardService";
import { getSaasKlaviyoService } from "./SaasKlaviyoService";
import { loadOAuthSlugStatus, revokeOAuthProvider } from "./integrationHubSync";

export { type IntegrationConnector, type IntegrationCatalogStatus };
export type { IntegrationCategory, IntegrationConnectionType } from "./integrationsCatalog";

// ── Public types ──────────────────────────────────────────────────────────────

export type IntegrationConnectionStatus = "connected" | "disconnected" | "error" | "pending";

export interface IntegrationConnection {
  slug: string;
  catalogStatus: IntegrationCatalogStatus;
  displayName: string;
  icon: string;
  category: string;
  connectionType: string;
  envKeys: string[];
  relatedRoute?: string;
  status: IntegrationConnectionStatus;
  envConfigured: boolean;
  connectedAccount: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

export interface IntegrationsSummary {
  total: number;
  connected: number;
  envOnly: number;
  oauth: number;
}

export interface IntegrationsCatalogItem extends IntegrationConnector {
  envConfigured: boolean;
}

export class SaasIntegrationsHubError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasIntegrationsHubError";
  }
}

// ── DB row type ───────────────────────────────────────────────────────────────

interface DbConnectionRow {
  connector_slug: string;
  status: IntegrationConnectionStatus;
  external_account_name: string | null;
  last_sync_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEnvConfigured(keys: string[]): boolean {
  return keys.length === 0 || keys.every((k) => !!process.env[k]);
}

const ADS_PLATFORMS = new Set(["meta", "google", "linkedin", "tiktok", "snapchat"]);

/** OAuth handled by Next.js routes (cookie session on redirect). */
const WEB_OAUTH_ROUTES: Record<string, string> = {
  meta: "/api/oauth/meta",
  google: "/api/oauth/google",
  google_analytics: "/api/oauth/google",
  google_calendar: "/api/oauth/google",
  linkedin: "/api/oauth/linkedin",
  tiktok: "/api/oauth/tiktok",
  snapchat: "/api/oauth/snapchat",
};

/** OAuth via FastAPI /api/v1/oauth/authorize/{provider} (all non-Next OAuth connectors). */
function pythonOAuthConnectUrl(baseUrl: string, slug: string, tenantId: string): string {
  return `${baseUrl}/api/saas/oauth/connect?provider=${encodeURIComponent(slug)}&tenant_id=${encodeURIComponent(tenantId)}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasIntegrationsHubService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  /** Full catalog with envConfigured flag (no tenant context needed) */
  listCatalog(): IntegrationsCatalogItem[] {
    return INTEGRATIONS_CATALOG.map((c) => ({
      ...c,
      envConfigured: isEnvConfigured(c.envKeys),
    }));
  }

  /** Merged view: catalog + DB rows + ads/oauth status + env checks */
  async listConnections(
    tenantId: string,
    userId?: string,
    workspaceId?: number | null,
  ): Promise<IntegrationConnection[]> {
    // 1. DB rows for this tenant
    const rows = await this.db.query<DbConnectionRow>(
      `SELECT connector_slug, status, external_account_name, last_sync_at, error_message, metadata
       FROM saas_integration_connections
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const dbMap = new Map(rows.map((r) => [r.connector_slug, r]));

    // 2. Ads OAuth status (non-fatal)
    let adsStatuses: Array<{ platform: string; connected: boolean; accountName?: string }> = [];
    try {
      adsStatuses = await getSaasAdsDashboardService().getStatus(tenantId);
    } catch { /* non-fatal */ }
    const adsMap = new Map(adsStatuses.map((s) => [s.platform, s]));

    // 3. Klaviyo (non-fatal)
    let klaviyoStatus = { configured: false, accountEmail: null as string | null };
    try {
      klaviyoStatus = await getSaasKlaviyoService().getStatus();
    } catch { /* non-fatal */ }

    // 4. Next.js + FastAPI OAuth tokens (non-fatal)
    const oauthMap = userId
      ? await loadOAuthSlugStatus(userId, workspaceId ?? null)
      : new Map<string, { connected: boolean; accountName: string | null }>();

    return INTEGRATIONS_CATALOG.map((connector): IntegrationConnection => {
      const envConfigured = isEnvConfigured(connector.envKeys);
      const dbRow = dbMap.get(connector.slug);

      // Ads platforms: prefer DB row, then ads service status
      if (ADS_PLATFORMS.has(connector.slug)) {
        const ads = adsMap.get(connector.slug);
        const oauth = oauthMap.get(connector.slug);
        const connected = ads?.connected ?? oauth?.connected ?? false;
        return {
          slug: connector.slug,
          catalogStatus: connector.status,
          displayName: connector.displayName,
          icon: connector.icon,
          category: connector.category,
          connectionType: connector.connectionType,
          envKeys: connector.envKeys,
          relatedRoute: connector.relatedRoute,
          status: dbRow?.status ?? (connected ? "connected" : "disconnected"),
          envConfigured,
          connectedAccount: dbRow?.external_account_name ?? ads?.accountName ?? oauth?.accountName ?? null,
          lastSyncAt: dbRow?.last_sync_at ?? null,
          errorMessage: dbRow?.error_message ?? null,
          metadata: dbRow?.metadata ?? {},
        };
      }

      // Klaviyo
      if (connector.slug === "klaviyo") {
        return {
          slug: connector.slug,
          catalogStatus: connector.status,
          displayName: connector.displayName,
          icon: connector.icon,
          category: connector.category,
          connectionType: connector.connectionType,
          envKeys: connector.envKeys,
          relatedRoute: connector.relatedRoute,
          status: dbRow?.status ?? (klaviyoStatus.configured ? "connected" : "disconnected"),
          envConfigured,
          connectedAccount: dbRow?.external_account_name ?? klaviyoStatus.accountEmail,
          lastSyncAt: dbRow?.last_sync_at ?? null,
          errorMessage: dbRow?.error_message ?? null,
          metadata: dbRow?.metadata ?? {},
        };
      }

      // Env-based connectors
      if (connector.connectionType === "env") {
        return {
          slug: connector.slug,
          catalogStatus: connector.status,
          displayName: connector.displayName,
          icon: connector.icon,
          category: connector.category,
          connectionType: connector.connectionType,
          envKeys: connector.envKeys,
          relatedRoute: connector.relatedRoute,
          status: dbRow?.status ?? (envConfigured ? "connected" : "disconnected"),
          envConfigured,
          connectedAccount: dbRow?.external_account_name ??
            (connector.slug === "ses" && envConfigured ? (process.env.SES_FROM_EMAIL ?? null) : null),
          lastSyncAt: dbRow?.last_sync_at ?? null,
          errorMessage: dbRow?.error_message ?? null,
          metadata: dbRow?.metadata ?? {},
        };
      }

      // OAuth / manual connectors
      const oauth = oauthMap.get(connector.slug);
      return {
        slug: connector.slug,
        catalogStatus: connector.status,
        displayName: connector.displayName,
        icon: connector.icon,
        category: connector.category,
        connectionType: connector.connectionType,
        envKeys: connector.envKeys,
        relatedRoute: connector.relatedRoute,
        status: dbRow?.status ?? (oauth?.connected ? "connected" : "disconnected"),
        envConfigured,
        connectedAccount: dbRow?.external_account_name ?? oauth?.accountName ?? null,
        lastSyncAt: dbRow?.last_sync_at ?? null,
        errorMessage: dbRow?.error_message ?? null,
        metadata: dbRow?.metadata ?? {},
      };
    });
  }

  async getConnectionStatus(
    tenantId: string,
    slug: string,
    userId?: string,
    workspaceId?: number | null,
  ): Promise<IntegrationConnection | null> {
    const all = await this.listConnections(tenantId, userId, workspaceId);
    return all.find((c) => c.slug === slug) ?? null;
  }

  /** Remove OAuth row; env-based connectors cannot be "disconnected" via UI */
  async disconnect(
    tenantId: string,
    slug: string,
    userId?: string,
    workspaceId?: number | null,
  ): Promise<void> {
    const connector = getCatalogBySlug(slug);
    if (!connector) {
      throw new SaasIntegrationsHubError(`Unknown connector: ${slug}`, "NOT_FOUND");
    }
    if (userId) {
      await revokeOAuthProvider(userId, slug, workspaceId ?? null);
    }
    await this.db.query(
      `DELETE FROM saas_integration_connections WHERE tenant_id = $1 AND connector_slug = $2`,
      [tenantId, slug]
    );
  }

  /** Returns an authorize URL for OAuth connectors, or throws if env not configured */
  getAuthorizeUrl(tenantId: string, slug: string, baseUrl: string): string {
    const connector = getCatalogBySlug(slug);
    if (!connector) {
      throw new SaasIntegrationsHubError(`Unknown connector: ${slug}`, "NOT_FOUND");
    }
    if (connector.status === "coming_soon") {
      throw new SaasIntegrationsHubError(`${connector.displayName} is coming soon`, "COMING_SOON");
    }
    if (connector.connectionType === "manual") {
      if (connector.relatedRoute) {
        return `${baseUrl}${connector.relatedRoute}`;
      }
      throw new SaasIntegrationsHubError(
        `${connector.displayName} requires manual configuration`,
        "NOT_OAUTH"
      );
    }
    if (connector.connectionType !== "oauth") {
      throw new SaasIntegrationsHubError(
        `${connector.displayName} uses ${connector.connectionType} — configure via environment variables`,
        "NOT_OAUTH"
      );
    }
    const missingEnv = connector.envKeys.filter((k) => !process.env[k]);
    if (missingEnv.length > 0) {
      throw new SaasIntegrationsHubError(
        `Missing environment variables: ${missingEnv.join(", ")}`,
        "ENV_REQUIRED"
      );
    }
    // Ads platforms: prefer Next.js OAuth routes; snapchat etc. use FastAPI connect
    if (ADS_PLATFORMS.has(slug)) {
      const webRoute = WEB_OAUTH_ROUTES[slug];
      if (webRoute) return `${baseUrl}${webRoute}`;
    }
    const webRoute = WEB_OAUTH_ROUTES[slug];
    if (webRoute) {
      return `${baseUrl}${webRoute}`;
    }
    return pythonOAuthConnectUrl(baseUrl, slug, tenantId);
  }

  /** UPSERT a connection record (called from OAuth callback or manual setup) */
  async recordConnection(
    tenantId: string,
    slug: string,
    data: {
      status: IntegrationConnectionStatus;
      externalAccountId?: string | null;
      externalAccountName?: string | null;
      scopes?: string[];
      metadata?: Record<string, unknown>;
      errorMessage?: string | null;
      accessTokenEnc?: string | null;
      refreshTokenEnc?: string | null;
    }
  ): Promise<void> {
    const connector = getCatalogBySlug(slug);
    if (!connector) {
      throw new SaasIntegrationsHubError(`Unknown connector: ${slug}`, "NOT_FOUND");
    }
    await this.db.query(
      `INSERT INTO saas_integration_connections
         (tenant_id, connector_slug, status, external_account_id, external_account_name,
          scopes, metadata, access_token_enc, refresh_token_enc, last_sync_at, error_message, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, NOW(), $10, NOW())
       ON CONFLICT (tenant_id, connector_slug) DO UPDATE SET
         status              = EXCLUDED.status,
         external_account_id = EXCLUDED.external_account_id,
         external_account_name = EXCLUDED.external_account_name,
         scopes              = EXCLUDED.scopes,
         metadata            = EXCLUDED.metadata,
         access_token_enc    = COALESCE(EXCLUDED.access_token_enc, saas_integration_connections.access_token_enc),
         refresh_token_enc   = COALESCE(EXCLUDED.refresh_token_enc, saas_integration_connections.refresh_token_enc),
         last_sync_at        = NOW(),
         error_message       = EXCLUDED.error_message,
         updated_at          = NOW()`,
      [
        tenantId,
        slug,
        data.status,
        data.externalAccountId ?? null,
        data.externalAccountName ?? null,
        JSON.stringify(data.scopes ?? []),
        JSON.stringify(data.metadata ?? {}),
        data.accessTokenEnc ?? null,
        data.refreshTokenEnc ?? null,
        data.errorMessage ?? null,
      ]
    );
  }

  /** Build summary counts from a connection list */
  buildSummary(connections: IntegrationConnection[]): IntegrationsSummary {
    const connected = connections.filter((c) => c.status === "connected").length;
    const envOnly = connections.filter(
      (c) => c.connectionType === "env" && c.status === "connected"
    ).length;
    const oauth = connections.filter(
      (c) => c.connectionType === "oauth" && c.status === "connected"
    ).length;
    return { total: INTEGRATIONS_CATALOG.length, connected, envOnly, oauth };
  }
}

let _svc: SaasIntegrationsHubService | null = null;
export function getSaasIntegrationsHubService(): SaasIntegrationsHubService {
  if (!_svc) _svc = new SaasIntegrationsHubService();
  return _svc;
}
export function resetSaasIntegrationsHubServiceForTests(): void {
  _svc = null;
}
