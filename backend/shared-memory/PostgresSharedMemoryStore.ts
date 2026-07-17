import { randomUUID } from "node:crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "../saas/SaasOnboardingService";
import { getSharedMemoryConfig } from "./config";
import type {
  ISharedMemoryStore,
  MemoryEntryKind,
  MemoryLayer,
  MemoryScope,
  MemoryVisibility,
  SharedMemoryEntry,
  SharedMemoryQuery,
  SharedMemorySearchResult,
  SharedMemoryWriteInput,
} from "./types";
import { SHARED_MEMORY_CONTRACT_VERSION, defaultMemoryLayer } from "./types";

type Row = {
  id: string;
  tenant_id: string;
  scope: MemoryScope;
  visibility: MemoryVisibility;
  kind: MemoryEntryKind;
  layer: MemoryLayer;
  agent_id: string | null;
  user_id: string | null;
  workspace_id: string | null;
  session_id: string | null;
  key: string;
  title: string;
  content: string;
  embedding_ref: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | string | null;
  expires_at: Date | string | null;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  version: number;
};

function toIso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toISOString();
}

function parseMeta(m: Row["metadata"]): Record<string, unknown> {
  if (!m) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return m;
}

function mapRow(r: Row): SharedMemoryEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    scope: r.scope,
    visibility: r.visibility,
    kind: r.kind,
    layer: r.layer ?? "ltm",
    agentId: r.agent_id,
    userId: r.user_id,
    workspaceId: r.workspace_id,
    sessionId: r.session_id,
    key: r.key,
    title: r.title ?? "",
    content: r.content,
    embeddingRef: r.embedding_ref,
    tags: r.tags ?? [],
    metadata: parseMeta(r.metadata),
    expiresAt: toIso(r.expires_at),
    createdBy: r.created_by,
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
    version: Number(r.version ?? 1),
  };
}

function normalizeWrite(input: SharedMemoryWriteInput): SharedMemoryWriteInput & { layer: MemoryLayer } {
  const cfg = getSharedMemoryConfig();
  const content = input.content.slice(0, cfg.maxEntryChars);
  const tags = (input.tags ?? []).slice(0, cfg.maxTags).map((t) => t.slice(0, 64));
  const layer = input.layer ?? defaultMemoryLayer(input.scope);
  let expiresAt = input.expiresAt ?? null;
  if (!expiresAt && layer === "stm") {
    expiresAt = new Date(Date.now() + cfg.stmTtlHours * 3600_000).toISOString();
  }
  if (!expiresAt && layer === "ltm" && cfg.defaultTtlDays > 0) {
    expiresAt = new Date(Date.now() + cfg.defaultTtlDays * 86400_000).toISOString();
  }
  return { ...input, content, tags, layer, expiresAt };
}

