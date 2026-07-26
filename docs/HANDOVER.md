# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-26** — **PUNTOS 1–4 PREP COMMITTED** · live tip **`d03721c1`** · `claimReady: false` · **NOT READY** · **nada activado**

> Última actualización automática: **2026-07-26 13:39 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | 43d7c3db |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip **`d03721c1`** · live+ready OK · ERP A/B+conc+persist **ALL_PASS** |
| **Prod** | tip **`d03721c1`** · OpenAI OFF · migrate gate ADR-064 activo |
| **Puntos 1–4** | Prep **commiteada** · activación **OFF** · frases SÍ/NO en `docs/ops/CEO_POINTS_1_4_APPROVAL_REQUEST.md` |
| **Coste** | 0 |
| **NO hecho** | dual-write · RAG schema apply · canary IA prod · migrate prod nueva · flags productivos |

## Próximo paso EXACTO

1. Daniel responde **SÍ/NO** a las **4 frases** en `docs/ops/CEO_POINTS_1_4_APPROVAL_REQUEST.md`.
2. Sin SÍ: no migrate prod · no dual-write · no apply RAG schema · no canary IA.
3. Resto humano: `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` (Android/iOS/OAuth/legal).
4. **No READY** sin legal + mercado + clientes.

### Rollback / fail-closed (sin cambio)

```
NELVYON_PROD_MIGRATE_APPROVED unset
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_ERP_RELATIONAL_READ=0
NELVYON_LOCAL_AI_SCHEMA_APPLY=0
NELVYON_LOCAL_AI_USE_MAIN_DB=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_AI_ENABLED=0   # prod
```
