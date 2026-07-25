# Railway staging — pgvector / Private RAG probe (read-only)

> Fecha: 2026-07-25 · tip live staging `e5cb8c85` · **no DDL** · **no ingest** · OpenAI OFF

## Extension

| Check | Result |
|-------|--------|
| Postgres | 17.6 |
| `pg_available_extensions.vector` | **0.8.0** available |
| `pg_extension.vector` | **INSTALLED 0.8.0** |
| Scripts | `scripts/probe-pgvector.mjs` · `scripts/probe-rag-schema.mjs` · `scripts/probe-rag-tables.mjs` |

## Env (staging `ideal-victory`)

| Var | Value |
|-----|-------|
| `OLLAMA_HOST` | SET |
| `OLLAMA_CONFIGURED` | 1 |
| `NELVYON_AI_ENABLED` | 1 |
| `LOCAL_AI_DATABASE_URL` | **ABSENT** |
| `AUTONOMOUS_ALLOW_OPENAI` | 0 |

## Tables on shared `DATABASE_URL`

| Table | Exists | vector column | Notes |
|-------|--------|---------------|-------|
| `nelvyon_rag_chunks` | yes | **no** | text/jsonb adjunct only · count 0 |
| `saas_tenant_memory_chunks` | yes | **no** | text/jsonb · count 0 |
| `local_ai_rag_chunks` | **no** | — | Required by Docker Private RAG path |
| `local_ai_rag_documents` | **no** | — | Required by Docker Private RAG path |

## Verdict

| Layer | Estado |
|-------|--------|
| Extension pgvector on Railway staging | **IMPLEMENTED_VERIFIED** (read-only probe) |
| Private RAG vector path (LocalVectorStore) on Railway | **PREPARED_OFF** |
| Docker local RAG e2e | **IMPLEMENTED_VERIFIED** (prior `pgvector-rag.live_latest.md`) |
| Why blocked | No `local_ai_rag_*` schema on shared DB · `LOCAL_AI_DATABASE_URL` absent · applying full vector schema to shared SaaS DB is an architectural/ops decision (risk + future prod migrate gate) — **not** executed this session |
| Exact next (Daniel/CEO) | Approve staging-only migrate for `local_ai_rag_*` **or** provision dedicated local-ai Postgres (may imply cost) · set `LOCAL_AI_DATABASE_URL` · re-run `staging-smoke-pgvector-rag-e2e.mjs` against Railway |

**claimReady: false** · no OpenAI · no prod change
