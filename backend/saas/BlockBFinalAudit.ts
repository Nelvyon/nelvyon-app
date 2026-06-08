import type { SaasPostgresPort } from "./SaasOnboardingService";

export type BlockBFinalAuditReport = {
  executedAt: string;
  saasContactsTotal: number;
  saasDealsTotal: number;
  contactsWithEtlTag: number;
  dealsFromEtl: number;
  /** Misma clave dedupe (email por tenant) en saas_contacts. */
  contactDuplicateGroups: number;
  contactDuplicateRows: number;
  /** Deals sin contact_id (incl. pipeline_deals). */
  dealsWithoutContact: number;
  /** Deals ETL de fuentes con contacto legacy pero contact_id NULL. */
  dealOrphans: number;
  legacyContactsRemaining: number;
  legacyCrmContactsRemaining: number;
  legacyDealsRemaining: number;
  legacyCrmDealsRemaining: number;
  legacyPipelineDealsRemaining: number;
};

export class BlockBFinalAuditService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(): Promise<BlockBFinalAuditReport> {
    const [contactsTotal] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_contacts`,
    );
    const [dealsTotal] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_deals`,
    );
    const [withEtl] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_contacts
       WHERE EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE 'etl:legacy_id:%')`,
    );
    const [dealsEtl] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_deals WHERE source LIKE 'etl:legacy_id:%'`,
    );
    const [dupGroups] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM (
         SELECT tenant_id, lower(trim(email))
         FROM saas_contacts
         WHERE email IS NOT NULL AND trim(email) <> ''
         GROUP BY tenant_id, lower(trim(email))
         HAVING COUNT(*) > 1
       ) d`,
    );
    const [dupRows] = await this.db.query<{ n: string }>(
      `SELECT COALESCE(SUM(c - 1), 0)::text AS n FROM (
         SELECT COUNT(*)::int AS c
         FROM saas_contacts
         WHERE email IS NOT NULL AND trim(email) <> ''
         GROUP BY tenant_id, lower(trim(email))
         HAVING COUNT(*) > 1
       ) d`,
    );
    const [noContact] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_deals WHERE contact_id IS NULL`,
    );
    const [orphans] = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_deals
       WHERE contact_id IS NULL
         AND source IS NOT NULL
         AND source NOT LIKE 'etl:legacy_id:pipeline_deals:%'`,
    );

    const legacy = await this.countLegacyTables();

    return {
      executedAt: new Date().toISOString(),
      saasContactsTotal: toInt(contactsTotal?.n),
      saasDealsTotal: toInt(dealsTotal?.n),
      contactsWithEtlTag: toInt(withEtl?.n),
      dealsFromEtl: toInt(dealsEtl?.n),
      contactDuplicateGroups: toInt(dupGroups?.n),
      contactDuplicateRows: toInt(dupRows?.n),
      dealsWithoutContact: toInt(noContact?.n),
      dealOrphans: toInt(orphans?.n),
      ...legacy,
    };
  }

  private async countLegacyTables(): Promise<{
    legacyContactsRemaining: number;
    legacyCrmContactsRemaining: number;
    legacyDealsRemaining: number;
    legacyCrmDealsRemaining: number;
    legacyPipelineDealsRemaining: number;
  }> {
    const zero = {
      legacyContactsRemaining: 0,
      legacyCrmContactsRemaining: 0,
      legacyDealsRemaining: 0,
      legacyCrmDealsRemaining: 0,
      legacyPipelineDealsRemaining: 0,
    };
    const contacts = await this.tableCount("contacts", `workspace_id IS NOT NULL`);
    const crmContacts = await this.tableCount("crm_contacts", `workspace_id IS NOT NULL`);
    const deals = await this.tableCount("deals", `workspace_id IS NOT NULL`);
    const crmDeals = await this.tableCount("crm_deals", `workspace_id IS NOT NULL`);
    const pipeline = await this.tableCount("pipeline_deals", `workspace_id IS NOT NULL`);
    return {
      legacyContactsRemaining: contacts,
      legacyCrmContactsRemaining: crmContacts,
      legacyDealsRemaining: deals,
      legacyCrmDealsRemaining: crmDeals,
      legacyPipelineDealsRemaining: pipeline,
    };
  }

  private async tableCount(table: string, where: string): Promise<number> {
    const reg = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass($1)::text AS reg`,
      [`public.${table}`],
    );
    if (!reg[0]?.reg) return 0;
    const rows = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM ${table} WHERE ${where}`,
    );
    return toInt(rows[0]?.n);
  }
}

function toInt(v: string | number | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}
