import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { ensureEliteWorldClassSchema } from "./ensureEliteWorldClassSchema";
import { isPgMissingRelation } from "./saasRequestContext";

export type MarketplaceApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  author: string;
  category: string;
  installCount: number;
  installed: boolean;
};

/** Published catalog — same rows as migration 482 seed when DB is not migrated yet. */
const MARKETPLACE_CATALOG_SEED: Omit<MarketplaceApp, "installed">[] = [
  {
    id: "zapier",
    slug: "zapier",
    name: "Zapier",
    description: "Conecta 5000+ apps con triggers y acciones Nelvyon",
    author: "Nelvyon",
    category: "automation",
    installCount: 0,
  },
  {
    id: "make",
    slug: "make",
    name: "Make.com",
    description: "Automatizaciones visuales con webhooks Nelvyon",
    author: "Nelvyon",
    category: "automation",
    installCount: 0,
  },
  {
    id: "n8n",
    slug: "n8n",
    name: "n8n",
    description: "Self-hosted automation con API pública v2",
    author: "Nelvyon",
    category: "automation",
    installCount: 0,
  },
  {
    id: "hubspot-sync",
    slug: "hubspot-sync",
    name: "HubSpot Sync",
    description: "Sincronización bidireccional contactos y deals",
    author: "Nelvyon",
    category: "crm",
    installCount: 0,
  },
  {
    id: "google-analytics",
    slug: "google-analytics",
    name: "Google Analytics 4",
    description: "Eventos de conversión desde funnels",
    author: "Nelvyon",
    category: "analytics",
    installCount: 0,
  },
];

export class SaasMarketplaceService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  private async ensureSchema(): Promise<void> {
    await ensureEliteWorldClassSchema(this.db);
  }

  async listApps(tenantId: string): Promise<MarketplaceApp[]> {
    await this.ensureSchema();
    try {
      const rows = await this.db.query<Record<string, unknown>>(
        `SELECT a.id, a.slug, a.name, a.description, a.author, a.category, a.install_count,
                (ti.app_id IS NOT NULL) AS installed
         FROM saas_marketplace_apps a
         LEFT JOIN saas_tenant_installed_apps ti ON ti.app_id=a.id AND ti.tenant_id=$1
         WHERE a.status='published'
         ORDER BY a.install_count DESC, a.name`,
        [tenantId],
      );
      return rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        description: String(r.description),
        author: String(r.author),
        category: String(r.category),
        installCount: Number(r.install_count),
        installed: Boolean(r.installed),
      }));
    } catch (e) {
      if (isPgMissingRelation(e)) {
        return MARKETPLACE_CATALOG_SEED.map((app) => ({ ...app, installed: false }));
      }
      throw e;
    }
  }

  async install(tenantId: string, appId: string): Promise<void> {
    await this.ensureSchema();
    await this.db.query(
      `INSERT INTO saas_tenant_installed_apps (tenant_id, app_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [tenantId, appId],
    );
    await this.db.query(
      `UPDATE saas_marketplace_apps SET install_count = install_count + 1 WHERE id=$1`,
      [appId],
    );
  }

  async uninstall(tenantId: string, appId: string): Promise<void> {
    await this.ensureSchema();
    await this.db.query(
      `DELETE FROM saas_tenant_installed_apps WHERE tenant_id=$1 AND app_id=$2`,
      [tenantId, appId],
    );
  }
}

let _svc: SaasMarketplaceService | undefined;
export function getSaasMarketplaceService(): SaasMarketplaceService {
  if (!_svc) _svc = new SaasMarketplaceService();
  return _svc;
}
