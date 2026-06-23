import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { assertSaasPlanCanCreate } from "./saasPlanQuota";
import { dispatchContactCreated } from "./saasWorkflowDispatch";

export type ContactStatus = "lead" | "prospect" | "client" | "churned";
export type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

export interface SaasContact {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipelineStage: PipelineStage;
  value: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  tenantId: string;
  activityType: ActivityType;
  description: string;
  scheduledAt: string | null;
  completed: boolean;
  createdAt: string;
}

export interface PipelineSummaryItem {
  stage: PipelineStage;
  count: number;
  totalValue: number;
}

export type PipelineSummary = PipelineSummaryItem[];

export class SaasCrmError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasCrmError";
  }
}

const STATUSES: readonly ContactStatus[] = ["lead", "prospect", "client", "churned"] as const;
const STAGES: readonly PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const ACTIVITIES: readonly ActivityType[] = ["note", "call", "email", "meeting", "task"] as const;

type ContactRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipeline_stage: PipelineStage;
  value: string | number;
  notes: string | null;
  tags: string[] | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  tenant_id: string;
  activity_type: ActivityType;
  description: string;
  scheduled_at: Date | string | null;
  completed: boolean;
  created_at: Date | string;
};

type PipelineRow = {
  pipeline_stage: PipelineStage;
  n: string | number;
  total_value: string | number | null;
};

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeOptional(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function assertStatus(v: string): ContactStatus {
  if ((STATUSES as readonly string[]).includes(v)) return v as ContactStatus;
  throw new SaasCrmError("Invalid status", "VALIDATION");
}

function assertStage(v: string): PipelineStage {
  if ((STAGES as readonly string[]).includes(v)) return v as PipelineStage;
  throw new SaasCrmError("Invalid pipeline_stage", "VALIDATION");
}

function assertActivityType(v: string): ActivityType {
  if ((ACTIVITIES as readonly string[]).includes(v)) return v as ActivityType;
  throw new SaasCrmError("Invalid activity_type", "VALIDATION");
}

function isCheckViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23514";
}

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
    value: toNumber(r.value),
    notes: r.notes,
    tags: r.tags ?? [],
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToActivity(r: ActivityRow): ContactActivity {
  return {
    id: r.id,
    contactId: r.contact_id,
    tenantId: r.tenant_id,
    activityType: r.activity_type,
    description: r.description,
    scheduledAt: r.scheduled_at ? toIso(r.scheduled_at) : null,
    completed: r.completed,
    createdAt: toIso(r.created_at),
  };
}

export type ContactFilters = {
  status?: ContactStatus;
  pipeline_stage?: PipelineStage;
  search?: string;
};

export type CreateContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  status?: ContactStatus;
  pipeline_stage?: PipelineStage;
  value?: number;
  notes?: string | null;
  tags?: string[];
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type AddActivityInput = {
  activityType: ActivityType;
  description: string;
  scheduledAt?: string | null;
  completed?: boolean;
};

export class SaasCrmService {
  constructor(private readonly db: SaasPostgresPort) {}

  async createContact(tenantId: string, data: CreateContactInput): Promise<SaasContact> {
    await assertSaasPlanCanCreate(this.db, tenantId, "contacts");
    const name = data.name.trim();
    if (name.length === 0) {
      throw new SaasCrmError("name is required", "VALIDATION");
    }
    const status = data.status ?? "lead";
    const stage = data.pipeline_stage ?? "new";
    assertStatus(status);
    assertStage(stage);
    const value = Number.isFinite(data.value ?? 0) ? Number(data.value ?? 0) : 0;
    try {
      const rows = await this.db.query<ContactRow>(
        `INSERT INTO saas_contacts
         (tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         RETURNING id, tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, created_at, updated_at`,
        [
          tenantId,
          name,
          normalizeOptional(data.email),
          normalizeOptional(data.phone),
          normalizeOptional(data.company),
          normalizeOptional(data.position),
          status,
          stage,
          value,
          normalizeOptional(data.notes),
          data.tags ?? [],
        ],
      );
      const row = rows[0];
      if (!row) throw new SaasCrmError("Failed to create contact", "CONSTRAINT");
      const contact = rowToContact(row);
      void dispatchContactCreated(tenantId, contact);
      return contact;
    } catch (e: unknown) {
      if (isCheckViolation(e)) {
        throw new SaasCrmError("Invalid status or pipeline_stage", "CONSTRAINT");
      }
      throw e;
    }
  }

