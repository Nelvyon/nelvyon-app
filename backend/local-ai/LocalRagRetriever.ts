import { getLocalAiConfig } from "./config";
import { getLocalVectorStore } from "./LocalVectorStore";
import type { KnowledgeDomainId } from "./specialization/ontology";

export type RagCitation = {
  sourceId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
  domain?: string;
};

export type RagRetrievalResult = {
  query: string;
  citations: RagCitation[];
  contextBlock: string;
  confidence: number;
};

export class LocalRagRetriever {
  async retrieve(
    tenantId: string,
    query: string,
    opts?: { limit?: number; domain?: KnowledgeDomainId; minScore?: number },
  ): Promise<RagRetrievalResult> {
    const limit = opts?.limit ?? 6;
    const minScore = opts?.minScore ?? 0.35;
    const store = getLocalVectorStore();
    const hits = await store.search({ tenantId, query, limit: limit * 2 });

    let filtered = hits.filter((h) => (h.score ?? 0) >= minScore);
    if (opts?.domain) {
      const domainHits = filtered.filter((h) => !h.domain || h.domain === opts.domain);
      if (domainHits.length > 0) filtered = domainHits;
    }
    filtered = filtered.slice(0, limit);

    const citations: RagCitation[] = filtered.map((h) => ({
      sourceId: h.sourceId,
      documentId: h.documentId,
      chunkIndex: h.chunkIndex,
      content: h.content,
      score: h.score ?? 0,
    }));

    const contextBlock = citations
      .map((c, i) => `[${i + 1}] (${c.sourceId}, score=${c.score.toFixed(3)})\n${c.content}`)
      .join("\n\n---\n\n");

    const avgScore =
      citations.length > 0 ? citations.reduce((s, c) => s + c.score, 0) / citations.length : 0;
    const confidence = Math.min(0.95, avgScore * 1.1);

    return { query, citations, contextBlock, confidence };
  }

  buildAugmentedPrompt(query: string, retrieval: RagRetrievalResult): string {
    const cfg = getLocalAiConfig();
    return `${cfg.ollamaModel ? "" : ""}CONTEXTO RAG (fuentes locales indexadas):
${retrieval.contextBlock || "(sin contexto relevante)"}

PREGUNTA: ${query}

Instrucciones: responde usando el contexto. Cita fuentes como [1], [2]. Si el contexto es insuficiente, indica confianza baja.`;
  }
}

let _retriever: LocalRagRetriever | undefined;
export function getLocalRagRetriever(): LocalRagRetriever {
  _retriever ??= new LocalRagRetriever();
  return _retriever;
}
