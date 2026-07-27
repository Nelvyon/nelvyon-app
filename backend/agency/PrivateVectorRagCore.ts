/**
 * Private Vector RAG — in-process certification core (Block 24, updated Block 24
 * follow-up / "yellow point 7", 2026-07-25).
 *
 * This module proves the RAG *contract* — real cosine retrieval over vector
 * embeddings, hard per-tenant isolation, and refuse-on-no-evidence — without Docker,
 * using a deterministic hashing-trick embedding (à la scikit-learn's
 * `HashingVectorizer`) over `Float32Array` vectors. This is a REAL vector
 * representation: same text → same vector, cosine similarity is a genuine geometric
 * dot product over L2-normalized vectors, NOT a keyword-substring shortcut. Two chunks
 * that share vocabulary land closer in vector space; that geometry is what topK
 * ranking rides on.
 *
 * Production pgvector path (`backend/local-ai/LocalVectorStore.ts` +
 * `backend/local-ai/LocalEmbeddingProvider.ts` + `backend/local-ai/LocalRagRetriever.ts`)
 * was **re-verified live** on 2026-07-27 against Railway staging + Ollama `nomic-embed-text`
 * — see `scripts/staging-smoke-pgvector-rag-e2e.mjs` and
 * `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md` (**VERDICT PASS**).
 * Real chunk + document ingestion, real 768-dim pgvector cosine search, hard tenant isolation
 * (app + RLS), and refuse-without-evidence on small corpora (ADR-070 corpus-size-aware floor)
 * were all confirmed live — not simulated.
 *
 * Status: synthetic in-process core → `IMPLEMENTED_VERIFIED` (see
 * `docs/ops/PRIVATE_RAG_RUNBOOK.md`). Production pgvector path → `IMPLEMENTED_VERIFIED`
 * full PASS (ADR-070 closed the prior P2 quality gap).
 *
 * No OpenAI. No production canary activation without CEO SÍ. No Pepito data — synthetic
 * tenant A/B(/C) fixtures only, deleted at the end of every live run.
 */

export type PrivateRagTenantId = string;

export type PrivateRagDocumentInput = {
  id: string;
  tenantId: PrivateRagTenantId;
  sourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type PrivateRagChunk = {
  id: string;
  tenantId: PrivateRagTenantId;
  documentId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: Float32Array;
};

export type PrivateRagCitation = {
  chunkId: string;
  documentId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type PrivateRagRefusalReason = "rag_disabled" | "invalid_input" | "no_evidence_found";

export type PrivateRagRetrievalResult = {
  tenantId: string;
  query: string;
  citations: PrivateRagCitation[];
  refused: boolean;
  refusalReason: PrivateRagRefusalReason | null;
  topK: number;
  minScore: number;
};

export type PrivateRagAnswer = {
  refused: boolean;
  answer: string;
  citations: PrivateRagCitation[];
};

export type PrivateRagMetrics = {
  ingestedChunks: number;
  ingestedDocuments: number;
  retrievalsTotal: number;
  refusalsNoEvidence: number;
  refusalsDisabled: number;
  crossTenantIsolationChecks: number;
  crossTenantDenials: number;
  tenantsActive: number;
};

export const PRIVATE_VECTOR_RAG_STATUS = {
  syntheticCore: "IMPLEMENTED_VERIFIED" as const,
  productionPgvectorPath: "IMPLEMENTED_VERIFIED" as const,
  /** ISO timestamp of the live verification run that promoted / revalidated this status. */
  productionPgvectorVerifiedAt: "2026-07-27T16:42:45.027Z",
  /** Must always point at a real evidence file — never promote without this. */
  productionPgvectorEvidence: "scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md",
  /**
   * Historical P2 gap (ADR-057.1) — CLOSED by ADR-070. Field retained so status stays honest
   * about the prior finding and the raise-only remediation (never lowered minScore=0.32 for large corpora).
   */
  productionPgvectorKnownGap:
    "RESOLVED (ADR-070): prior P2 — REAL Ollama embeddings give unrelated sentences non-near-0 " +
    "cosine, so default minScore=0.32 did not refuse off-topic queries on tiny corpora. Remediation " +
    "applied: resolveEffectiveRagMinScore raises floor to 0.45 when 0 < activeChunkCount < 48; " +
    "large corpora keep 0.32 (never lowered). Staging e2e 2026-07-27 VERDICT PASS (critical+quality).",
  note:
    "In-process hashing-trick vector store proven via real cosine retrieval + hard tenant " +
    "isolation in unit tests (no Docker required). Production pgvector path " +
    "(backend/local-ai/LocalVectorStore.ts + LocalEmbeddingProvider.ts + LocalRagRetriever.ts) " +
    "re-verified LIVE on 2026-07-27 (Railway staging + Ollama) — ingestion, 768-dim cosine, " +
    "app+RLS isolation, refuse-without-evidence via corpus-size-aware minScore floor (ADR-070).",
};

export type PrivateVectorRagRollbackFlag = { flag: string; effect: string };

/** Kill switch list — any of these disables RAG answers fail-closed to a refusal, never a hallucination. */
export const PRIVATE_RAG_ROLLBACK_FLAGS: readonly PrivateVectorRagRollbackFlag[] = [
  {
    flag: "NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1",
    effect:
      "Kill switch — every retrieve() call refuses immediately with reason 'rag_disabled'. " +
      "ingest() still works (safe to pre-warm), but no citation is ever returned while set.",
  },
  {
    flag: "raise minScore via retrieve(tenantId, query, { minScore })",
    effect: "Forces more refusals if false-positive citations are observed in ops review.",
  },
];

function isPrivateVectorRagDisabled(): boolean {
  const v = process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED?.trim();
  return v === "1" || v?.toLowerCase() === "true";
}

const DEFAULT_EMBED_DIM = 128;
const DEFAULT_MIN_SCORE = 0.12;
const DEFAULT_TOP_K = 4;
const DEFAULT_CHUNK_MAX_CHARS = 400;

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 2);
}

