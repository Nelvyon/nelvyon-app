import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { ensureEliteWorldClassSchema } from "./ensureEliteWorldClassSchema";

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

export class SaasMarketplaceService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  private async ensureSchema(): Promise<void> {
    await ensureEliteWorldClassSchema(this.db);
  }

  async listApps(tenantId: string): Promise<MarketplaceApp[]> {
    await this.ensureSchema();
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
