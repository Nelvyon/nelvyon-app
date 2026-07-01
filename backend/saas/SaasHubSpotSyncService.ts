import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

function mapHubSpotDealStage(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("closedwon") || s.includes("won")) return "won";
  if (s.includes("closedlost") || s.includes("lost")) return "lost";
  if (s.includes("qualified")) return "qualified";
  if (s.includes("proposal") || s.includes("presentation") || s.includes("negotiation")) return "proposal";
  if (s.includes("contact") || s.includes("appointment")) return "contacted";
  return "new";
}

const HUBSPOT_TAG = "source:hubspot";

export type HubSpotSyncState = {
  lastSyncAt: string | null;
  contactsSynced: number;
  dealsSynced: number;
  contactsPushed: number;
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
      contactsPushed: Number(r?.contacts_pushed ?? 0),
      status: String(r?.status ?? "idle"),
      errorMessage: r?.error_message != null ? String(r.error_message) : null,
    };
  }

  /** Pull HubSpot contacts + deals into Nelvyon CRM. */
  async runSync(tenantId: string, accessToken: string): Promise<HubSpotSyncState> {
    await this.db.query(
      `INSERT INTO saas_hubspot_sync_state (tenant_id, status) VALUES ($1,'running')
       ON CONFLICT (tenant_id) DO UPDATE SET status='running', error_message=NULL`,
      [tenantId],
    );

    let contactsSynced = 0;
    let dealsSynced = 0;
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,company", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HubSpot API ${res.status}`);
      const data = (await res.json()) as { results?: Array<{ id: string; properties?: Record<string, string> }> };
      for (const c of data.results ?? []) {
        const email = c.properties?.email?.trim().toLowerCase();
        if (!email) continue;
        const first = c.properties?.firstname?.trim() ?? "";
        const last = c.properties?.lastname?.trim() ?? "";
        const name = `${first} ${last}`.trim() || email;
        const phone = c.properties?.phone?.trim() || null;
        const company = c.properties?.company?.trim() || null;
        const hubTag = `hubspot:id:${c.id}`;

        const updated = await this.db.query<{ id: string }>(
          `UPDATE saas_contacts SET name=$3, phone=COALESCE($4, phone), company=COALESCE($5, company),
                  tags=CASE WHEN $6 = ANY(tags) THEN tags ELSE array_append(tags, $6) END, updated_at=NOW()
           WHERE tenant_id=$1 AND lower(email)=lower($2) RETURNING id`,
          [tenantId, email, name, phone, company, hubTag],
        );
        if (updated[0]) {
          contactsSynced++;
          continue;
        }
        await this.db.query(
          `INSERT INTO saas_contacts (tenant_id, name, email, phone, company, status, tags)
           VALUES ($1,$2,$3,$4,$5,'lead', ARRAY[$6,$7]::text[])`,
          [tenantId, name, email, phone, company, HUBSPOT_TAG, hubTag],
        );
        contactsSynced++;
      }

      const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=50&properties=dealname,amount,dealstage", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (dealRes.ok) {
        const dealData = (await dealRes.json()) as { results?: Array<{ id: string; properties?: Record<string, string> }> };
        for (const d of dealData.results ?? []) {
          const hubspotId = d.id;
          const title = d.properties?.dealname?.trim() || `HubSpot deal ${hubspotId}`;
          const amount = parseFloat(d.properties?.amount ?? "0") || 0;
          const stage = mapHubSpotDealStage(d.properties?.dealstage);
          const noteTag = `hubspot:deal:${hubspotId}`;
          const inserted = await this.db.query<{ id: string }>(
            `INSERT INTO saas_deals (tenant_id, title, value, stage, notes, tags)
             SELECT $1::uuid, $2, $3, $4, $5, ARRAY[$6]::text[]
             WHERE NOT EXISTS (SELECT 1 FROM saas_deals WHERE tenant_id=$1::uuid AND notes=$5)
             RETURNING id`,
            [tenantId, title, amount, stage, noteTag, HUBSPOT_TAG],
          );
          if (inserted.length) dealsSynced++;
        }
      }

      await this.db.query(
        `UPDATE saas_hubspot_sync_state SET last_sync_at=NOW(), contacts_synced=$2, deals_synced=$3, status='ok', error_message=NULL
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

  /** Push Nelvyon contacts (email) not yet in HubSpot. */
  async pushContacts(tenantId: string, accessToken: string, limit = 50): Promise<{ pushed: number }> {
    const rows = await this.db.query<{ email: string; name: string; phone: string | null; company: string | null }>(
      `SELECT email, name, phone, company FROM saas_contacts
       WHERE tenant_id=$1 AND email IS NOT NULL AND NOT ($2 = ANY(tags))
       ORDER BY updated_at DESC LIMIT $3`,
      [tenantId, HUBSPOT_TAG, limit],
    );
    let pushed = 0;
    for (const c of rows) {
      const parts = c.name.trim().split(/\s+/);
      const firstname = parts[0] ?? "";
      const lastname = parts.slice(1).join(" ");
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            email: c.email,
            firstname,
            lastname,
            phone: c.phone ?? "",
            company: c.company ?? "",
          },
        }),
      });
      if (res.ok || res.status === 409) {
        await this.db.query(
          `UPDATE saas_contacts SET tags=array_append(tags, $3), updated_at=NOW()
           WHERE tenant_id=$1 AND lower(email)=lower($2) AND NOT ($3 = ANY(tags))`,
          [tenantId, c.email, HUBSPOT_TAG],
        );
        pushed++;
      }
    }
    await this.db.query(
      `INSERT INTO saas_hubspot_sync_state (tenant_id, contacts_pushed, status)
       VALUES ($1,$2,'ok')
       ON CONFLICT (tenant_id) DO UPDATE SET contacts_pushed=COALESCE(saas_hubspot_sync_state.contacts_pushed,0)+$2`,
      [tenantId, pushed],
    );
    return { pushed };
  }
}

let _svc: SaasHubSpotSyncService | undefined;
export function getSaasHubSpotSyncService(): SaasHubSpotSyncService {
  if (!_svc) _svc = new SaasHubSpotSyncService();
  return _svc;
}
