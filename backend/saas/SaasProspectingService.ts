import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasCrmService } from "./SaasCrmService";

export interface ProspectFilter {
  industry: string;
  country: string;
  minEmployees: number;
  maxEmployees: number;
  jobTitle: string;
  keywords: string;
}

export interface ProspectingList {
  id: string;
  name: string;
  filter: ProspectFilter;
  prospects: number;
  enriched: number;
  createdAt: string;
  status: "running" | "done" | "paused";
}

export interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  country: string;
  employees: number;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  enriched: boolean;
  addedToCrm: boolean;
}

export class SaasProspectingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "VALIDATION"
      | "NOT_CONFIGURED"
      | "NOT_MIGRATED"
      | "APOLLO_ERROR"
      | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasProspectingError";
  }
}

function isMissingRelation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "42P01";
}

type ListRow = {
  id: string;
  tenant_id: string;
  name: string;
  filter: ProspectFilter | Record<string, unknown>;
  status: string;
  prospects_count: number;
  enriched_count: number;
  created_at: Date | string;
};

type ProspectRow = {
  id: string;
  tenant_id: string;
  list_id: string;
  apollo_person_id: string | null;
  name: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  country: string | null;
  employees: number;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  enriched: boolean;
  added_to_crm: boolean;
  crm_contact_id: string | null;
};

const COUNTRY_MAP: Record<string, string> = {
  ES: "Spain",
  MX: "Mexico",
  AR: "Argentina",
  CO: "Colombia",
  US: "United States",
  UK: "United Kingdom",
};

const APOLLO_EMPLOYEE_RANGES = [
  { min: 1, max: 10, value: "1,10" },
  { min: 11, max: 20, value: "11,20" },
  { min: 21, max: 50, value: "21,50" },
  { min: 51, max: 100, value: "51,100" },
  { min: 101, max: 200, value: "101,200" },
  { min: 201, max: 500, value: "201,500" },
  { min: 501, max: 1000, value: "501,1000" },
  { min: 1001, max: 5000, value: "1001,5000" },
  { min: 5001, max: 10000, value: "5001,10000" },
] as const;

function defaultFilter(raw?: Partial<ProspectFilter>): ProspectFilter {
  return {
    industry: raw?.industry ?? "Todos",
    country: raw?.country ?? "Todos",
    minEmployees: raw?.minEmployees ?? 1,
    maxEmployees: raw?.maxEmployees ?? 10000,
    jobTitle: raw?.jobTitle ?? "",
    keywords: raw?.keywords ?? "",
  };
}

function rowToList(r: ListRow): ProspectingList {
  return {
    id: r.id,
    name: r.name,
    filter: defaultFilter(r.filter as Partial<ProspectFilter>),
    prospects: r.prospects_count,
    enriched: r.enriched_count,
    createdAt: new Date(r.created_at).toISOString(),
    status: r.status === "running" || r.status === "paused" ? r.status : "done",
  };
}

function rowToProspect(r: ProspectRow): Prospect {
  return {
    id: r.id,
    name: r.name,
    title: r.title ?? "",
    company: r.company ?? "",
    industry: r.industry ?? "",
    country: r.country ?? "",
    employees: r.employees ?? 0,
    email: r.email,
    linkedinUrl: r.linkedin_url,
    phone: r.phone,
    enriched: r.enriched,
    addedToCrm: r.added_to_crm,
  };
}

export function isApolloConfigured(): boolean {
  return Boolean(process.env.APOLLO_API_KEY?.trim());
}

function toApolloEmployeeRange(minEmployees: number, maxEmployees: number): string | undefined {
  for (const range of APOLLO_EMPLOYEE_RANGES) {
    if (range.max >= minEmployees && range.min <= maxEmployees) return range.value;
  }
  return undefined;
}

function buildApolloPayload(filter: ProspectFilter): Record<string, unknown> {
  const payload: Record<string, unknown> = { page: 1, per_page: 25 };
  if (filter.jobTitle.trim()) payload.person_titles = [filter.jobTitle.trim()];
  if (filter.country !== "Todos") {
    const loc = COUNTRY_MAP[filter.country] ?? filter.country;
    payload.person_locations = [loc];
  }
  const tags: string[] = [];
  if (filter.industry !== "Todos") tags.push(filter.industry);
  if (filter.keywords.trim()) {
    for (const kw of filter.keywords.split(",").map((k) => k.trim()).filter(Boolean)) tags.push(kw);
  }
  if (tags.length > 0) payload.q_organization_keyword_tags = tags;
  const empRange = toApolloEmployeeRange(filter.minEmployees, filter.maxEmployees);
  if (empRange) payload.organization_num_employees_ranges = [empRange];
  return payload;
}

