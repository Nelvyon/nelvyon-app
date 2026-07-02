/**
 * Generic CRM sync — Salesforce, Pipedrive, Zoho (HubSpot uses SaasHubSpotSyncService).
 */
import { DbClient } from "../db/DbClient";

export type CrmSyncSlug = "salesforce" | "pipedrive" | "zoho";

export type CrmSyncState = {
  connectorSlug: string;
  lastSyncAt: string | null;
  contactsSynced: number;
  dealsSynced: number;
  contactsPushed: number;
  status: string;
  errorMessage: string | null;
};

function tagFor(slug: CrmSyncSlug): string {
  return `source:${slug}`;
}

function idTag(slug: CrmSyncSlug, id: string): string {
  return `${slug}:id:${id}`;
}

export class SaasCrmSyncService {
  constructor(private readonly db = DbClient.getInstance()) {}

  async getState(tenantId: string, slug: CrmSyncSlug): Promise<CrmSyncState> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_crm_sync_state WHERE tenant_id=$1 AND connector_slug=$2`,
      [tenantId, slug],
    );
    const r = rows[0];
    return {
      connectorSlug: slug,
      lastSyncAt: r?.last_sync_at != null ? String(r.last_sync_at) : null,
      contactsSynced: Number(r?.contacts_synced ?? 0),
      dealsSynced: Number(r?.deals_synced ?? 0),
      contactsPushed: Number(r?.contacts_pushed ?? 0),
      status: String(r?.status ?? "idle"),
      errorMessage: r?.error_message != null ? String(r.error_message) : null,
    };
  }

  private async markRunning(tenantId: string, slug: CrmSyncSlug): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_crm_sync_state (tenant_id, connector_slug, status)
       VALUES ($1,$2,'running')
       ON CONFLICT (tenant_id, connector_slug) DO UPDATE SET status='running', error_message=NULL`,
      [tenantId, slug],
    );
  }

  private async markOk(
    tenantId: string,
    slug: CrmSyncSlug,
    contactsSynced: number,
    dealsSynced: number,
  ): Promise<void> {
    await this.db.query(
      `UPDATE saas_crm_sync_state SET last_sync_at=NOW(), contacts_synced=$3, deals_synced=$4,
              status='ok', error_message=NULL
       WHERE tenant_id=$1 AND connector_slug=$2`,
      [tenantId, slug, contactsSynced, dealsSynced],
    );
  }

  private async markError(tenantId: string, slug: CrmSyncSlug, msg: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_crm_sync_state SET status='error', error_message=$3 WHERE tenant_id=$1 AND connector_slug=$2`,
      [tenantId, slug, msg],
    );
  }

  private async upsertContact(
    tenantId: string,
    slug: CrmSyncSlug,
    email: string,
    name: string,
    phone: string | null,
    company: string | null,
    externalId: string,
  ): Promise<boolean> {
    const sourceTag = tagFor(slug);
    const extTag = idTag(slug, externalId);
    const updated = await this.db.query<{ id: string }>(
      `UPDATE saas_contacts SET name=$3, phone=COALESCE($4, phone), company=COALESCE($5, company),
              tags=CASE WHEN $6 = ANY(tags) THEN tags ELSE array_append(tags, $6) END, updated_at=NOW()
       WHERE tenant_id=$1 AND lower(email)=lower($2) RETURNING id`,
      [tenantId, email, name, phone, company, extTag],
    );
    if (updated[0]) return true;
    await this.db.query(
      `INSERT INTO saas_contacts (tenant_id, name, email, phone, company, status, tags)
       VALUES ($1,$2,$3,$4,$5,'lead', ARRAY[$6,$7]::text[])`,
      [tenantId, name, email, phone, company, sourceTag, extTag],
    );
    return true;
  }

  async runSync(tenantId: string, slug: CrmSyncSlug, accessToken: string): Promise<CrmSyncState> {
    await this.markRunning(tenantId, slug);
    let contactsSynced = 0;
    let dealsSynced = 0;
    try {
      if (slug === "salesforce") {
        const meta = await this.db.query<{ metadata: Record<string, unknown> }>(
          `SELECT metadata FROM saas_integration_connections
           WHERE tenant_id=$1 AND connector_slug='salesforce' LIMIT 1`,
          [tenantId],
        );
        const instance =
          String(meta[0]?.metadata?.instance_url ?? meta[0]?.metadata?.instanceUrl ?? "").replace(/\/$/, "")
          || "https://login.salesforce.com";
        const q = encodeURIComponent("SELECT Id,Email,Name,Phone FROM Contact WHERE Email != null LIMIT 100");
        const res = await fetch(`${instance}/services/data/v59.0/query?q=${q}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Salesforce API ${res.status}`);
        const data = (await res.json()) as { records?: Array<{ Id: string; Email: string; Name: string; Phone?: string }> };
        for (const c of data.records ?? []) {
          const email = c.Email?.trim().toLowerCase();
          if (!email) continue;
          if (await this.upsertContact(tenantId, slug, email, c.Name ?? email, c.Phone ?? null, null, c.Id)) {
            contactsSynced++;
          }
        }
        const dq = encodeURIComponent("SELECT Id,Name,Amount,StageName FROM Opportunity LIMIT 50");
        const dealRes = await fetch(`${instance}/services/data/v59.0/query?q=${dq}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (dealRes.ok) {
          const dealData = (await dealRes.json()) as { records?: Array<{ Id: string; Name: string; Amount?: number; StageName?: string }> };
          for (const d of dealData.records ?? []) {
            const noteTag = `${slug}:deal:${d.Id}`;
            const stageRaw = (d.StageName ?? "").toLowerCase();
            const stage = stageRaw.includes("won") ? "won" : stageRaw.includes("lost") ? "lost" : "proposal";
            const inserted = await this.db.query<{ id: string }>(
              `INSERT INTO saas_deals (tenant_id, title, value, stage, notes, tags)
               SELECT $1::uuid, $2, $3, $4, $5, ARRAY[$6]::text[]
               WHERE NOT EXISTS (SELECT 1 FROM saas_deals WHERE tenant_id=$1::uuid AND notes=$5)
               RETURNING id`,
              [tenantId, d.Name ?? `SF ${d.Id}`, Number(d.Amount ?? 0), stage, noteTag, tagFor(slug)],
            );
            if (inserted.length) dealsSynced++;
          }
        }
      } else if (slug === "pipedrive") {
        const res = await fetch("https://api.pipedrive.com/v1/persons?limit=100", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Pipedrive API ${res.status}`);
        const data = (await res.json()) as {
          data?: Array<{ id: number; name: string; email?: Array<{ value: string }>; phone?: Array<{ value: string }> }>;
        };
        for (const p of data.data ?? []) {
          const email = p.email?.[0]?.value?.trim().toLowerCase();
          if (!email) continue;
          const phone = p.phone?.[0]?.value ?? null;
          if (await this.upsertContact(tenantId, slug, email, p.name, phone, null, String(p.id))) {
            contactsSynced++;
          }
        }
        const dealRes = await fetch("https://api.pipedrive.com/v1/deals?limit=50", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (dealRes.ok) {
          const dealData = (await dealRes.json()) as { data?: Array<{ id: number; title: string; value?: number; status?: string }> };
          for (const d of dealData.data ?? []) {
            const noteTag = `${slug}:deal:${d.id}`;
            const inserted = await this.db.query<{ id: string }>(
              `INSERT INTO saas_deals (tenant_id, title, value, stage, notes, tags)
               SELECT $1::uuid, $2, $3, 'proposal', $4, ARRAY[$5]::text[]
               WHERE NOT EXISTS (SELECT 1 FROM saas_deals WHERE tenant_id=$1::uuid AND notes=$4)
               RETURNING id`,
              [tenantId, d.title, Number(d.value ?? 0), noteTag, tagFor(slug)],
            );
            if (inserted.length) dealsSynced++;
          }
        }
      } else if (slug === "zoho") {
        const res = await fetch("https://www.zohoapis.com/crm/v2/Contacts?per_page=100", {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Zoho API ${res.status}`);
        const data = (await res.json()) as {
          data?: Array<{ id: string; Email?: string; Full_Name?: string; Phone?: string; Account_Name?: { name?: string } }>;
        };
        for (const c of data.data ?? []) {
          const email = c.Email?.trim().toLowerCase();
          if (!email) continue;
          if (await this.upsertContact(
            tenantId, slug, email, c.Full_Name ?? email, c.Phone ?? null,
            c.Account_Name?.name ?? null, c.id,
          )) {
            contactsSynced++;
          }
        }
        const dealRes = await fetch("https://www.zohoapis.com/crm/v2/Deals?per_page=50", {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        });
        if (dealRes.ok) {
          const dealData = (await dealRes.json()) as { data?: Array<{ id: string; Deal_Name?: string; Amount?: number }> };
          for (const d of dealData.data ?? []) {
            const noteTag = `${slug}:deal:${d.id}`;
            const inserted = await this.db.query<{ id: string }>(
              `INSERT INTO saas_deals (tenant_id, title, value, stage, notes, tags)
               SELECT $1::uuid, $2, $3, 'proposal', $4, ARRAY[$5]::text[]
               WHERE NOT EXISTS (SELECT 1 FROM saas_deals WHERE tenant_id=$1::uuid AND notes=$4)
               RETURNING id`,
              [tenantId, d.Deal_Name ?? `Zoho ${d.id}`, Number(d.Amount ?? 0), noteTag, tagFor(slug)],
            );
            if (inserted.length) dealsSynced++;
          }
        }
      }
      await this.markOk(tenantId, slug, contactsSynced, dealsSynced);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed";
      await this.markError(tenantId, slug, msg);
      throw e;
    }
    return this.getState(tenantId, slug);
  }

  async pushContacts(tenantId: string, slug: CrmSyncSlug, accessToken: string, limit = 50): Promise<{ pushed: number }> {
    const sourceTag = tagFor(slug);
    const rows = await this.db.query<{ email: string; name: string; phone: string | null; company: string | null }>(
      `SELECT email, name, phone, company FROM saas_contacts
       WHERE tenant_id=$1 AND email IS NOT NULL AND NOT ($2 = ANY(tags))
       ORDER BY updated_at DESC LIMIT $3`,
      [tenantId, sourceTag, limit],
    );
    let pushed = 0;
    for (const c of rows) {
      let ok = false;
      if (slug === "salesforce") {
        const res = await fetch("https://login.salesforce.com/services/data/v59.0/sobjects/Contact", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ LastName: c.name.split(/\s+/).pop() ?? c.name, FirstName: c.name.split(/\s+/)[0] ?? "", Email: c.email, Phone: c.phone ?? "", AccountId: null }),
        });
        ok = res.ok || res.status === 400;
      } else if (slug === "pipedrive") {
        const res = await fetch("https://api.pipedrive.com/v1/persons", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: c.name, email: [{ value: c.email, primary: true }], phone: c.phone ? [{ value: c.phone }] : [] }),
        });
        ok = res.ok;
      } else if (slug === "zoho") {
        const res = await fetch("https://www.zohoapis.com/crm/v2/Contacts", {
          method: "POST",
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ data: [{ Last_Name: c.name, Email: c.email, Phone: c.phone ?? "" }] }),
        });
        ok = res.ok;
      }
      if (ok) {
        await this.db.query(
          `UPDATE saas_contacts SET tags=array_append(tags, $3), updated_at=NOW()
           WHERE tenant_id=$1 AND lower(email)=lower($2) AND NOT ($3 = ANY(tags))`,
          [tenantId, c.email, sourceTag],
        );
        pushed++;
      }
    }
    await this.db.query(
      `INSERT INTO saas_crm_sync_state (tenant_id, connector_slug, contacts_pushed, status)
       VALUES ($1,$2,$3,'ok')
       ON CONFLICT (tenant_id, connector_slug) DO UPDATE
         SET contacts_pushed=COALESCE(saas_crm_sync_state.contacts_pushed,0)+$3`,
      [tenantId, slug, pushed],
    );
    return { pushed };
  }
}

let _svc: SaasCrmSyncService | undefined;
export function getSaasCrmSyncService(): SaasCrmSyncService {
  if (!_svc) _svc = new SaasCrmSyncService();
  return _svc;
}
