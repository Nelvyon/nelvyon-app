# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **W3CRM Fase 1 auditoría + plan** · `docs/ops/W3CRM_MIGRATION_PLAN.md` (ADR-075, supersede parcialmente ADR-074) · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/vitest core **PASS** · P1 UI/encoding/branding/tenant-id **FIXED** (audit previo) · Playwright/build **no** re-ejecutados aquí |
| **W3CRM (nuevo)** | Fase 1 auditoría completa · **conflicto de stack crítico documentado** (Next14/React18/JS/Bootstrap+rsuite vs Next15.5/React19/TS/Tailwind v4) · plan `docs/ops/W3CRM_MIGRATION_PLAN.md` · **BLOQUEADO** hasta que el usuario responda §9 del plan (criterio de reutilización) · sin código de plantilla en producto |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Esperar respuesta del usuario** a la pregunta abierta §9 de `docs/ops/W3CRM_MIGRATION_PLAN.md` (Opción A recomendada: reconstrucción nativa Tailwind v4/TS inspirada en el diseño W3CRM, cero código fuente de plantilla en `apps/web/src`).
2. Tras confirmación: crear `apps/web/src/features/nelvyon-ui/` + página lab `/saas/_ui-lab` (non-prod) y arrancar por el módulo acordado (candidatos: IA NELVYON por alineación con `(aikit)`, o Dashboard ejecutivo por visibilidad).
3. No prod deploy UI · no flip claimReady · canary KILL · no instalar dependencias de W3CRM sin verificar peers contra React 19/Next 15 primero.

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