export class PostgresSharedMemoryStore implements ISharedMemoryStore {
  readonly contractVersion = SHARED_MEMORY_CONTRACT_VERSION;

  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async write(input: SharedMemoryWriteInput): Promise<SharedMemoryEntry> {
    const n = normalizeWrite(input);
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_shared_memory_entries
       WHERE tenant_id = $1::uuid
         AND scope = $2
         AND key = $3
         AND COALESCE(agent_id, '') = COALESCE($4, '')
         AND COALESCE(session_id, '') = COALESCE($5, '')
         AND COALESCE(user_id, '') = COALESCE($6, '')
       LIMIT 1`,
      [n.tenantId, n.scope, n.key, n.agentId ?? null, n.sessionId ?? null, n.userId ?? null],
    );

    if (existing[0]) {
      const rows = await this.db.query<Row>(
        `UPDATE saas_shared_memory_entries SET
           visibility = $1,
           kind = $2,
           layer = $3,
           title = $4,
           content = $5,
           tags = $6,
           metadata = $7::jsonb,
           expires_at = $8::timestamptz,
           updated_at = NOW(),
           version = version + 1
         WHERE id = $9::uuid AND tenant_id = $10::uuid
         RETURNING *`,
        [
          n.visibility,
          n.kind,
          n.layer,
          n.title ?? "",
          n.content,
          n.tags ?? [],
          JSON.stringify(n.metadata ?? {}),
          n.expiresAt,
          existing[0].id,
          n.tenantId,
        ],
      );
      return mapRow(rows[0]!);
    }

    const rows = await this.db.query<Row>(
      `INSERT INTO saas_shared_memory_entries (
         tenant_id, scope, visibility, kind, layer, agent_id, user_id, workspace_id, session_id,
         key, title, content, tags, metadata, expires_at, created_by
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6, $7, $8::uuid, $9,
         $10, $11, $12, $13, $14::jsonb, $15::timestamptz, $16
       )
       RETURNING *`,
      [
        n.tenantId,
        n.scope,
        n.visibility,
        n.kind,
        n.layer,
        n.agentId ?? null,
        n.userId ?? null,
        n.workspaceId ?? null,
        n.sessionId ?? null,
        n.key,
        n.title ?? "",
        n.content,
        n.tags ?? [],
        JSON.stringify(n.metadata ?? {}),
        n.expiresAt,
        n.createdBy,
      ],
    );
    return mapRow(rows[0]!);
  }

  async read(tenantId: string, entryId: string): Promise<SharedMemoryEntry | null> {
    const rows = await this.db.query<Row>(
      `SELECT * FROM saas_shared_memory_entries
       WHERE id = $1::uuid AND tenant_id = $2::uuid
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [entryId, tenantId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async search(query: SharedMemoryQuery): Promise<SharedMemorySearchResult> {
    if (!query.forbidCrossTenant) throw new Error("forbidCrossTenant_required");
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const params: unknown[] = [query.tenantId];
    const where = [
      "tenant_id = $1::uuid",
      "(expires_at IS NULL OR expires_at > NOW())",
    ];
    if (query.scope) {
      params.push(query.scope);
      where.push(`scope = $${params.length}`);
    }
    if (query.agentId) {
      params.push(query.agentId);
      where.push(`agent_id = $${params.length}`);
    }
    if (query.userId) {
      params.push(query.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (query.layer) {
      params.push(query.layer);
      where.push(`layer = $${params.length}`);
    }
    if (query.tags?.length) {
      params.push(query.tags);
      where.push(`tags @> $${params.length}::text[]`);
    }
    if (query.query?.trim()) {
      params.push(`%${query.query.trim().slice(0, 200)}%`);
      where.push(`(content ILIKE $${params.length} OR title ILIKE $${params.length} OR key ILIKE $${params.length})`);
    }
    params.push(limit + 1);
    const rows = await this.db.query<Row>(
      `SELECT * FROM saas_shared_memory_entries
       WHERE ${where.join(" AND ")}
       ORDER BY updated_at DESC
       LIMIT $${params.length}`,
      params,
    );
    const truncated = rows.length > limit;
    return {
      entries: rows.slice(0, limit).map(mapRow),
      traceId: randomUUID(),
      truncated,
    };
  }

  async delete(tenantId: string, entryId: string, _actorId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_shared_memory_entries
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id`,
      [entryId, tenantId],
    );
    return rows.length > 0;
  }

  async listByAgent(tenantId: string, agentId: string, limit: number): Promise<SharedMemoryEntry[]> {
    const res = await this.search({ tenantId, agentId, limit, forbidCrossTenant: true });
    return res.entries;
  }

  async listByUser(tenantId: string, userId: string, limit: number): Promise<SharedMemoryEntry[]> {
    const res = await this.search({ tenantId, userId, limit, forbidCrossTenant: true });
    return res.entries;
  }

  async purgeExpired(tenantId?: string): Promise<number> {
    if (tenantId) {
      const rows = await this.db.query<{ id: string }>(
        `DELETE FROM saas_shared_memory_entries
         WHERE tenant_id = $1::uuid AND expires_at IS NOT NULL AND expires_at <= NOW()
         RETURNING id`,
        [tenantId],
      );
      return rows.length;
    }
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_shared_memory_entries
       WHERE expires_at IS NOT NULL AND expires_at <= NOW()
       RETURNING id`,
    );
    return rows.length;
  }

  async audit(
    tenantId: string,
    action: string,
    actorId: string,
    opts?: { entryId?: string; agentId?: string; preview?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_shared_memory_audit (tenant_id, entry_id, actor_id, agent_id, action, preview, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb)`,
      [
        tenantId,
        opts?.entryId ?? null,
        actorId,
        opts?.agentId ?? null,
        action,
        opts?.preview?.slice(0, 200) ?? null,
        JSON.stringify(opts?.metadata ?? {}),
      ],
    );
  }
}
