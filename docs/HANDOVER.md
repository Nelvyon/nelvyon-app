# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-26** — **ADR-067 CEO 1 SÍ / 2–4 NO** · gate migrate **CEO-ACK** · `claimReady: false` · **NOT READY** · **0 activaciones**

> Última actualización automática: **2026-07-26**

| Campo | Valor |
|-------|-------|
| **Último commit** | (sync post-commit) |
| **Fecha doc** | 2026-07-26 |
| **Rama** | `main` |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging live** | tip **`738f8200`** · live+ready OK |
| **Prod live** | tip **`d03721c1`** · OpenAI OFF · gate ADR-064 activo |
| **CEO #1 migrate gate** | **SÍ** — política fail-closed **certificada** · **no** migrate nueva ahora |
| **CEO #2 dual-write** | **NO todavía** — PREPARED_OFF · JSONB SSOT |
| **CEO #3 RAG Railway** | **NO todavía** — apply bloqueado · sin DDL |
| **CEO #4 canary IA prod** | **NO todavía** — IA/OpenAI/OpenClaw/MCP/SM OFF |
| **Coste** | 0 |

## Próximo paso EXACTO

1. Continuar refuerzo interno (tests/seguridad/aislamiento) **sin** activar #2–#4 ni migrate prod.
2. Solo humano / externo: `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md` (Android/iOS/OAuth/legal/mercado).
3. Ventana migrate futura: solo si hay SQL pendiente + set/unset `NELVYON_PROD_MIGRATE_*` (ADR-064).
4. **No READY** sin legal Pepito + mercado + clientes.

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
