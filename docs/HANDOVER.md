# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-26** — **CIERRE TOTAL Cursor** · staging+prod tip **`d03721c1`** · RAG prep PREPARED_OFF · `claimReady: false` · **NOT READY**

> Última actualización automática: **2026-07-26 13:18 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | pending push (cursor total close) |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip **`d03721c1`** · deploy **`d0393675` SUCCESS** · live+ready OK |
| **Prod** | tip **`d03721c1`** · read-only verify · OpenAI OFF |
| **Solo humano** | `docs/ops/CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` |
| **Coste** | 0 |

## Próximo paso EXACTO

1. Abrir `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` y ejecutar ítems A–D (ack migrate, Android one-step, iOS, OAuth, legal).
2. **No READY** sin legal + mercado + clientes.

### Rollback staging

```
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_LOCAL_AI_SCHEMA_APPLY=0
NELVYON_LOCAL_AI_USE_MAIN_DB=0
```
