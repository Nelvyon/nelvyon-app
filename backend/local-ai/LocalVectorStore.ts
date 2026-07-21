import type pg from "pg";
import { getLocalEmbeddingProvider } from "./LocalEmbeddingProvider";
import { sha256, vectorLiteral, withTenantReadOnly, withTenantClient } from "./db";

export type RagChunk = {
  id: string;
  tenantId: string;
  clientId: string | null;
  documentId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  checksum: string;
  score?: number;
  metadata?: Record<string, unknown>;
  domain?: string;
};

export type RagSearchInput = {
  tenantId: string;
  query: string;
  limit?: number;
  clientId?: string | null;
  domain?: string;
};

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 3)
    .slice(0, 8);
}

export class LocalVectorStore {
  async search(input: RagSearchInput): Promise<RagChunk[]> {
    return this.hybridSearch(input);
  }

  /** Single DB connection per hybrid search (vector + lexical). */
  async hybridSearch(input: RagSearchInput): Promise<RagChunk[]> {
    const limit = input.limit ?? 8;
    const embedding = await getLocalEmbeddingProvider().embed(input.query);
    return withTenantReadOnly(input.tenantId, async (client) => {
      const vectorHits = await this.vectorSearchWithClient(client, input, embedding.vector, limit * 3);
      const lexicalHits = await this.lexicalSearchWithClient(client, input, limit * 2);
      return this.mergeAndRerank(vectorHits, lexicalHits, input.query, input.domain, limit);
    });
  }

  private async vectorSearchWithClient(
    client: pg.PoolClient,
    input: RagSearchInput,
    vector: number[],
    limit: number,
  ): Promise<RagChunk[]> {
    const params: unknown[] = [vectorLiteral(vector), input.tenantId];
    let n = 3;
    let sql = `
      SELECT c.id, c.tenant_id, c.client_id, c.document_id, c.source_id, c.chunk_index,
             c.content, c.checksum, c.metadata,
             d.metadata AS doc_metadata,
             1 - (c.embedding <=> $1::vector) AS score
      FROM local_ai_rag_chunks c
      JOIN local_ai_rag_documents d ON d.id = c.document_id
      WHERE c.tenant_id = $2 AND c.status = 'active' AND d.status = 'active' AND c.embedding IS NOT NULL`;
    if (input.clientId) {
      sql += ` AND c.client_id = $${n++}`;
      params.push(input.clientId);
    }
    if (input.domain) {
      sql += ` AND (d.metadata->>'domain' = $${n} OR c.metadata->>'domain' = $${n})`;
      params.push(input.domain);
      n++;
    }
    sql += ` ORDER BY c.embedding <=> $1::vector LIMIT $${n}`;
    params.push(limit);
    const rows = await client.query(sql, params);
    return rows.rows.map((r: Record<string, unknown>) => this.rowToChunk(r));
  }

  private async lexicalSearchWithClient(
    client: pg.PoolClient,
    input: RagSearchInput,
    limit: number,
  ): Promise<RagChunk[]> {
    const tokens = tokenizeQuery(input.query);
    if (tokens.length === 0) return [];

    const params: unknown[] = [input.tenantId];
    let n = 2;
    const conditions = tokens.map((t) => {
      params.push(`%${t}%`);
      return `c.content ILIKE $${n++}`;
    });
    let sql = `
      SELECT c.id, c.tenant_id, c.client_id, c.document_id, c.source_id, c.chunk_index,
             c.content, c.checksum, c.metadata,
             d.metadata AS doc_metadata,
             0.5 AS score
      FROM local_ai_rag_chunks c
      JOIN local_ai_rag_documents d ON d.id = c.document_id
      WHERE c.tenant_id = $1 AND c.status = 'active' AND d.status = 'active'
        AND (${conditions.join(" OR ")})`;
    if (input.domain) {
      sql += ` AND (d.metadata->>'domain' = $${n} OR c.metadata->>'domain' = $${n})`;
      params.push(input.domain);
      n++;
    }
    sql += ` LIMIT $${n}`;
    params.push(limit);

    const rows = await client.query(sql, params);
    return rows.rows.map((r: Record<string, unknown>) => {
      const chunk = this.rowToChunk(r);
      const lower = chunk.content.toLowerCase();
      const hits = tokens.filter((t) => lower.includes(t)).length;
      chunk.score = Math.min(0.85, 0.35 + (hits / tokens.length) * 0.5);
      return chunk;
    });
  }

  private rowToChunk(r: Record<string, unknown>): RagChunk {
    const chunkMeta = (r.metadata ?? {}) as Record<string, unknown>;
    const docMeta = (r.doc_metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      clientId: r.client_id ? String(r.client_id) : null,
      documentId: String(r.document_id),
      sourceId: String(r.source_id),
      chunkIndex: Number(r.chunk_index),
      content: String(r.content),
      checksum: String(r.checksum),
      score: Number(r.score),
      metadata: chunkMeta,
      domain: String(docMeta.domain ?? chunkMeta.domain ?? ""),
    };
  }

  private mergeAndRerank(
    vectorHits: RagChunk[],
    lexicalHits: RagChunk[],
    query: string,
    domain: string | undefined,
    limit: number,
  ): RagChunk[] {
    const tokens = tokenizeQuery(query);
    const byId = new Map<string, RagChunk>();

    for (const h of [...vectorHits, ...lexicalHits]) {
      const existing = byId.get(h.id);
      const lexicalBoost = tokens.filter((t) => h.content.toLowerCase().includes(t)).length / Math.max(1, tokens.length);
      const domainBoost = domain && h.domain === domain ? 0.1 : 0;
      const combined = (h.score ?? 0) * 0.65 + lexicalBoost * 0.25 + domainBoost;
      if (!existing || combined > (existing.score ?? 0)) {
        byId.set(h.id, { ...h, score: combined });
      }
    }

    const deduped = [...byId.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const seen = new Set<string>();
    const out: RagChunk[] = [];
    for (const h of deduped) {
      const key = h.content.slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
      if (out.length >= limit) break;
    }
    return out;
  }

  async countChunks(tenantId: string): Promise<number> {
    return withTenantReadOnly(tenantId, async (client) => {
      const r = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM local_ai_rag_chunks WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId],
      );
      return Number(r.rows[0]?.c ?? 0);
    });
  }
}

let _store: LocalVectorStore | undefined;
export function getLocalVectorStore(): LocalVectorStore {
  _store ??= new LocalVectorStore();
  return _store;
}

export function resetLocalVectorStoreForTests(): void {
  _store = undefined;
}

export { sha256, vectorLiteral };
