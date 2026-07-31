# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 17b P1 gestión operativa** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §29 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest **2480 passed / 4 skipped** · smoke 307/401 |
| **W3CRM** | Módulos 1–17b **DONE** (gestión operativa completa P0+P1). Siguiente: cuenta/plataforma SaaS + IA polish + auditoría global. Ver §29 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **módulo 18 — Cuenta / plataforma** (settings, integraciones, marketplace, api-keys, webhooks, white-label, partner, lead-scoring, voice, PWA, comunidades, herramientas, entregables) — lotes P0 primero.
2. Luego polish IA (packs, playbooks, brief-to-launch, compliance, benchmark, copywriter) + **auditoría global SaaS**.
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
