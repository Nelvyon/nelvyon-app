# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **W3CRM Fase 2: Dashboard ejecutivo migrado** · `docs/ops/W3CRM_MIGRATION_PLAN.md` (ADR-075, supersede parcialmente ADR-074) · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/vitest core **PASS** · P1 UI/encoding/branding/tenant-id **FIXED** (audit previo) · Playwright/build **no** re-ejecutados aquí |
| **W3CRM** | Fase 1 auditoría **DONE** · Fase 2 módulo **Dashboard ejecutivo DONE** (tsc/lint/build/vitest PASS) · usuario confirmó Opción B (reconstrucción nativa + libs puntuales evaluadas) · widgets nuevos en `saas-shell/components/SaasDashboardWidgets.tsx` (sin carpeta `nelvyon-ui` — evita un 3er sistema visual) · sin código de plantilla en producto |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Confirmar con el usuario el siguiente módulo a migrar: **CRM/Pipeline** (uso diario) o **IA NELVYON** (mejor alineación con `(aikit)` de W3CRM) — ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §12.3.
2. Repetir el patrón validado en Dashboard: nuevos widgets en `saas-shell/components/`, cero mock data, tsc/lint/build/vitest PASS antes de cerrar el módulo, commit separado.
3. Evaluar `@hello-pangea/dnd@18.0.1` (React 19 ✅) para kanban de `pipeline` y `@fullcalendar/react@7.0.2` (React 19 ✅) para `citas`/`calendar` solo cuando se aborden esos módulos — no instalar antes de tiempo.
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