type ApolloPerson = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  country?: string;
  phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string }>;
  organization?: {
    name?: string;
    primary_industry?: string;
    estimated_num_employees?: number;
  };
};

export class SaasProspectingService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  isConfigured(): boolean {
    return isApolloConfigured();
  }

  async listLists(tenantId: string): Promise<ProspectingList[]> {
    try {
      const rows = await this.db.query<ListRow>(
        `SELECT id, tenant_id, name, filter, status, prospects_count, enriched_count, created_at
         FROM saas_prospecting_lists
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId],
      );
      return rows.map(rowToList);
    } catch (e) {
      if (isMissingRelation(e)) return [];
      throw e;
    }
  }

  async listProspects(tenantId: string, listId: string): Promise<Prospect[]> {
    try {
      const rows = await this.db.query<ProspectRow>(
        `SELECT id, tenant_id, list_id, apollo_person_id, name, title, company, industry, country,
                employees, email, linkedin_url, phone, enriched, added_to_crm, crm_contact_id
         FROM saas_prospecting_prospects
         WHERE tenant_id = $1 AND list_id = $2
         ORDER BY created_at ASC`,
        [tenantId, listId],
      );
      return rows.map(rowToProspect);
    } catch (e) {
      if (isMissingRelation(e)) return [];
      throw e;
    }
  }

  async searchAndCreateList(
    tenantId: string,
    name: string,
    filterInput: Partial<ProspectFilter>,
  ): Promise<{ list: ProspectingList; prospects: Prospect[] }> {
    if (!isApolloConfigured()) {
      throw new SaasProspectingError("APOLLO_API_KEY not configured", "NOT_CONFIGURED");
    }
    const listName = name.trim();
    if (!listName) throw new SaasProspectingError("name is required", "VALIDATION");
    const filter = defaultFilter(filterInput);

    let listRow: ListRow;
    let searchId: string | undefined;
    try {
      const listRows = await this.db.query<ListRow>(
        `INSERT INTO saas_prospecting_lists (tenant_id, name, filter, status)
         VALUES ($1, $2, $3::jsonb, 'running')
         RETURNING id, tenant_id, name, filter, status, prospects_count, enriched_count, created_at`,
        [tenantId, listName, JSON.stringify(filter)],
      );
      listRow = listRows[0]!;
      if (!listRow) throw new SaasProspectingError("Failed to create list", "VALIDATION");

      const searchRows = await this.db.query<{ id: string }>(
        `INSERT INTO saas_prospecting_searches (tenant_id, list_id, filter, status)
         VALUES ($1, $2, $3::jsonb, 'running')
         RETURNING id`,
        [tenantId, listRow.id, JSON.stringify(filter)],
      );
      searchId = searchRows[0]?.id;
    } catch (e) {
      if (isMissingRelation(e)) {
        throw new SaasProspectingError(
          "Prospecting tables not migrated — run migration 508",
          "NOT_MIGRATED",
        );
      }
      throw e;
    }

    try {
      const apolloPeople = await this.fetchApolloPeople(filter);
      const prospects = await this.insertProspects(tenantId, listRow.id, apolloPeople);
      const enrichedCount = prospects.filter((p) => p.enriched).length;

      await this.db.query(
        `UPDATE saas_prospecting_lists
         SET status = 'done', prospects_count = $3, enriched_count = $4, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, listRow.id, prospects.length, enrichedCount],
      );
      if (searchId) {
        await this.db.query(
          `UPDATE saas_prospecting_searches
           SET status = 'completed', apollo_total_entries = $3
           WHERE id = $1 AND tenant_id = $2`,
          [searchId, tenantId, prospects.length],
        );
      }

      return {
        list: {
          ...rowToList(listRow),
          prospects: prospects.length,
          enriched: enrichedCount,
          status: "done",
        },
        prospects,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Apollo search failed";
      if (searchId) {
        await this.db.query(
          `UPDATE saas_prospecting_searches SET status = 'failed', error_message = $3 WHERE id = $1 AND tenant_id = $2`,
          [searchId, tenantId, message],
        );
      }
      await this.db.query(
        `UPDATE saas_prospecting_lists SET status = 'paused', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, listRow.id],
      );
      if (e instanceof SaasProspectingError) throw e;
      throw new SaasProspectingError(message, "APOLLO_ERROR");
    }
  }

  async syncToCrm(tenantId: string, prospectIds: string[]): Promise<{ synced: number; skipped: number }> {
    if (prospectIds.length === 0) throw new SaasProspectingError("prospectIds required", "VALIDATION");
    const rows = await this.db.query<ProspectRow>(
      `SELECT id, tenant_id, list_id, apollo_person_id, name, title, company, industry, country,
              employees, email, linkedin_url, phone, enriched, added_to_crm, crm_contact_id
       FROM saas_prospecting_prospects
       WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
      [tenantId, prospectIds],
    );
    const crm = getSaasCrmService();
    let synced = 0;
    let skipped = 0;
    for (const row of rows) {
      if (row.added_to_crm) {
        skipped += 1;
        continue;
      }
      if (!row.email?.trim()) {
        skipped += 1;
        continue;
      }
      const contact = await crm.createContact(tenantId, {
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        position: row.title,
        tags: ["prospecting"],
      });
      await this.db.query(
        `UPDATE saas_prospecting_prospects
         SET added_to_crm = TRUE, crm_contact_id = $3
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, row.id, contact.id],
      );
      synced += 1;
    }
    return { synced, skipped };
  }

  private async fetchApolloPeople(filter: ProspectFilter): Promise<ApolloPerson[]> {
    const apiKey = process.env.APOLLO_API_KEY!.trim();
    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(buildApolloPayload(filter)),
    });
    const body = (await res.json().catch(() => ({}))) as { people?: ApolloPerson[]; error?: string; message?: string };
    if (!res.ok) {
      throw new SaasProspectingError(
        body.error ?? body.message ?? `Apollo API HTTP ${res.status}`,
        "APOLLO_ERROR",
      );
    }
    return body.people ?? [];
  }

  private async insertProspects(tenantId: string, listId: string, people: ApolloPerson[]): Promise<Prospect[]> {
    const prospects: Prospect[] = [];
    for (const person of people) {
      const apolloId = person.id?.trim() || null;
      const name =
        person.name?.trim() ||
        [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
        "Unknown";
      const email = person.email?.trim() || null;
      const phone = person.phone_numbers?.[0]?.sanitized_number ?? person.phone_numbers?.[0]?.raw_number ?? null;
      const enriched = Boolean(email || phone);
      const params = [
        tenantId,
        listId,
        apolloId,
        name,
        person.title ?? null,
        person.organization?.name ?? null,
        person.organization?.primary_industry ?? null,
        person.country ?? null,
        person.organization?.estimated_num_employees ?? 0,
        email,
        person.linkedin_url ?? null,
        phone,
        enriched,
      ];
      const returning = `RETURNING id, tenant_id, list_id, apollo_person_id, name, title, company, industry, country,
                   employees, email, linkedin_url, phone, enriched, added_to_crm, crm_contact_id`;
      const rows = apolloId
        ? await this.db.query<ProspectRow>(
            `INSERT INTO saas_prospecting_prospects
             (tenant_id, list_id, apollo_person_id, name, title, company, industry, country, employees,
              email, linkedin_url, phone, enriched)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ON CONFLICT (list_id, apollo_person_id) DO UPDATE SET
               name = EXCLUDED.name,
               title = EXCLUDED.title,
               company = EXCLUDED.company,
               industry = EXCLUDED.industry,
               country = EXCLUDED.country,
               employees = EXCLUDED.employees,
               email = COALESCE(EXCLUDED.email, saas_prospecting_prospects.email),
               linkedin_url = COALESCE(EXCLUDED.linkedin_url, saas_prospecting_prospects.linkedin_url),
               phone = COALESCE(EXCLUDED.phone, saas_prospecting_prospects.phone),
               enriched = EXCLUDED.enriched OR saas_prospecting_prospects.enriched
             ${returning}`,
            params,
          )
        : await this.db.query<ProspectRow>(
            `INSERT INTO saas_prospecting_prospects
             (tenant_id, list_id, apollo_person_id, name, title, company, industry, country, employees,
              email, linkedin_url, phone, enriched)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ${returning}`,
            params,
          );
      if (rows[0]) prospects.push(rowToProspect(rows[0]));
    }
    return prospects;
  }
}

let _instance: SaasProspectingService | null = null;
export function getSaasProspectingService(): SaasProspectingService {
  if (!_instance) _instance = new SaasProspectingService();
  return _instance;
}
export function resetSaasProspectingServiceForTests(): void {
  _instance = null;
}
