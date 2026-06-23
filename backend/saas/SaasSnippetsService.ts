import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface SaasSnippet {
  id: string;
  tenantId: string;
  name: string;
  shortcut: string | null;
  content: string;
  channels: string[];
  variables: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnippetInput {
  name: string;
  shortcut?: string | null;
  content: string;
  channels?: string[];
  variables?: string[];
}

export class SaasSnippetsError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasSnippetsError";
  }
}

type SnippetRow = {
  id: string;
  tenant_id: string;
  name: string;
  shortcut: string | null;
  content: string;
  channels: string[];
  variables: string[];
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToSnippet(r: SnippetRow): SaasSnippet {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    shortcut: r.shortcut,
    content: r.content,
    channels: r.channels ?? [],
    variables: r.variables ?? [],
    createdBy: r.created_by,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class SaasSnippetsService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string, search?: string): Promise<SaasSnippet[]> {
    const clauses = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    if (search?.trim()) {
      clauses.push(`(name ILIKE $2 OR shortcut ILIKE $2 OR content ILIKE $2)`);
      params.push(`%${search.trim()}%`);
    }
    const rows = await this.db.query<SnippetRow>(
      `SELECT id, tenant_id, name, shortcut, content, channels, variables, created_by, created_at, updated_at
       FROM snippets
       WHERE ${clauses.join(" AND ")}
       ORDER BY name ASC`,
      params,
    );
    return rows.map(rowToSnippet);
  }

  async get(tenantId: string, id: string): Promise<SaasSnippet | null> {
    const rows = await this.db.query<SnippetRow>(
      `SELECT id, tenant_id, name, shortcut, content, channels, variables, created_by, created_at, updated_at
       FROM snippets WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToSnippet(rows[0]) : null;
  }

  async create(tenantId: string, userId: string | null, input: CreateSnippetInput): Promise<SaasSnippet> {
    const name = input.name.trim();
    if (!name) throw new SaasSnippetsError("name is required", "VALIDATION");
    const content = input.content.trim();
    if (!content) throw new SaasSnippetsError("content is required", "VALIDATION");
    const shortcut = input.shortcut?.trim() || null;
    try {
      const rows = await this.db.query<SnippetRow>(
        `INSERT INTO snippets (tenant_id, name, shortcut, content, channels, variables, created_by, updated_at)
         VALUES ($1,$2,$3,$4,$5::text[],$6::text[],$7,NOW())
         RETURNING id, tenant_id, name, shortcut, content, channels, variables, created_by, created_at, updated_at`,
        [tenantId, name, shortcut, content, input.channels ?? [], input.variables ?? [], userId],
      );
      if (!rows[0]) throw new SaasSnippetsError("Failed to create snippet", "CONSTRAINT");
      return rowToSnippet(rows[0]);
    } catch (e: unknown) {
      if (isUniqueViolation(e)) throw new SaasSnippetsError("Shortcut already in use", "CONSTRAINT");
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    input: Partial<CreateSnippetInput>,
  ): Promise<SaasSnippet> {
    const existing = await this.get(tenantId, id);
    if (!existing) throw new SaasSnippetsError("Snippet not found", "NOT_FOUND");
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.name !== undefined) { sets.push(`name = $${idx++}`); params.push(input.name.trim()); }
    if (input.shortcut !== undefined) { sets.push(`shortcut = $${idx++}`); params.push(input.shortcut?.trim() || null); }
    if (input.content !== undefined) { sets.push(`content = $${idx++}`); params.push(input.content); }
    if (input.channels !== undefined) { sets.push(`channels = $${idx++}::text[]`); params.push(input.channels); }
    if (input.variables !== undefined) { sets.push(`variables = $${idx++}::text[]`); params.push(input.variables); }
    const rows = await this.db.query<SnippetRow>(
      `UPDATE snippets SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, name, shortcut, content, channels, variables, created_by, created_at, updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasSnippetsError("Snippet not found", "NOT_FOUND");
    return rowToSnippet(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM snippets WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasSnippetsError("Snippet not found", "NOT_FOUND");
  }
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

let _instance: SaasSnippetsService | null = null;
export function getSaasSnippetsService(): SaasSnippetsService {
  if (!_instance) _instance = new SaasSnippetsService();
  return _instance;
}
export function resetSaasSnippetsServiceForTests(): void { _instance = null; }
