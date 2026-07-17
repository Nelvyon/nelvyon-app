/**
 * In-memory hybrid RAG (vector cosine + lexical) for elite certification
 * when Postgres/pgvector is unavailable. Same retrieval contract shape as LocalVectorStore.
 * Does NOT replace LocalVectorStore production path — used for synthetic corpus eval + offline gates.
 */

export type HybridRagChunk = {
  id: string;
  tenantId: string;
  documentId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  score?: number;
  metadata?: Record<string, unknown>;
};

export type HybridSearchHit = HybridRagChunk & { score: number; via: "vector" | "lexical" | "hybrid" };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 3)
    .slice(0, 10);
}

export type EmbedFn = (text: string) => Promise<number[]>;

export class InMemoryHybridRagStore {
  private readonly chunks: HybridRagChunk[] = [];

  clear(): void {
    this.chunks.length = 0;
  }

  async upsertDocument(input: {
    tenantId: string;
    documentId: string;
    sourceId: string;
    content: string;
    embed: EmbedFn;
    metadata?: Record<string, unknown>;
    chunkSize?: number;
  }): Promise<{ chunks: number }> {
    const size = input.chunkSize ?? 800;
    const parts: string[] = [];
    const text = input.content.trim();
    for (let i = 0; i < text.length; i += size) {
      parts.push(text.slice(i, i + size));
    }
    // Remove prior versions of same source for tenant
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i]!.tenantId === input.tenantId && this.chunks[i]!.sourceId === input.sourceId) {
        this.chunks.splice(i, 1);
      }
    }
    let idx = 0;
    for (const part of parts) {
      if (!part.trim()) continue;
      const embedding = await input.embed(part);
      this.chunks.push({
        id: `${input.documentId}:${idx}`,
        tenantId: input.tenantId,
        documentId: input.documentId,
        sourceId: input.sourceId,
        chunkIndex: idx,
        content: part,
        embedding,
        metadata: input.metadata,
      });
      idx++;
    }
    return { chunks: idx };
  }

  async hybridSearch(input: {
    tenantId: string;
    query: string;
    limit?: number;
    embed: EmbedFn;
  }): Promise<HybridSearchHit[]> {
    const limit = input.limit ?? 5;
    const tenantChunks = this.chunks.filter((c) => c.tenantId === input.tenantId);
    if (tenantChunks.length === 0) return [];

    const qVec = await input.embed(input.query);
    const tokens = tokenize(input.query);

    const vectorHits = tenantChunks
      .map((c) => ({
        ...c,
        score: cosine(qVec, c.embedding),
        via: "vector" as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 3);

    const lexicalHits = tenantChunks
      .map((c) => {
        const lower = c.content.toLowerCase();
        const hits = tokens.filter((t) => lower.includes(t)).length;
        const score = tokens.length ? Math.min(0.85, 0.3 + (hits / tokens.length) * 0.55) : 0;
        return { ...c, score, via: "lexical" as const };
      })
      .filter((c) => c.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2);

    const merged = new Map<string, HybridSearchHit>();
    for (const h of [...vectorHits, ...lexicalHits]) {
      const prev = merged.get(h.id);
      if (!prev || h.score > prev.score) {
        merged.set(h.id, {
          ...h,
          via: prev && prev.via !== h.via ? "hybrid" : h.via,
          score: prev ? Math.max(prev.score, h.score) * (prev.via !== h.via ? 1.05 : 1) : h.score,
        });
      } else if (prev.via !== h.via) {
        prev.via = "hybrid";
        prev.score = Math.min(1, prev.score * 1.05);
      }
    }

    return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  count(tenantId?: string): number {
    if (!tenantId) return this.chunks.length;
    return this.chunks.filter((c) => c.tenantId === tenantId).length;
  }
}

/** Deterministic fake embedder for CI (no Ollama). */
export function hashEmbed(text: string, dim = 64): number[] {
  const v = new Array(dim).fill(0);
  const norm = text.toLowerCase();
  for (let i = 0; i < norm.length; i++) {
    const code = norm.charCodeAt(i);
    v[i % dim] += ((code % 31) - 15) / 15;
  }
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / mag);
}
