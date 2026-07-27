# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-27** — canary CEO SÍ **FAIL** (race env) → **KILL ON** · corrección 403+smoke wait · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | `775f7537` (+ corrección canary 403/wait **uncommitted**) |
| **Prod deploy** | `dd1f9922` (tip up) · kill steady |
| **Fecha doc** | 2026-07-27 |
| **Rama** | `main` |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 3 RAG/pgvector | staging | USE_MAIN_DB + schema | e2e **PASS** | USE_MAIN_DB=0 | **IMPLEMENTED_VERIFIED** |
| 3 RAG/pgvector | prod | schema+RLS · AI off | prep PASS | kill | **PREPARED** |
| 4 IA privada canary | prod | **KILL ON** · AI=0 | smoke FAIL (race) · kill ~1.3s PASS | kill &lt;5 min | **KILLED** — pending retry post-fix |

## Próximo paso EXACTO

1. Commit+deploy tip corrección (`PRIVATE_AI_CANARY_BLOCKED`→403 + smoke readiness wait).
2. CEO confirma **reintento** del canary (o reutiliza SÍ tras corrección).
3. Abrir ventana → **esperar deploy SUCCESS** → smoke (inference+RAG+A/B) → kill drill.
4. Legal/OAuth/clientes reales pendientes · **No declarar READY.**

### Rollback rápido (canary)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
