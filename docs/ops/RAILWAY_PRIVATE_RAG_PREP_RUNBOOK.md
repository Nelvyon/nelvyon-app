# Runbook — Railway Private RAG prep (PREPARED_OFF)

> **Estado: PREPARED_OFF** · schema apply **no** ejecutado en esta sesión  
> Extension pgvector en staging: **INSTALLED** (vector 0.8.0) — ver `railway.pgvector_probe_latest.md`  
> Fecha: 2026-07-26 · OpenAI **OFF** · prod canary **OFF**

## Qué ya está listo (Cursor)

| Artefacto | Rol |
|-----------|-----|
| `backend/local-ai/migrations/001_local_ai_base.sql` | DDL local_ai_* + RLS + ivfflat |
| `scripts/apply-local-ai-schema.mjs` | Apply fail-closed (requiere flags) |
| `backend/local-ai/railwayRagPrep.ts` | Resolvers fail-closed + tests |
| `scripts/probe-pgvector.mjs` / `probe-rag-tables.mjs` | Read-only probes |
| Docker e2e | `pgvector-rag.live_latest.md` **VERIFIED** |

## Flags (default OFF)

| Var | Exacto `1` significa |
|-----|----------------------|
| `NELVYON_LOCAL_AI_SCHEMA_APPLY` | Permitir ejecutar apply script |
| `NELVYON_LOCAL_AI_USE_MAIN_DB` | Usar `DATABASE_URL` compartido si no hay `LOCAL_AI_DATABASE_URL` |
| `LOCAL_AI_DATABASE_URL` | Preferido: Postgres dedicado (puede implicar coste — **no** crear aquí) |

## Procedimiento CEO / Daniel (staging only)

1. Elegir: (A) DB dedicada local-ai **o** (B) shared staging DB con `USE_MAIN_DB=1`.
2. Ventana corta:
   ```
   NELVYON_LOCAL_AI_SCHEMA_APPLY=1
   NELVYON_LOCAL_AI_USE_MAIN_DB=1   # solo si opción B
   ```
3. `railway run -e staging -s ideal-victory -- node scripts/apply-local-ai-schema.mjs`
4. Unset `NELVYON_LOCAL_AI_SCHEMA_APPLY` inmediatamente.
5. Smoke: `node scripts/staging-smoke-pgvector-rag-e2e.mjs` apuntando a esa URL (Ollama mesh).
6. **No** prod canary · **no** OpenAI · **no** Pepito.

## Rollback (&lt;5 min)

1. Unset `LOCAL_AI_DATABASE_URL` / `NELVYON_LOCAL_AI_USE_MAIN_DB` / schema apply flag.
2. Redeploy tip previo si wiring cambió.
3. Datos: PITR / no DROP improvisado en shared DB.

## Prod

Cualquier migrate en `backend/db/migrations` sigue ADR-064. Este schema **no** se añadió a migraciones SaaS automáticas a propósito (evita pending prod).

## Prod Option A (2026-07-27) — schema applied, canary OFF

1. Staging e2e reval **PASS_WITH_KNOWN_GAP**.
2. Apply via public DB proxy + `NELVYON_PROD_LOCAL_AI_SCHEMA_APPROVED=1` (one-shot; unset after).
3. RLS role `nelvyon_local_ai_app` · `LOCAL_AI_DATABASE_URL` on `@nelvyon/web`.
4. Keep KILL=1 · AI=0 · canary=0 · OLLAMA_CONFIGURED=0.
5. CEO SÍ/NO: `docs/ops/CEO_PROD_CANARY_OPEN_YN.md`.

`claimReady: false`