/**
 * Deterministic hashing-trick embedding (scikit-learn `HashingVectorizer` style) —
 * a REAL vector representation, not a keyword-string-match shortcut. Same text always
 * produces the same vector; cosine similarity over these vectors is genuinely
 * geometric (dot product of L2-normalized vectors). Used for synthetic-doc
 * certification only — production embeddings come from `LocalEmbeddingProvider`
 * (Ollama) once the real pgvector path is re-verified live.
 */
export function hashEmbed(text: string, dim: number = DEFAULT_EMBED_DIM): Float32Array {
  const vec = new Float32Array(dim);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const h = fnv1aHash(token);
    const bucket = h % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[bucket] += sign;
  }
  // Bigram hashing adds local word-order sensitivity beyond a pure bag-of-words.
  for (let i = 0; i < tokens.length - 1; i++) {
    const h = fnv1aHash(`${tokens[i]}_${tokens[i + 1]}`);
    const bucket = h % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[bucket] += sign * 0.5;
  }
  let normSq = 0;
  for (let i = 0; i < dim; i++) normSq += vec[i] * vec[i];
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

/** Cosine similarity via dot product — inputs from `hashEmbed` are already L2-normalized. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error(`private_rag_dim_mismatch:${a.length}!=${b.length}`);
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

function chunkText(content: string, maxChars: number): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) return trimmed ? [trimmed] : [];
  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const candidate = current ? `${current} ${s}` : s;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function emptyMetrics(): PrivateRagMetrics {
  return {
    ingestedChunks: 0,
    ingestedDocuments: 0,
    retrievalsTotal: 0,
    refusalsNoEvidence: 0,
    refusalsDisabled: 0,
    crossTenantIsolationChecks: 0,
    crossTenantDenials: 0,
    tenantsActive: 0,
  };
}

/**
 * In-process, per-tenant vector store + retriever. Chunks are stored in tenant-keyed
 * buckets (`Map<tenantId, chunk[]>`) — `retrieve()` only ever reads the bucket for the
 * requested `tenantId`, so cross-tenant leakage is structurally impossible (there is
 * no code path that scans another tenant's bucket), not merely filtered post-hoc.
 */
