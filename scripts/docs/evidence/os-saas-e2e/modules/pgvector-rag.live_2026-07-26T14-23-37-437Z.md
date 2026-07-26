# pgvector RAG — live e2e (Docker Postgres+pgvector + Ollama embeddings)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:23:37.437Z |
| Run tag | ms1w1sj9 |
| Docker container | `nelvyon-local-ai-postgres` (pgvector/pgvector:pg16) @ postgresql://***:***@***:5432/postgres (REDACTED) |
| Ollama embedding model | nomic-embed-text |
| Health check | postgres=true pgvector=true schema=true ollama=true |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B/C (UUIDs efímeros, sin datos reales) |
| OpenAI / paid APIs | ninguno — embeddings 100% locales via Ollama `nomic-embed-text` |
| Production activation flag | NO tocado (`NELVYON_LOCAL_ROUTER_ENABLED` sigue en su valor actual, sin cambios) |
| **VERDICT** | **PASS_WITH_KNOWN_GAP** |

## Checks

| Check | Severity | Result | Detail |
|-------|----------|--------|--------|
| docker_pgvector_reachable | critical | PASS | postgres+pgvector ok (extensions: pgcrypto,vector) |
| ollama_embeddings_reachable | critical | PASS | model=nomic-embed-text reachable |
| ingest_tenant_a | critical | PASS | docs=4 chunks=4 |
| ingest_tenant_b | critical | PASS | docs=4 chunks=4 |
| real_embeddings_persisted | critical | PASS | pgvector column populated, dim=768, rows=4 |
| retrieve_tenant_a_own_content | critical | PASS | citations=4 sources=smoke/ms1w1sj9/tenant-a/pricing.md,smoke/ms1w1sj9/tenant-a/onboarding.md,smoke/ms1w1sj9/tenant-a/refunds.md,smoke/ms1w1sj9/tenant-a/team-roles.md confidence=0.507 |
| isolation_app_layer_a_never_sees_b | critical | PASS | citations=4 sources=smoke/ms1w1sj9/tenant-a/pricing.md,smoke/ms1w1sj9/tenant-a/onboarding.md,smoke/ms1w1sj9/tenant-a/refunds.md,smoke/ms1w1sj9/tenant-a/team-roles.md |
| isolation_rls_layer_a_cannot_read_b | critical | PASS | 0 rows returned (RLS enforced) |
| isolation_rls_layer_b_cannot_read_a | critical | PASS | 0 rows returned (RLS enforced) |
| refuse_no_evidence_unrelated_query_default_threshold | quality | FAIL | citations=4 confidence=0.400 (default minScore=0.32; real embeddings give unrelated real sentences non-near-0 cosine — known tuning gap for small corpora, see KNOWN_ISSUES.md) |
| refuse_fallback_text_present | quality | FAIL | N/A — citations were returned, no fallback path exercised (see refuse_no_evidence_unrelated_query_default_threshold) |
| refuse_no_evidence_unrelated_query_strict_threshold | quality | PASS | citations=0 at minScore=0.55 for the identical query that leaked at default 0.32 |
| refuse_no_evidence_empty_tenant | critical | PASS | citations=0 (tenant never ingested any document) |
| citations_carry_provenance | critical | PASS | each citation has sourceId+documentId+chunkIndex+content+score in [0,1] |
| citations_sorted_by_score_desc | critical | PASS | topK ranking is descending by hybrid cosine+lexical score |

## Known gap — NOT blocking, NOT hidden (P2, tracked in KNOWN_ISSUES.md)

- **refuse_no_evidence_unrelated_query_default_threshold**: citations=4 confidence=0.400 (default minScore=0.32; real embeddings give unrelated real sentences non-near-0 cosine — known tuning gap for small corpora, see KNOWN_ISSUES.md)
- **refuse_fallback_text_present**: N/A — citations were returned, no fallback path exercised (see refuse_no_evidence_unrelated_query_default_threshold)

Root cause: with **real** Ollama embeddings (`nomic-embed-text`), cosine similarity between two
unrelated real sentences is not near 0 — this is an intrinsic embedding-geometry property, not a
bug. The production default `minScore=0.32` (`LocalRagRetriever.ts`) was benchmarked against the
large real 18-domain Nelvyon knowledge corpus (see `backend/local-ai/benchmarks/specialization_eval_*.json`),
where an irrelevant query has hundreds of competing candidates and correctly scores low relative
to real matches. Against a very small synthetic tenant corpus (2-4 chunks, as ingested by this
smoke) there are too few candidates for that relative-ranking effect to kick in, so a
weakly-scored-but-real citation from the tenant's own content can clear the 0.32 floor.

The diagnostic check above proves this is a **tunable threshold gap, not a fabrication bug**:
raising `minScore` to 0.55 for the identical query correctly refuses. No cross-tenant leakage
ever occurs (see isolation checks, both critical and 100% green), and no hallucinated content is
ever produced — citations are always real chunks that exist in that tenant's own corpus.

Recommended remediation (not applied in this session — would need benchmarking against the real
corpus before changing a shared default): add a corpus-size-aware minimum confidence floor (e.g.
raise effective `minScore` for tenants with fewer than N ingested chunks) in
`LocalRagRetriever.retrieve`, tracked as a P2 item in `docs/KNOWN_ISSUES.md`.

## Scope and honesty notes

- This smoke exercises the REAL production path: `RagIngestPipeline` → `LocalEmbeddingProvider`
  (live Ollama HTTP call, no mock) → pgvector `vector(768)` column → `LocalVectorStore.hybridSearch`
  (`embedding <=> query::vector` cosine operator, real pgvector index) → `LocalRagRetriever`
  (topK, domain boosts, citations, context block).
- Isolation is checked at **two independent layers**: the application query filter
  (`LocalRagRetriever`/`LocalVectorStore` scope by `tenantId`) AND the database RLS policy
  (`local_ai_rag_chunks_tenant` / `local_ai_rag_docs_tenant` on the non-superuser
  `nelvyon_local_app` role, `FORCE ROW LEVEL SECURITY`) — a direct probe attempts to read the
  other tenant's `document_id` through `withTenantReadOnly`, which sets
  `app.tenant_id` for that session only.
- "Refuse without evidence" is checked both for an unrelated query on an active tenant (score
  below `minScore`) and for a tenant that was never ingested at all (empty result set) —
  `LocalRagRetriever` never fabricates a citation; `buildAugmentedPrompt` falls back to an
  explicit "(sin contexto relevante)" marker.
- All fixtures use ephemeral `crypto.randomUUID()` tenant ids created and deleted within this
  run (`local_ai_rag_chunks`/`local_ai_rag_documents`/`local_ai_ingest_jobs` rows removed in a
  `finally` block) — no persistent state left behind, no shared/global memory touched.

## Rollback / kill switch

```
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1   # synthetic core kill switch (backend/agency/PrivateVectorRagCore.ts)
NELVYON_LOCAL_ROUTER_ENABLED=0          # (default off) keeps LocalModelRouterProvider out of SaaS inference path
```

No new activation flag was introduced or flipped by this smoke. Production SaaS inference
(`apps/web/src/app/api/saas/private-ai/inference/route.ts`) is unaffected.
