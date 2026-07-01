import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type HubSpotSyncState = {
  lastSyncAt: string | null;
  contactsSynced: number;
  dealsSynced: number;
  status: string;
  errorMessage: string | null;
};

export class SaasHubSpotSyncService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async getState(tenantId: string): Promise<HubSpotSyncState> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT last_sync_at, contacts_synced, deals_synced, status, error_message
       FROM saas_hubspot_sync_state WHERE tenant_id=$1`,
      [tenantId],
    );
    const r = rows[0];
    return {
      lastSyncAt: r?.last_sync_at != null ? String(r.last_sync_at) : null,
      contactsSynced: Number(r?.contacts_synced ?? 0),
      dealsSynced: Number(r?.deals_synced ?? 0),
      status: String(r?.status ?? "idle"),
      errorMessage: r?.error_message != null ? String(r.error_message) : null,
    };
  }

  /** Bidirectional sync stub — pulls HubSpot contacts via stored OAuth token. */
  async runSync(tenantId: string, accessToken: string): Promise<HubSpotSyncState> {
    await this.db.query(
      `INSERT INTO saas_hubspot_sync_state (tenant_id, status) VALUES ($1,'running')
       ON CONFLICT (tenant_id) DO UPDATE SET status='running', error_message=NULL`,
      [tenantId],
    );

    let contactsSynced = 0;
    let dealsSynced = 0;
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HubSpot API ${res.status}`);
      const data = (await res.json()) as { results?: Array<{ id: string; properties?: Record<string, string> }> };
      for (const c of data.results ?? []) {
        const email = c.properties?.email?.trim();
        if (!email) continue;
        await this.db.query(
          `INSERT INTO saas_contacts (tenant_id, email, first_name, last_name, status, source)
           SELECT $1,$2,$3,$4,'lead','hubspot'
           WHERE NOT EXISTS (SELECT 1 FROM saas_contacts WHERE tenant_id=$1 AND lower(email)=lower($2))`,
          [
            tenantId,
            email.toLowerCase(),
            c.properties?.firstname ?? "",
            c.properties?.lastname ?? "",
          ],
        );
        contactsSynced++;
      }

      const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=50", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (dealRes.ok) {
        const dealData = (await dealRes.json()) as { results?: Array<{ id: string; properties?: Record<string, string> }> };
        dealsSynced = dealData.results?.length ?? 0;
      }

      await this.db.query(
        `UPDATE saas_hubspot_sync_state SET last_sync_at=NOW(), contacts_synced=$2, deals_synced=$3, status='ok'
         WHERE tenant_id=$1`,
        [tenantId, contactsSynced, dealsSynced],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed";
      await this.db.query(
        `UPDATE saas_hubspot_sync_state SET status='error', error_message=$2 WHERE tenant_id=$1`,
        [tenantId, msg],
      );
      throw e;
    }
    return this.getState(tenantId);
  }
}

let _svc: SaasHubSpotSyncService | undefined;
export function getSaasHubSpotSyncService(): SaasHubSpotSyncService {
  if (!_svc) _svc = new SaasHubSpotSyncService();
  return _svc;
}
