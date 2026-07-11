import type pg from "pg";

import { getLocalEmbeddingProvider } from "./LocalEmbeddingProvider";
import { sha256, vectorLiteral, withTenantClient } from "./db";

export type MemoryRecord = {
  id: string;
  tenantId: string;
  clientId: string | null;
  sourceId: string;
  content: string;
  checksum: string;
  version: number;
  status: string;
  createdAt: string;
  score?: number;
};

export type MemoryWriteInput = {
  tenantId: string;
  clientId?: string | null;
  sourceId: string;
  content: string;
  permissions?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export class LocalMemoryStore {
  async write(input: MemoryWriteInput): Promise<MemoryRecord> {
    const checksum = sha256(input.content);
    const embedding = await getLocalEmbeddingProvider().embed(input.content);

    return withTenantClient(input.tenantId, async (client) => {
      const rows = await client.query<{
        id: string;
        tenant_id: string;
        client_id: string | null;
        source_id: string;
        content: string;
        checksum: string;
        version: number;
        status: string;
        created_at: Date;
      }>(
        `INSERT INTO local_ai_memory
           (tenant_id, client_id, source_id, content, embedding, permissions, checksum, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, $7, $8::jsonb)
         RETURNING id, tenant_id, client_id, source_id, content, checksum, version, status, created_at`,
        [
          input.tenantId,
          input.clientId ?? null,
          input.sourceId,
          input.content,
          vectorLiteral(embedding.vector),
          JSON.stringify(input.permissions ?? { read: "tenant", write: "tenant" }),
          checksum,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const r = rows.rows[0]!;
      return mapRow(r);
    });
  }

  async search(tenantId: string, query: string, limit = 5, clientId?: string | null): Promise<MemoryRecord[]> {
    const embedding = await getLocalEmbeddingProvider().embed(query);
    return withTenantClient(tenantId, async (client) => {
      const params: unknown[] = [vectorLiteral(embedding.vector), tenantId, limit];
      let sql = `
        SELECT id, tenant_id, client_id, source_id, content, checksum, version, status, created_at,
               1 - (embedding <=> $1::vector) AS score
        FROM local_ai_memory
        WHERE tenant_id = $2 AND status = 'active' AND embedding IS NOT NULL`;
      if (clientId) {
        params.splice(2, 0, clientId);
        sql += ` AND client_id = $3 ORDER BY embedding <=> $1::vector LIMIT $4`;
      } else {
        sql += ` ORDER BY embedding <=> $1::vector LIMIT $3`;
      }
      const rows = await client.query(sql, params);
      return rows.rows.map(mapRow);
    });
  }

  /** Cross-tenant probe — must return zero rows for isolation tests. */
  async searchRawCrossTenant(
    actingTenantId: string,
    targetTenantId: string,
    query: string,
  ): Promise<MemoryRecord[]> {
    return withTenantClient(actingTenantId, async (client) => {
      const embedding = await getLocalEmbeddingProvider().embed(query);
      const rows = await client.query(
        `SELECT id FROM local_ai_memory
         WHERE tenant_id = $1 AND status = 'active'
         ORDER BY embedding <=> $2::vector LIMIT 5`,
        [targetTenantId, vectorLiteral(embedding.vector)],
      );
      return rows.rows as MemoryRecord[];
    });
  }
}

function mapRow(r: {
  id: string;
  tenant_id: string;
  client_id: string | null;
  source_id: string;
  content: string;
  checksum: string;
  version: number;
  status: string;
  created_at: Date;
  score?: number;
}): MemoryRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clientId: r.client_id,
    sourceId: r.source_id,
    content: r.content,
    checksum: r.checksum,
    version: r.version,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    score: r.score,
  };
}

let _store: LocalMemoryStore | undefined;
export function getLocalMemoryStore(): LocalMemoryStore {
  _store ??= new LocalMemoryStore();
  return _store;
}

export function resetLocalMemoryStoreForTests(): void {
  _store = undefined;
}
