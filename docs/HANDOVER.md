# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 18 cuenta/plataforma** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §30 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest saas **2437 passed / 4 skipped** · smoke 307/401 |
| **W3CRM** | Módulos 1–18 **DONE** (gestión + cuenta P0/P1). Siguiente: resto cuenta + IA polish + auditoría global. Ver §30 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **módulo 18b** — api-keys, white-label, partner, voice, comunidades, entregables, integraciones (P0 primero).
2. Luego polish IA + **auditoría global SaaS** (bugs, UX, a11y, dupes, arquitectura).
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
