# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 17 P0 countdown/snippets/AB/QR** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §28 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest **2480 passed / 4 skipped** |
| **W3CRM** | Módulos 1–16 **DONE** · módulo 17 **P0 DONE** (countdown/snippets/ab-testing/qr). P1 pendiente: helpdesk, documentos, encuestas, prospecting, objetos. Ver §28 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **módulo 17b — Gestión operativa P1** (helpdesk, documentos, encuestas, prospecting, objetos) — no esperar confirmación salvo irreversible/coste/credenciales.
2. Luego resto cuenta/IA pendientes + auditoría global SaaS.
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
