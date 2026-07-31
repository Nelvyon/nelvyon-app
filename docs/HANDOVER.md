# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 13 LMS migrado** (progreso/certificados reales + delete curso) · `docs/ops/W3CRM_MIGRATION_PLAN.md` §24 · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · vitest **2472 passed / 4 skipped** · smoke GET 307/401 **PASS** |
| **W3CRM** | Módulos 1–12 **DONE** · módulo 13 **LMS DONE**: `listEnrollments` no devolvía progreso ni `certificate_url` → barra siempre 0% y certs “perdidos”; DELETE curso + publish status + tokens/KpiTile. Ver §24 |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con **módulo 14 — Afiliados / Fidelización** (`/saas/affiliates`, `/saas/loyalty`) — no esperar confirmación salvo irreversible/coste/credenciales.
2. Validar visualmente en staging módulos 2–13 (`BLOCKED_ENVIRONMENT` en local).
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
