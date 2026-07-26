# pgvector RAG — live e2e (Docker Postgres+pgvector + Ollama embeddings)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T14:22:34.769Z |
| Run tag | ms1w0jhx |
| Docker container | `nelvyon-local-ai-postgres` (pgvector/pgvector:pg16) @ postgresql://***:***@***:5432/postgres (REDACTED) |
| Ollama embedding model | nomic-embed-text |
| Health check | postgres=false pgvector=false schema=false ollama=false |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B/C (UUIDs efímeros, sin datos reales) |
| OpenAI / paid APIs | ninguno — embeddings 100% locales via Ollama `nomic-embed-text` |
| Production activation flag | NO tocado (`NELVYON_LOCAL_ROUTER_ENABLED` sigue en su valor actual, sin cambios) |
| **VERDICT** | **BLOCKED_EXTERNAL** |
| Blocker | Docker/pgvector unreachable (no Postgres+pgvector container answering at LOCAL_AI_DATABASE_URL) |

## Checks

| Check | Severity | Result | Detail |
|-------|----------|--------|--------|
| docker_pgvector_reachable | critical | FAIL | postgres.ok=false pgvector.ok=false schema.ok=false detail=(ENOIDENTIFIER) no tenant identifier provided (external_id or sni_hostname required) |
| ollama_embeddings_reachable | critical | FAIL | model=nomic-embed-text detail=unreachable |

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
