import fs from "node:fs/promises";
import path from "node:path";

import { getLocalEmbeddingProvider } from "./LocalEmbeddingProvider";
import { sha256, vectorLiteral, withTenantClient } from "./db";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

export type IngestInput = {
  tenantId: string;
  clientId?: string | null;
  sourceId: string;
  title: string;
  filePath: string;
  uri?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
};

export type IngestResult = {
  documentId: string;
  chunks: number;
  checksum: string;
  version: number;
};

function splitChunks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < normalized.length) {
    const end = Math.min(i + CHUNK_SIZE, normalized.length);
    chunks.push(normalized.slice(i, end).trim());
    if (end >= normalized.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return chunks.filter(Boolean);
}

export class RagIngestPipeline {
  async ingestFile(input: IngestInput): Promise<IngestResult> {
    const raw = await fs.readFile(input.filePath, "utf8");
    const checksum = sha256(raw);
    const parts = splitChunks(raw);
    if (parts.length === 0) throw new Error("Document empty after normalization");

    const embedder = getLocalEmbeddingProvider();

    return withTenantClient(input.tenantId, async (client) => {
      const doc = await client.query<{ id: string; version: number }>(
        `INSERT INTO local_ai_rag_documents
           (tenant_id, client_id, source_id, title, uri, mime_type, checksum, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         ON CONFLICT (tenant_id, source_id, version) DO UPDATE SET
           title = EXCLUDED.title,
           checksum = EXCLUDED.checksum,
           updated_at = NOW()
         RETURNING id, version`,
        [
          input.tenantId,
          input.clientId ?? null,
          input.sourceId,
          input.title,
          input.uri ?? `file://${path.resolve(input.filePath)}`,
          input.mimeType ?? "text/plain",
          checksum,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const documentId = doc.rows[0]!.id;
      const version = doc.rows[0]!.version;

      await client.query(`DELETE FROM local_ai_rag_chunks WHERE tenant_id = $1 AND document_id = $2`, [
        input.tenantId,
        documentId,
      ]);

      for (let idx = 0; idx < parts.length; idx++) {
        const content = parts[idx]!;
        const chunkChecksum = sha256(content);
        const { vector } = await embedder.embed(content);
        await client.query(
          `INSERT INTO local_ai_rag_chunks
             (tenant_id, client_id, document_id, source_id, chunk_index, content, embedding, checksum, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9::jsonb)`,
          [
            input.tenantId,
            input.clientId ?? null,
            documentId,
            input.sourceId,
            idx,
            content,
            vectorLiteral(vector),
            chunkChecksum,
            JSON.stringify({ title: input.title, file: input.filePath }),
          ],
        );
      }

      await client.query(
        `INSERT INTO local_ai_ingest_jobs (tenant_id, client_id, source_id, file_path, status, checksum, completed_at)
         VALUES ($1, $2, $3, $4, 'completed', $5, NOW())`,
        [input.tenantId, input.clientId ?? null, input.sourceId, input.filePath, checksum],
      );

      return { documentId, chunks: parts.length, checksum, version };
    });
  }
}

let _pipeline: RagIngestPipeline | undefined;
export function getRagIngestPipeline(): RagIngestPipeline {
  _pipeline ??= new RagIngestPipeline();
  return _pipeline;
}

export function resetRagIngestPipelineForTests(): void {
  _pipeline = undefined;
}
