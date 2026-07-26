# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-26** — **ADR-068 prod canary attempt** · tip **`1eaed9f2`** · prod kill **ON** · `claimReady: false` · **NOT READY** · coste **0**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | 1eaed9f2 |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 2 Dual-write ERP | staging | DUAL_WRITE=1 · READ=0 | equivalence + A/B + conc ALL_PASS | flag→0 | **IMPLEMENTED_VERIFIED** |
| 2 Dual-write ERP | prod | no | n/a | n/a | **OFF** |
| 3 RAG/pgvector | staging DB existente | schema+RLS+USE_MAIN_DB | e2e PASS_WITH_KNOWN_GAP · RLS A/B PASS | drop/PITR runbook | **IMPLEMENTED_VERIFIED** (critical) |
| 3 RAG/pgvector | prod | no DDL | n/a | n/a | **OFF** |
| 4 IA privada canary | prod | ventana abierta → **KILL** | smoke real · mesh OK · inference FAIL `127.0.0.1:5434` | kill ~1.3s | **ATTEMPTED_FAIL_CLOSED** (not IMPLEMENTED_VERIFIED) |

## Próximo paso EXACTO

1. Mantener prod: `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1` · `PROD_CANARY_ENABLED=0` · `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` · OpenAI ABSENT.
2. Antes de reabrir canary: resolver DB local-AI en prod — **(A)** ADR-064 + schema `local_ai_*` + `NELVYON_LOCAL_AI_USE_MAIN_DB=1`, **o** **(B)** fail-closed code: nunca default `127.0.0.1:5434` en production + path de inferencia mínima sin Postgres local-AI.
3. Reabrir ventana mínima → `prod-smoke-private-ai-canary.mjs` debe PASS inference + kill drill &lt;5 min → dejar killed o extensión CEO.
4. Legal/mercado/OAuth en `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.
5. **No declarar READY.**

### Rollback rápido

```
# Staging ERP
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_ERP_RELATIONAL_READ=0

# Staging RAG
NELVYON_LOCAL_AI_USE_MAIN_DB=0
# unset LOCAL_AI_DATABASE_URL if needed

# Prod canary (estado actual post-intento)
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
