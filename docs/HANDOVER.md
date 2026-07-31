# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 12 Ecommerce/Tienda migrado** (flujo pedidos paid + detalle + tokens) · `docs/ops/W3CRM_MIGRATION_PLAN.md` §23 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest **2471 passed / 4 skipped** · store 29/29 · smoke sin sesión (307/401) **PASS** |
| **W3CRM** | Módulos 1–11 **DONE** · módulo 12 **Ecommerce DONE**: flujo de pedidos saltaba/`paid` quedaba sin acciones; `GET orders/[id]` con items no se consumía; settings/errores silenciosos; tokens+KpiTile. Ver §23 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 13 (LMS — `/saas/lms`)**, orden confirmado · no esperar confirmación salvo irreversible/coste/credenciales.
2. Validar visualmente en staging módulos 2–12 (`BLOCKED_ENVIRONMENT` en local).
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