  async getContacts(tenantId: string, filters?: ContactFilters): Promise<SaasContact[]> {
    const clauses: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (filters?.status) {
      assertStatus(filters.status);
      clauses.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.pipeline_stage) {
      assertStage(filters.pipeline_stage);
      clauses.push(`pipeline_stage = $${idx++}`);
      params.push(filters.pipeline_stage);
    }
    if (filters?.search && filters.search.trim().length > 0) {
      clauses.push(`(name ILIKE $${idx} OR COALESCE(email,'') ILIKE $${idx})`);
      params.push(`%${filters.search.trim()}%`);
      idx += 1;
    }
    const rows = await this.db.query<ContactRow>(
      `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, created_at, updated_at
       FROM saas_contacts
       WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToContact);
  }

  async getContact(tenantId: string, contactId: string): Promise<SaasContact | null> {
    const rows = await this.db.query<ContactRow>(
      `SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, created_at, updated_at
       FROM saas_contacts
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantId, contactId],
    );
    const row = rows[0];
    return row ? rowToContact(row) : null;
  }

  async updateContact(tenantId: string, contactId: string, data: UpdateContactInput): Promise<SaasContact> {
    const existing = await this.getContact(tenantId, contactId);
    if (!existing) {
      throw new SaasCrmError("Contact not found", "NOT_FOUND");
    }
    const status = data.status !== undefined ? assertStatus(data.status) : undefined;
    const stage = data.pipeline_stage !== undefined ? assertStage(data.pipeline_stage) : undefined;
    const name = data.name !== undefined ? data.name.trim() : undefined;
    if (name !== undefined && name.length === 0) {
      throw new SaasCrmError("name cannot be empty", "VALIDATION");
    }
    const rows = await this.db.query<ContactRow>(
      `UPDATE saas_contacts SET
         name = COALESCE($3, name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         company = COALESCE($6, company),
         position = COALESCE($7, position),
         status = COALESCE($8, status),
         pipeline_stage = COALESCE($9, pipeline_stage),
         value = COALESCE($10, value),
         notes = COALESCE($11, notes),
         tags = COALESCE($12, tags),
         updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, created_at, updated_at`,
      [
        tenantId,
        contactId,
        name ?? null,
        data.email === undefined ? null : normalizeOptional(data.email),
        data.phone === undefined ? null : normalizeOptional(data.phone),
        data.company === undefined ? null : normalizeOptional(data.company),
        data.position === undefined ? null : normalizeOptional(data.position),
        status ?? null,
        stage ?? null,
        data.value === undefined ? null : data.value,
        data.notes === undefined ? null : normalizeOptional(data.notes),
        data.tags === undefined ? null : data.tags,
      ],
    );
    const row = rows[0];
    if (!row) throw new SaasCrmError("Contact not found", "NOT_FOUND");
    return rowToContact(row);
  }

  async deleteContact(tenantId: string, contactId: string): Promise<void> {
    await this.db.query(`DELETE FROM saas_contacts WHERE tenant_id = $1 AND id = $2`, [tenantId, contactId]);
  }

  async getPipelineSummary(tenantId: string): Promise<PipelineSummary> {
    const rows = await this.db.query<PipelineRow>(
      `SELECT pipeline_stage, COUNT(*)::text AS n, COALESCE(SUM(value),0)::text AS total_value
       FROM saas_contacts
       WHERE tenant_id = $1
       GROUP BY pipeline_stage`,
      [tenantId],
    );
    const byStage = new Map<PipelineStage, PipelineSummaryItem>();
    for (const s of STAGES) {
      byStage.set(s, { stage: s, count: 0, totalValue: 0 });
    }
    for (const r of rows) {
      byStage.set(r.pipeline_stage, {
        stage: r.pipeline_stage,
        count: toNumber(r.n),
        totalValue: toNumber(r.total_value),
      });
    }
    return STAGES.map((s) => byStage.get(s) as PipelineSummaryItem);
  }

  async addActivity(contactId: string, tenantId: string, data: AddActivityInput): Promise<ContactActivity> {
    const contact = await this.getContact(tenantId, contactId);
    if (!contact) {
      throw new SaasCrmError("Contact not found", "NOT_FOUND");
    }
    const activityType = assertActivityType(data.activityType);
    const description = data.description.trim();
    if (description.length === 0) {
      throw new SaasCrmError("description is required", "VALIDATION");
    }
    const rows = await this.db.query<ActivityRow>(
      `INSERT INTO saas_contact_activities
       (contact_id, tenant_id, activity_type, description, scheduled_at, completed)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, contact_id, tenant_id, activity_type, description, scheduled_at, completed, created_at`,
      [
        contactId,
        tenantId,
        activityType,
        description,
        data.scheduledAt ?? null,
        data.completed ?? false,
      ],
    );
    const row = rows[0];
    if (!row) throw new SaasCrmError("Failed to create activity", "CONSTRAINT");
    return rowToActivity(row);
  }

  async getActivities(contactId: string, tenantId: string): Promise<ContactActivity[]> {
    const rows = await this.db.query<ActivityRow>(
      `SELECT id, contact_id, tenant_id, activity_type, description, scheduled_at, completed, created_at
       FROM saas_contact_activities
       WHERE contact_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [contactId, tenantId],
    );
    return rows.map(rowToActivity);
  }
}

let cached: SaasCrmService | undefined;

export function getSaasCrmService(): SaasCrmService {
  if (!cached) {
    cached = new SaasCrmService(DbClient.getInstance());
  }
  return cached;
}

export function resetSaasCrmServiceForTests(): void {
  cached = undefined;
}
