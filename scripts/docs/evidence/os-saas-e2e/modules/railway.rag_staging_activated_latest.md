# Railway staging Private RAG — activation evidence (ADR-068)

> Fecha: **2026-07-26** · coste incremental **0** · OpenAI OFF · prod DDL **not** applied

## Schema

| Check | Result |
|-------|--------|
| Apply `001_local_ai_base.sql` on staging shared DB | **OK** (`vector` 0.8.0 · tables `local_ai_*`) |
| RLS role `nelvyon_local_ai_app` NOSUPERUSER NOBYPASSRLS | **CREATED** · grants only `local_ai_*` |
| `LOCAL_AI_DATABASE_URL` pooler user format `role.projectref` | **SET** on staging |
| Prod DDL | **NOT applied** |

## E2E

| Check | Result |
|-------|--------|
| `staging-smoke-pgvector-rag-e2e.mjs` via railway run + Ollama mesh | **PASS_WITH_KNOWN_GAP** |
| Ingest + real embeddings 768-dim | PASS |
| Retrieval + citations/provenance | PASS |
| App-layer tenant A/B isolation | PASS |
| RLS-layer tenant A/B isolation | **PASS** (0 rows cross-tenant) |
| Default minScore=0.32 refuse on tiny corpus | quality FAIL (known gap; strict 0.55 PASS) |

Evidence: `pgvector-rag.live_latest.md` (2026-07-26T14-23-37Z)

## Status

| Layer | Estado |
|-------|--------|
| Railway staging Private RAG path | **IMPLEMENTED_VERIFIED** (critical) · quality gap documented |
| Prod RAG / canary RAG | **OFF** |
| claimReady | **false** |
