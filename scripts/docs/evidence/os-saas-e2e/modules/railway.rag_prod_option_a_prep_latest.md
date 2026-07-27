# Evidence — ADR-069 Option A: prod RAG prep (canary NOT opened)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27 |
| CEO | Option **A** — preparación segura only |
| Canary / AI / OpenAI / MCP / SM / OpenClaw | **OFF** |
| claimReady | **false** · **NOT READY** |
| Coste | **0** |

## Staging reval

| Gate | Result |
|------|--------|
| Ingest A/B + embeddings 768 | PASS |
| Retrieval + citations provenance | PASS |
| App A/B isolation | PASS |
| RLS A/B isolation | PASS |
| Empty tenant refuse | PASS |
| Staging RAG e2e | **PASS** (críticos+calidad; gap cerrado ADR-070) |
| Concurrent load 8× retrieve | **PASS** (~861 ms) |
| Evidence | `pgvector-rag.live_latest.md` |

## Production prep

| Gate | Result |
|------|--------|
| Fail-closed unit (no localhost/:5434) | PASS (48 tests subset) |
| Schema apply `001_local_ai_base.sql` | PASS · vector **0.8.3** · tables `local_ai_*` |
| RLS FORCE on memory/chunks/docs | PASS |
| Role `nelvyon_local_ai_app` NOSUPERUSER NOBYPASSRLS | PASS |
| `LOCAL_AI_DATABASE_URL` set on `@nelvyon/web` | SET (secret) |
| Ephemeral A/B RLS probe + cleanup | PASS (`railway.rag_prod_prep_latest.md`) |
| KILL=1 · canary=0 · AI=0 · OLLAMA_CONFIGURED=0 | PASS |
| SCHEMA_APPLY / prod approval vars | ABSENT (not left on) |

## Rollback &lt;5 min (canary window — not opened)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

Schema rollback: PITR / ops DROP `local_ai_*` only with CEO — not improvisado.

## Next

CEO answers **SÍ/NO** in `docs/ops/CEO_PROD_CANARY_OPEN_YN.md` before any canary open.
