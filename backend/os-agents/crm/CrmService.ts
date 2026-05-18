import { DbClient } from "../../db/DbClient";
import type { CrmActivity, CrmContact, CrmContactFilters, CrmContactUpsert } from "./types";

type ContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  stage: string;
  score: number;
  tags: string[] | null;
  notes: string | null;
  metadata: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  user_id: string;
  type: string;
  summary: string | null;
  agent_id: string | null;
  metadata: unknown;
  created_at: Date | string;
};

function rowContact(r: ContactRow): CrmContact {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    industry: r.industry,
    stage: r.stage,
    score: r.score,
    tags: r.tags,
    notes: r.notes,
    metadata: r.metadata,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}

function rowActivity(r: ActivityRow): CrmActivity {
  return {
    id: r.id,
    contactId: r.contact_id,
    userId: r.user_id,
    type: r.type,
    summary: r.summary,
    agentId: r.agent_id,
    metadata: r.metadata,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

const STAGES = new Set(["lead", "prospect", "proposal", "won", "lost"]);

export class CrmService {
  static async upsertContact(userId: string, data: CrmContactUpsert): Promise<CrmContact> {
    const db = DbClient.getInstance();
    if (data.id?.trim()) {
      const nextStage = data.stage && STAGES.has(data.stage) ? data.stage : undefined;
      const rows = await db.query<ContactRow>(
        `UPDATE crm_contacts SET
          name = $3,
          email = $4,
          phone = $5,
          company = $6,
          industry = $7,
          stage = COALESCE($8::text, stage),
          tags = $9,
          notes = $10,
          metadata = COALESCE($11::jsonb, metadata),
          updated_at = now()
        WHERE id = $1::uuid AND user_id = $2::uuid
        RETURNING id, user_id, name, email, phone, company, industry, stage, score, tags, notes, metadata, created_at, updated_at`,
        [
          data.id.trim(),
          userId,
          data.name,
          data.email ?? null,
          data.phone ?? null,
          data.company ?? null,
          data.industry ?? null,
          nextStage ?? null,
          data.tags ?? null,
          data.notes ?? null,
          data.metadata != null ? JSON.stringify(data.metadata) : null,
        ],
      );
      const r = rows[0];
      if (!r) throw new Error("Contacto no encontrado");
      return rowContact(r);
    }

    const stage = data.stage && STAGES.has(data.stage) ? data.stage : "lead";
    const rows = await db.query<ContactRow>(
      `INSERT INTO crm_contacts (user_id, name, email, phone, company, industry, stage, tags, notes, metadata, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '{}'), now())
       RETURNING id, user_id, name, email, phone, company, industry, stage, score, tags, notes, metadata, created_at, updated_at`,
      [
        userId,
        data.name,
        data.email ?? null,
        data.phone ?? null,
        data.company ?? null,
        data.industry ?? null,
        stage,
        data.tags ?? null,
        data.notes ?? null,
        data.metadata != null ? JSON.stringify(data.metadata) : null,
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("upsertContact: sin fila");
    return rowContact(r);
  }

  static async getContacts(userId: string, filters?: CrmContactFilters): Promise<CrmContact[]> {
    const db = DbClient.getInstance();
    const conds: string[] = ["user_id = $1::uuid"];
    const params: unknown[] = [userId];
    let i = 2;
    if (filters?.stage?.trim()) {
      conds.push(`stage = $${i}::text`);
      params.push(filters.stage.trim());
      i++;
    }
    if (filters?.industry?.trim()) {
      conds.push(`industry ILIKE $${i}`);
      params.push(`%${filters.industry.trim()}%`);
      i++;
    }
    if (typeof filters?.minScore === "number" && !Number.isNaN(filters.minScore)) {
      conds.push(`score >= $${i}`);
      params.push(filters.minScore);
      i++;
    }
    const sql = `SELECT id, user_id, name, email, phone, company, industry, stage, score, tags, notes, metadata, created_at, updated_at
      FROM crm_contacts WHERE ${conds.join(" AND ")} ORDER BY updated_at DESC`;
    const rows = await db.query<ContactRow>(sql, params);
    return rows.map(rowContact);
  }

  static async updateStage(contactId: string, userId: string, stage: string): Promise<CrmContact> {
    if (!STAGES.has(stage)) throw new Error("stage inválido");
    const rows = await DbClient.getInstance().query<ContactRow>(
      `UPDATE crm_contacts SET stage = $3, updated_at = now()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id, user_id, name, email, phone, company, industry, stage, score, tags, notes, metadata, created_at, updated_at`,
      [contactId, userId, stage],
    );
    const r = rows[0];
    if (!r) throw new Error("Contacto no encontrado");
    return rowContact(r);
  }

  static async logActivity(
    contactId: string,
    userId: string,
    type: string,
    summary?: string | null,
    agentId?: string | null,
    metadata?: unknown,
  ): Promise<CrmActivity> {
    await CrmService.assertContactOwner(contactId, userId);
    const rows = await DbClient.getInstance().query<ActivityRow>(
      `INSERT INTO crm_activities (contact_id, user_id, type, summary, agent_id, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6::jsonb, '{}'))
       RETURNING id, contact_id, user_id, type, summary, agent_id, metadata, created_at`,
      [contactId, userId, type, summary ?? null, agentId ?? null, metadata != null ? JSON.stringify(metadata) : null],
    );
    const r = rows[0];
    if (!r) throw new Error("logActivity: sin fila");
    if (type === "agent_output" && agentId) {
      await DbClient.getInstance().query(
        `UPDATE crm_contacts SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1::uuid`,
        [contactId, JSON.stringify({ last_agent_id: agentId })],
      );
    }
    await CrmService.scoreContact(contactId);
    return rowActivity(r);
  }

  static async getActivities(contactId: string, userId: string): Promise<CrmActivity[]> {
    await CrmService.assertContactOwner(contactId, userId);
    const rows = await DbClient.getInstance().query<ActivityRow>(
      `SELECT a.id, a.contact_id, a.user_id, a.type, a.summary, a.agent_id, a.metadata, a.created_at
       FROM crm_activities a
       INNER JOIN crm_contacts c ON c.id = a.contact_id
       WHERE a.contact_id = $1::uuid AND c.user_id = $2::uuid
       ORDER BY a.created_at DESC`,
      [contactId, userId],
    );
    return rows.map(rowActivity);
  }

  static async scoreContact(contactId: string): Promise<number> {
    const rows = await DbClient.getInstance().query<{ type: string; c: string }>(
      `SELECT type, COUNT(*)::text AS c FROM crm_activities WHERE contact_id = $1::uuid GROUP BY type`,
      [contactId],
    );
    let score = 0;
    for (const row of rows) {
      const n = parseInt(row.c, 10) || 0;
      if (row.type === "agent_output") score += 10 * n;
      else if (row.type === "email" || row.type === "call") score += 5 * n;
    }
    await DbClient.getInstance().query(`UPDATE crm_contacts SET score = $2, updated_at = now() WHERE id = $1::uuid`, [
      contactId,
      score,
    ]);
    return score;
  }

  private static async assertContactOwner(contactId: string, userId: string): Promise<void> {
    const rows = await DbClient.getInstance().query<{ id: string }>(
      `SELECT id FROM crm_contacts WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      [contactId, userId],
    );
    if (!rows[0]) throw new Error("Contacto no encontrado");
  }
}