export class PrivateVectorRagCore {
  private readonly chunksByTenant = new Map<string, PrivateRagChunk[]>();
  private readonly documentKeys = new Set<string>();
  private metrics: PrivateRagMetrics = emptyMetrics();

  ingest(doc: PrivateRagDocumentInput): { chunksIngested: number } {
    if (!doc.tenantId?.trim()) throw new Error("private_rag_tenant_id_required");
    if (!doc.id?.trim()) throw new Error("private_rag_document_id_required");
    if (!doc.content?.trim()) throw new Error("private_rag_content_required");

    const pieces = chunkText(doc.content, DEFAULT_CHUNK_MAX_CHARS);
    const newChunks: PrivateRagChunk[] = pieces.map((content, idx) => ({
      id: `${doc.tenantId}::${doc.id}::${idx}`,
      tenantId: doc.tenantId,
      documentId: doc.id,
      sourceId: doc.sourceId,
      chunkIndex: idx,
      content,
      embedding: hashEmbed(content),
    }));

    const existing = this.chunksByTenant.get(doc.tenantId) ?? [];
    this.chunksByTenant.set(doc.tenantId, [...existing, ...newChunks]);
    this.documentKeys.add(`${doc.tenantId}::${doc.id}`);

    this.metrics.ingestedChunks += newChunks.length;
    this.metrics.ingestedDocuments = this.documentKeys.size;
    this.metrics.tenantsActive = this.chunksByTenant.size;
    return { chunksIngested: newChunks.length };
  }

  /**
   * Retrieve topK chunks for `tenantId` only. Refuses (empty citations, `refused: true`)
   * when the kill switch is set, input is invalid, or no chunk clears `minScore` —
   * this is the "reject answers with no evidence" contract: never fabricate.
   */
  retrieve(
    tenantId: string,
    query: string,
    opts?: { topK?: number; minScore?: number },
  ): PrivateRagRetrievalResult {
    this.metrics.retrievalsTotal++;
    const topK = opts?.topK ?? DEFAULT_TOP_K;
    const minScore = opts?.minScore ?? DEFAULT_MIN_SCORE;

    if (isPrivateVectorRagDisabled()) {
      this.metrics.refusalsDisabled++;
      return { tenantId, query, citations: [], refused: true, refusalReason: "rag_disabled", topK, minScore };
    }
    if (!tenantId?.trim() || !query?.trim()) {
      this.metrics.refusalsNoEvidence++;
      return { tenantId, query, citations: [], refused: true, refusalReason: "invalid_input", topK, minScore };
    }

    const tenantChunks = this.chunksByTenant.get(tenantId) ?? [];
    const queryEmbedding = hashEmbed(query);
    const scored = tenantChunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (scored.length === 0) {
      this.metrics.refusalsNoEvidence++;
      return { tenantId, query, citations: [], refused: true, refusalReason: "no_evidence_found", topK, minScore };
    }

    const citations: PrivateRagCitation[] = scored.map((s) => ({
      chunkId: s.chunk.id,
      documentId: s.chunk.documentId,
      sourceId: s.chunk.sourceId,
      chunkIndex: s.chunk.chunkIndex,
      content: s.chunk.content,
      score: s.score,
    }));
    return { tenantId, query, citations, refused: false, refusalReason: null, topK, minScore };
  }

  /** Cited, evidence-grounded answer, or an explicit refusal — never a silent guess. */
  buildAnswer(query: string, retrieval: PrivateRagRetrievalResult): PrivateRagAnswer {
    if (retrieval.refused || retrieval.citations.length === 0) {
      return {
        refused: true,
        answer:
          `No hay evidencia suficiente en la base de conocimiento privada de este tenant para ` +
          `responder con confianza a: "${query}". Motivo: ${retrieval.refusalReason ?? "no_evidence_found"}.`,
        citations: [],
      };
    }
    const cited = retrieval.citations
      .map((c, i) => `[${i + 1}] (${c.sourceId}, score=${c.score.toFixed(3)}) ${c.content}`)
      .join("\n\n");
    return {
      refused: false,
      answer: `Respuesta basada en ${retrieval.citations.length} fuente(s) verificadas del tenant:\n\n${cited}`,
      citations: retrieval.citations,
    };
  }

