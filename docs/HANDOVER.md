# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 15 Membresías** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §26 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest **2480 passed / 4 skipped** · smoke GET 307/401 **PASS** |
| **W3CRM** | Módulos 1–14 **DONE** · módulo 15 **Memberships DONE**: parse comisiones array, subscribe UI, isActive write, PATCH/DELETE `contacts.write`. Ver §26 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **módulo 16 — ERP** (`/saas/erp/purchases|inventory|manufacturing|projects|sectors`) — no esperar confirmación salvo irreversible/coste/credenciales.
2. Validar visualmente en staging módulos 2–15 (`BLOCKED_ENVIRONMENT` en local).
3. Patrón: auditar → APIs reales → causas raíz → gates → commits → docs.
4. No prod deploy UI · no flip claimReady · canary KILL.

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
