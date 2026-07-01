import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { buildDedupeKey, normalizeEmail } from "./saasCrmDedupe";
import type { SaasContact } from "./SaasCrmService";

export type CrmDuplicateGroup = {
  dedupeKey: string;
  email: string | null;
  contactIds: string[];
  count: number;
};

export class SaasCrmDedupeError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasCrmDedupeError";
  }
}

type ContactRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: SaasContact["status"];
  pipeline_stage: SaasContact["pipelineStage"];
  value: string | number;
  notes: string | null;
  tags: string[] | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToContact(r: ContactRow): SaasContact {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    position: r.position,
    status: r.status,
    pipelineStage: r.pipeline_stage,
    value: Number(r.value ?? 0),
    notes: r.notes,
    tags: r.tags ?? [],
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class SaasCrmDedupeService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async scanDuplicates(tenantId: string, limit = 100): Promise<CrmDuplicateGroup[]> {
    const rows = await this.db.query<ContactRow>(
      `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage,
              value, notes, tags, created_at, updated_at
       FROM saas_contacts WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );

    const groups = new Map<string, CrmDuplicateGroup>();
    for (const row of rows) {
      const key = buildDedupeKey(tenantId, row.email, row.phone, row.name);
      const existing = groups.get(key);
      if (existing) {
        existing.contactIds.push(row.id);
        existing.count += 1;
      } else {
        groups.set(key, {
          dedupeKey: key,
          email: normalizeEmail(row.email),
          contactIds: [row.id],
          count: 1,
        });
      }
    }

    return [...groups.values()]
      .filter((g) => g.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async mergeContacts(tenantId: string, keepId: string, mergeIds: string[]): Promise<SaasContact> {
    const uniqueMerge = [...new Set(mergeIds.filter((id) => id !== keepId))];
    if (uniqueMerge.length === 0) {
      throw new SaasCrmDedupeError("mergeIds must include at least one contact to merge", "VALIDATION");
    }

    const keep = await this.db.query<ContactRow>(
      `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage,
              value, notes, tags, created_at, updated_at
       FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, keepId],
    );
    if (!keep[0]) throw new SaasCrmDedupeError("Primary contact not found", "NOT_FOUND");

    for (const mergeId of uniqueMerge) {
      const dup = await this.db.query<ContactRow>(
        `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage,
                value, notes, tags, created_at, updated_at
         FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
        [tenantId, mergeId],
      );
      if (!dup[0]) continue;

      const keepKey = buildDedupeKey(tenantId, keep[0].email, keep[0].phone, keep[0].name);
      const dupKey = buildDedupeKey(tenantId, dup[0].email, dup[0].phone, dup[0].name);
      if (keepKey !== dupKey) {
        throw new SaasCrmDedupeError("Contacts do not share the same dedupe key", "VALIDATION");
      }

      await this.db.query(
        `UPDATE saas_contact_activities SET contact_id = $3 WHERE tenant_id = $1 AND contact_id = $2`,
        [tenantId, mergeId, keepId],
      );
      await this.db.query(`DELETE FROM saas_contacts WHERE tenant_id = $1 AND id = $2`, [tenantId, mergeId]);
    }

    const refreshed = await this.db.query<ContactRow>(
      `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage,
              value, notes, tags, created_at, updated_at
       FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, keepId],
    );
    if (!refreshed[0]) throw new SaasCrmDedupeError("Primary contact not found after merge", "NOT_FOUND");
    return rowToContact(refreshed[0]);
  }
}

let _svc: SaasCrmDedupeService | undefined;
export function getSaasCrmDedupeService(): SaasCrmDedupeService {
  _svc ??= new SaasCrmDedupeService();
  return _svc;
}
export function resetSaasCrmDedupeServiceForTests(): void {
  _svc = undefined;
}