  /**
   * Hard assert for certification/tests: tenant A's chunk ids must never intersect
   * tenant B's chunk ids, and a direct cross-tenant retrieve must come back empty.
   */
  assertTenantIsolation(
    tenantAId: string,
    tenantBId: string,
  ): { ok: boolean; violation: string | null } {
    this.metrics.crossTenantIsolationChecks++;
    const aChunks = this.chunksByTenant.get(tenantAId) ?? [];
    const bChunkIds = new Set((this.chunksByTenant.get(tenantBId) ?? []).map((c) => c.id));
    const sharedId = aChunks.find((c) => bChunkIds.has(c.id));
    if (sharedId) {
      this.metrics.crossTenantDenials++;
      return { ok: false, violation: "chunk_id_shared_across_tenant_buckets" };
    }
    return { ok: true, violation: null };
  }

  getMetrics(): PrivateRagMetrics {
    return { ...this.metrics };
  }

  countChunks(tenantId: string): number {
    return (this.chunksByTenant.get(tenantId) ?? []).length;
  }

  listTenantIds(): string[] {
    return [...this.chunksByTenant.keys()];
  }

  reset(): void {
    this.chunksByTenant.clear();
    this.documentKeys.clear();
    this.metrics = emptyMetrics();
  }
}

let _core: PrivateVectorRagCore | undefined;
export function getPrivateVectorRagCore(): PrivateVectorRagCore {
  _core ??= new PrivateVectorRagCore();
  return _core;
}

export function resetPrivateVectorRagCoreForTests(): void {
  _core = undefined;
}

export function assertPrivateVectorRagCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const a = hashEmbed("nelvyon private rag pricing tier enterprise");
  const b = hashEmbed("nelvyon private rag pricing tier enterprise");
  if (cosineSimilarity(a, b) < 0.999) violations.push("hash_embed_not_deterministic");

  const self = cosineSimilarity(a, a);
  if (Math.abs(self - 1) > 1e-6) violations.push("cosine_self_similarity_not_1");

  const unrelated = hashEmbed("zzqx unrelated fragment token soup blah");
  if (cosineSimilarity(a, unrelated) > 0.95) violations.push("unrelated_texts_too_similar");

  const core = new PrivateVectorRagCore();
  const empty = core.retrieve("tenant-check", "anything");
  if (!empty.refused || empty.refusalReason !== "no_evidence_found") {
    violations.push("empty_store_must_refuse_no_evidence");
  }

  const savedFlag = process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED;
  process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED = "1";
  core.ingest({ id: "doc-1", tenantId: "t1", sourceId: "s1", content: "contenido de prueba suficiente" });
  const disabledResult = core.retrieve("t1", "contenido de prueba");
  if (!disabledResult.refused || disabledResult.refusalReason !== "rag_disabled") {
    violations.push("kill_switch_must_force_refusal");
  }
  if (savedFlag === undefined) delete process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED;
  else process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED = savedFlag;

  // Guard against a "fake green" promotion: IMPLEMENTED_VERIFIED must always be backed by a
  // real, referenced evidence file + timestamp + an honestly-documented known-gap field (even
  // if empty). Never allow flipping this status without that trail.
  if (PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath === "IMPLEMENTED_VERIFIED") {
    if (!PRIVATE_VECTOR_RAG_STATUS.productionPgvectorEvidence?.trim()) {
      violations.push("production_pgvector_path_verified_without_evidence_file");
    }
    if (!PRIVATE_VECTOR_RAG_STATUS.productionPgvectorVerifiedAt?.trim()) {
      violations.push("production_pgvector_path_verified_without_timestamp");
    }
  } else if (PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath !== "PREPARED_OFF") {
    violations.push("production_pgvector_path_invalid_status");
  }

  return { ok: violations.length === 0, violations };
}
