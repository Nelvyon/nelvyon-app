import { getLocalEmbeddingProvider } from "./LocalEmbeddingProvider";
import { sha256, vectorLiteral, withTenantClient } from "./db";

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
};

export type RagSearchInput = {
  tenantId: string;
  query: string;
  limit?: number;
  clientId?: string | null;
};

export class LocalVectorStore {
  async search(input: RagSearchInput): Promise<RagChunk[]> {
    const limit = input.limit ?? 5;
    const embedding = await getLocalEmbeddingProvider().embed(input.query);

    return withTenantClient(input.tenantId, async (client) => {
      const params: unknown[] = [vectorLiteral(embedding.vector), input.tenantId];
      let n = 3;
      let sql = `
        SELECT c.id, c.tenant_id, c.client_id, c.document_id, c.source_id, c.chunk_index,
               c.content, c.checksum,
               1 - (c.embedding <=> $1::vector) AS score
        FROM local_ai_rag_chunks c
        WHERE c.tenant_id = $2 AND c.status = 'active' AND c.embedding IS NOT NULL`;
      if (input.clientId) {
        sql += ` AND c.client_id = $${n++}`;
        params.push(input.clientId);
      }
      sql += ` ORDER BY c.embedding <=> $1::vector LIMIT $${n}`;
      params.push(limit);

      const rows = await client.query(sql, params);
      return rows.rows.map((r) => ({
        id: String(r.id),
        tenantId: String(r.tenant_id),
        clientId: r.client_id ? String(r.client_id) : null,
        documentId: String(r.document_id),
        sourceId: String(r.source_id),
        chunkIndex: Number(r.chunk_index),
        content: String(r.content),
        checksum: String(r.checksum),
        score: Number(r.score),
      }));
    });
  }

  async countChunks(tenantId: string): Promise<number> {
    return withTenantClient(tenantId, async (client) => {
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
