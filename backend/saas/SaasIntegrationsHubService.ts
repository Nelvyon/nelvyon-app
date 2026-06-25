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

  /** Merged view: catalog + DB rows + ads oauth status + env checks */
  async listConnections(tenantId: string): Promise<IntegrationConnection[]> {
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

    return INTEGRATIONS_CATALOG.map((connector): IntegrationConnection => {
      const envConfigured = isEnvConfigured(connector.envKeys);
      const dbRow = dbMap.get(connector.slug);

      // Ads platforms: prefer DB row, then ads service status
      if (ADS_PLATFORMS.has(connector.slug)) {
        const ads = adsMap.get(connector.slug);
        const connected = ads?.connected ?? false;
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
          connectedAccount: dbRow?.external_account_name ?? ads?.accountName ?? null,
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
      return {
        slug: connector.slug,
        catalogStatus: connector.status,
        displayName: connector.displayName,
        icon: connector.icon,
        category: connector.category,
        connectionType: connector.connectionType,
        envKeys: connector.envKeys,
        relatedRoute: connector.relatedRoute,
        status: dbRow?.status ?? "disconnected",
        envConfigured,
        connectedAccount: dbRow?.external_account_name ?? null,
        lastSyncAt: dbRow?.last_sync_at ?? null,
        errorMessage: dbRow?.error_message ?? null,
        metadata: dbRow?.metadata ?? {},
      };
    });
  }

  async getConnectionStatus(tenantId: string, slug: string): Promise<IntegrationConnection | null> {
    const all = await this.listConnections(tenantId);
    return all.find((c) => c.slug === slug) ?? null;
  }

  /** Remove OAuth row; env-based connectors cannot be "disconnected" via UI */
  async disconnect(tenantId: string, slug: string): Promise<void> {
    const connector = getCatalogBySlug(slug);
    if (!connector) {
      throw new SaasIntegrationsHubError(`Unknown connector: ${slug}`, "NOT_FOUND");
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
    // Ads platforms redirect to their dedicated management UI
    if (ADS_PLATFORMS.has(slug) && connector.relatedRoute) {
      return `${baseUrl}${connector.relatedRoute}`;
    }
    // Generic OAuth initiation via Python backend
    return `${baseUrl}/api/saas/oauth/connect?provider=${encodeURIComponent(slug)}&tenant_id=${encodeURIComponent(tenantId)}`;
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
    }
  ): Promise<void> {
    const connector = getCatalogBySlug(slug);
    if (!connector) {
      throw new SaasIntegrationsHubError(`Unknown connector: ${slug}`, "NOT_FOUND");
    }
    await this.db.query(
      `INSERT INTO saas_integration_connections
         (tenant_id, connector_slug, status, external_account_id, external_account_name,
          scopes, metadata, last_sync_at, error_message, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), $8, NOW())
       ON CONFLICT (tenant_id, connector_slug) DO UPDATE SET
         status              = EXCLUDED.status,
         external_account_id = EXCLUDED.external_account_id,
         external_account_name = EXCLUDED.external_account_name,
         scopes              = EXCLUDED.scopes,
         metadata            = EXCLUDED.metadata,
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
