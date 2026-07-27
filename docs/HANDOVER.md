# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-27** — canary retry **PASS** · kill drill **PASS** · steady **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último commit tip** | `8c5c2768` |
| **Prod deploy** | `5ef3b8d8` (fix) · `8f348e61` (canary window) |
| **Fecha doc** | 2026-07-27 |
| **Rama** | `main` |

---

## Estado actual

| Punto | Entorno | Activado | Pruebas | Rollback | Estado |
|-------|---------|----------|---------|----------|--------|
| 3 RAG/pgvector | staging | USE_MAIN_DB + schema | e2e **PASS** | USE_MAIN_DB=0 | **IMPLEMENTED_VERIFIED** |
| 3 RAG/pgvector | prod | schema+RLS | canary RAG e2e **PASS** | kill | **IMPLEMENTED_VERIFIED** (prep+probe) |
| 4 IA privada canary | prod | **KILL ON** (post-drill) | HTTP+RAG **ALL_PASS** · kill ~1.5s | kill &lt;5 min | **IMPLEMENTED_VERIFIED** · steady **KILLED** |

## Próximo paso EXACTO

1. CEO decide si **extiende** ventana canary ON (flags abajo) o deja KILLED.
2. Legal / OAuth / clientes reales siguen pendientes.
3. **No declarar READY.**

### Reabrir ventana (si CEO extiende)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=0
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1
NELVYON_AI_ENABLED=1
OLLAMA_CONFIGURED=1
NELVYON_AI_MODE=local
PRIVATE_MODE=ON
AUTONOMOUS_ALLOW_OPENAI=0
# esperar deploy SUCCESS antes de tráfico
```

### Rollback rápido

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```
