# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-27** — **ADR-069 fail-closed localhost RAG** · IA prod **KILL ON** · `claimReady: false` · **NOT READY** · coste **0**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | (pending push ADR-069) |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 2 Dual-write ERP | staging | DUAL_WRITE=1 · READ=0 | equivalence + A/B + conc ALL_PASS | flag→0 | **IMPLEMENTED_VERIFIED** |
| 2 Dual-write ERP | prod | no | n/a | n/a | **OFF** |
| 3 RAG/pgvector | staging | schema+RLS+USE_MAIN_DB | e2e + RLS A/B | USE_MAIN_DB=0 | **IMPLEMENTED_VERIFIED** |
| 3 RAG/pgvector | prod | no DDL | n/a | n/a | **OFF** |
| 4 IA privada canary | prod | **KILL ON** · AI OFF | smoke FAIL histórico :5434 · fix código fail-closed | kill ON | **FAIL_CLOSED_CODE** (no reabrir) |

## Próximo paso EXACTO

1. Mantener prod: KILL=1 · PROD_CANARY=0 · AI=0 · OLLAMA_CONFIGURED=0 · OpenAI ABSENT · **sin** USE_MAIN_DB / SCHEMA_APPLY.
2. CEO decide **A o B** en `docs/ops/CEO_PROD_RAG_DB_OPTIONS.md` (única decisión abierta para IA prod).
3. Si A: revalidar RAG staging → ADR-064 schema prod → flags mínimos → smoke → kill; **no** antes.
4. Si B: no más acción IA prod.
5. Legal/mercado/OAuth en `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.
6. **No declarar READY. No reintentar canary hasta DB validada (staging) + decisión A.**

### Rollback rápido

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
# never set NELVYON_LOCAL_AI_USE_MAIN_DB / SCHEMA_APPLY on prod without CEO A
```
