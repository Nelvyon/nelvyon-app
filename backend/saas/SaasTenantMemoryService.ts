/**
 * S58 — Moso-style shared tenant memory for all AI agents.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type MemorySource = "manual" | "inbox" | "pack" | "crm" | "import";

export type MemoryChunk = {
  id: string;
  tenantId: string;
  source: MemorySource;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MemorySettings = {
  maxChunks: number;
  autoIngestEnabled: boolean;
};

export class SaasTenantMemoryService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  private async ensureSettings(tenantId: string): Promise<MemorySettings> {
    await this.db.query(
      `INSERT INTO saas_tenant_memory_settings (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId],
    );
    const rows = await this.db.query<{ max_chunks: number; auto_ingest_enabled: boolean }>(
      `SELECT max_chunks, auto_ingest_enabled FROM saas_tenant_memory_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    const r = rows[0];
    return {
      maxChunks: r?.max_chunks ?? 200,
      autoIngestEnabled: r?.auto_ingest_enabled ?? true,
    };
  }

  async addChunk(
    tenantId: string,
    input: { source: MemorySource; title?: string; content: string; tags?: string[]; metadata?: Record<string, unknown> },
  ): Promise<MemoryChunk> {
    const settings = await this.ensureSettings(tenantId);
    const countRows = await this.db.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM saas_tenant_memory_chunks WHERE tenant_id = $1`,
      [tenantId],
    );
    const count = Number(countRows[0]?.c ?? 0);
    if (count >= settings.maxChunks) {
      await this.db.query(
        `DELETE FROM saas_tenant_memory_chunks WHERE id IN (
           SELECT id FROM saas_tenant_memory_chunks WHERE tenant_id = $1
           ORDER BY created_at ASC LIMIT 1
         )`,
        [tenantId],
      );
    }
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_tenant_memory_chunks (tenant_id, source, title, content, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, tenant_id, source, title, content, tags, metadata, created_at`,
      [
        tenantId,
        input.source,
        input.title ?? "",
        input.content,
        input.tags ?? [],
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return this.mapRow(rows[0]!);
  }

  async list(tenantId: string, limit = 50): Promise<MemoryChunk[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id, source, title, content, tags, metadata, created_at
       FROM saas_tenant_memory_chunks WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, Math.min(limit, 200)],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async search(tenantId: string, query: string, limit = 10): Promise<MemoryChunk[]> {
    const q = `%${query.trim().slice(0, 120)}%`;
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id, source, title, content, tags, metadata, created_at
       FROM saas_tenant_memory_chunks
       WHERE tenant_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY created_at DESC LIMIT $3`,
      [tenantId, q, Math.min(limit, 50)],
    );
    return rows.map((r) => this.mapRow(r));
  }

  /** Inject top memory chunks into LLM system context. */
  async buildContextBlock(tenantId: string, maxChars = 4000): Promise<string> {
    const chunks = await this.list(tenantId, 20);
    if (chunks.length === 0) return "";
    let block = "## Memoria del negocio (Nelvyon)\n";
    for (const c of chunks) {
      const line = `- [${c.source}] ${c.title ? `${c.title}: ` : ""}${c.content.slice(0, 400)}\n`;
      if (block.length + line.length > maxChars) break;
      block += line;
    }
    return block;
  }

  async deleteChunk(tenantId: string, chunkId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_tenant_memory_chunks WHERE tenant_id = $1 AND id = $2::uuid RETURNING id`,
      [tenantId, chunkId],
    );
    return rows.length > 0;
  }

  async getSettings(tenantId: string): Promise<MemorySettings> {
    return this.ensureSettings(tenantId);
  }

  private mapRow(r: Record<string, unknown>): MemoryChunk {
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      source: String(r.source) as MemorySource,
      title: String(r.title ?? ""),
      content: String(r.content),
      tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: String(r.created_at),
    };
  }
}

let _svc: SaasTenantMemoryService | undefined;
export function getSaasTenantMemoryService(): SaasTenantMemoryService {
  _svc ??= new SaasTenantMemoryService();
  return _svc;
}
export function resetSaasTenantMemoryServiceForTests(): void {
  _svc = undefined;
}
