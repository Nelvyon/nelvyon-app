# NELVYON Local Private AI

100% owner-machine stack. No Railway, Supabase, or cloud DB required.

## Quick start

```bash
# 1. Hardware audit (no model downloads)
node scripts/hardware-audit.mjs

# 2. Start PostgreSQL + pgvector (127.0.0.1:5434 only)
node scripts/local-ai-up.mjs
node scripts/local-ai-migrate.mjs

# 3. Health check
pnpm -C apps/web exec tsx ../../scripts/local-ai-health.ts
# preferido (SSOT):
node scripts/local-ai-health.mjs

# 4. Full validation (persistence, RLS, backup/restore, localhost, PRIVATE_MODE)
node scripts/local-ai-validate.mjs

# 5. Integration tests (requires Docker)
RUN_LOCAL_AI_INTEGRATION=1 pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiPhase2.test.ts

# 6. Stop
node scripts/local-ai-down.mjs
```

## Environment (owner machine)

```bash
PRIVATE_MODE=ON
LOCAL_AI_DATABASE_URL=postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai
OLLAMA_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text   # pull only after hardware sign-off
LOCAL_AI_EMBEDDING_DIM=768
PRIVATE_MODE_ALLOWED_HOSTS=openclaw,nelvyon-local-ai-postgres
```

## Components

| Module | Role |
|--------|------|
| `LocalMemoryStore` | Tenant-scoped vector memory |
| `LocalVectorStore` | RAG chunk search |
| `LocalEmbeddingProvider` | Ollama embeddings (local) |
| `RagIngestPipeline` | File ingest + chunk + embed |
| `LocalAiBackupService` | pg_dump + optional AES-256-GCM |
| `LocalAiHealth` | Stack health probe |

See `docs/PHASE2_AI_ARCHITECTURE.md`.
