# Vitest skipped tests — criterios de activación (SSOT)

Suite principal: `backend/saas` + `backend/email` + `src/features/saas-crm` + `backend/db`.

Última evidencia verify-all: **2431 passed / 6 skipped** (2026-07-20).

| Test | Activación | Motivo |
|------|------------|--------|
| `backend/db/__tests__/rls.test.ts` ×2 live | `RUN_SUPABASE_RLS=1` + JWTs dos tenants | RLS live Supabase |
| `backend/saas/__tests__/phase2EliteLive.test.ts` | `NELVYON_ELITE_LIVE=1` | Ollama live elite E2E |
| `backend/saas/__tests__/workforceLive.test.ts` | `NELVYON_WORKFORCE_LIVE=1` (o flags doc) | Ollama + RAG live |
| `backend/saas/__tests__/localAiPhase2.test.ts` ×2 | `LOCAL_AI_DATABASE_URL` o `RUN_LOCAL_AI_INTEGRATION=1` | Postgres+pgvector |

**Política:** no eliminar skips; no forzar PASS; documentar aquí cualquier skip nuevo.
