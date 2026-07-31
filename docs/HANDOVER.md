# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulos 14–18b + auditoría global pasada 1** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §32 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · auditoría global pasada 1 cerrada (12 P1) |
| **W3CRM** | Módulos 1–18b **DONE** · auditoría global **pasada 1 DONE**. Siguiente: pasada 2 + informe final. Ver §32 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **auditoría global pasada 2** (duplicados DS, a11y residual, inconsistencias menores, IA polish si hay P1).
2. Cuando no queden mejoras razonables de alto impacto → informe final con evidencia objetiva (tsc/lint/vitest/build/smoke) manteniendo `claimReady: false`.
3. No prod deploy UI · no flip claimReady · canary KILL.

### Rollback IA / spend

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```
