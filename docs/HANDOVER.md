# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-27** — **CEO Option A RAG prep** · canary **OFF** · `claimReady: false` · **NOT READY** · coste **0**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | (pending) |
| **Fecha doc** | 2026-07-27 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 3 RAG/pgvector | staging | USE_MAIN_DB + schema | e2e reval PASS_WITH_KNOWN_GAP | USE_MAIN_DB=0 | **IMPLEMENTED_VERIFIED** |
| 3 RAG/pgvector | prod | schema+RLS role · AI off | prep A/B RLS PASS | kill / unset URL / PITR | **PREPARED** (canary not open) |
| 4 IA privada canary | prod | **KILL ON** · AI=0 | pending CEO SÍ/NO | kill &lt;5 min | **PREPARED_OFF** |

## Próximo paso EXACTO

1. CEO responde **SÍ o NO** en `docs/ops/CEO_PROD_CANARY_OPEN_YN.md`.
2. Si **NO**: no más acción IA prod.
3. Si **SÍ**: abrir ventana mínima (kill=0 · canary=1 · AI=1 · OLLAMA_CONFIGURED=1 · OpenAI=0) → `prod-smoke-private-ai-canary.mjs` → kill drill → documentar.
4. Legal/OAuth/mercado siguen pendientes · **No declarar READY.**

### Rollback rápido (canary)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
