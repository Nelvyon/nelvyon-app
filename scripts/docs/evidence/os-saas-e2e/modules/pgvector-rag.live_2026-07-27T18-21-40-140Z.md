# pgvector RAG — live e2e (Docker Postgres+pgvector + Ollama embeddings)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27T18:21:40.140Z |
| Run tag | ms3jzb7z |
| Docker container | `nelvyon-local-ai-postgres` (pgvector/pgvector:pg16) @ postgresql://nelvyon_local_ai_app:***@reseau.proxy.rlwy.net:45040/railway |
| Ollama embedding model | nomic-embed-text |
| Health check | postgres=true pgvector=true schema=true ollama=true |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B/C (UUIDs efímeros, sin datos reales) |
| OpenAI / paid APIs | ninguno — embeddings 100% locales via Ollama `nomic-embed-text` |
| Production activation flag | NO tocado (`NELVYON_LOCAL_ROUTER_ENABLED` sigue en su valor actual, sin cambios) |
| **VERDICT** | **PASS** |

## Checks

| Check | Severity | Result | Detail |
|-------|----------|--------|--------|
| docker_pgvector_reachable | critical | PASS | postgres+pgvector ok (extensions: vector,pgcrypto) |
| ollama_embeddings_reachable | critical | PASS | model=nomic-embed-text reachable |
| ingest_tenant_a | critical | PASS | docs=4 chunks=4 |
| ingest_tenant_b | critical | PASS | docs=4 chunks=4 |
| real_embeddings_persisted | critical | PASS | pgvector column populated, dim=768, rows=4 |
| retrieve_tenant_a_own_content | critical | PASS | citations=1 sources=smoke/ms3jzb7z/tenant-a/pricing.md confidence=0.725 |
| isolation_app_layer_a_never_sees_b | critical | PASS | citations=1 sources=smoke/ms3jzb7z/tenant-a/pricing.md |
| isolation_rls_layer_a_cannot_read_b | critical | PASS | 0 rows returned (RLS enforced) |
| isolation_rls_layer_b_cannot_read_a | critical | PASS | 0 rows returned (RLS enforced) |
| refuse_no_evidence_unrelated_query_default_threshold | quality | PASS | citations=0 confidence=0.000 effectiveMinScore=0.45 activeChunks=4 |
| refuse_fallback_text_present | quality | PASS | buildAugmentedPrompt falls back to explicit no-context marker, never fabricates |
| refuse_no_evidence_unrelated_query_strict_threshold | quality | PASS | citations=0 at base minScore=0.55 (effective=0.55) |
| refuse_no_evidence_empty_tenant | critical | PASS | citations=0 (tenant never ingested any document) |
| citations_carry_provenance | critical | PASS | each citation has sourceId+documentId+chunkIndex+content+score in [0,1] |
| citations_sorted_by_score_desc | critical | PASS | topK ranking is descending by hybrid cosine+lexical score |

No known gaps — all checks (critical and quality) passed.

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
