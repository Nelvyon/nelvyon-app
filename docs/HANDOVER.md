# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **W3CRM Fase 2: CRM/Pipeline migrado + fix de causa raíz del contraste oscuro en todo `/saas/*`** · `docs/ops/W3CRM_MIGRATION_PLAN.md` (ADR-075 §13, supersede parcialmente ADR-074) · prod tip **`3f10c272`** · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/vitest core **PASS** · P1 UI/encoding/branding/tenant-id **FIXED** (audit previo) · Playwright/build **no** re-ejecutados aquí |
| **W3CRM** | Fase 1 auditoría **DONE** · Fase 2 módulo 1 **Dashboard ejecutivo DONE** · Fase 2 módulo 2 **CRM/Pipeline DONE** (tsc/lint/build/vitest PASS) — incluye fix de causa raíz: `SaasShellLayout` no activaba el scope `.dark`, dejando `NelvyonDsCard`/`Badge`/`Button`/`SectionHeader` con colores de tema claro sobre fondo oscuro en **todas** las páginas `/saas/*`, y `--color-destructive/success/warning` sin registrar en `@theme inline` (clases `text-destructive`/`bg-warning`/`text-success` sin efecto en ~150 archivos). Corregido en `globals.css` + `SaasShellLayout.tsx` (ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §13.1). Kanban de pipeline reactivado (`DealsKanban`/`DealFormModal`/`DealDetailPanel`, ya existían completos y probados pero sin usar) — sin instalar `@hello-pangea/dnd` |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) el fix de contraste oscuro de `/saas/*` — en local no se pudo tomar captura autenticada por falta de DB; el fix está verificado por compilación CSS real + mockup estático (ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §13.1).
2. Confirmar con el usuario el siguiente módulo a migrar: **IA NELVYON** (mejor alineación con `(aikit)` de W3CRM) o **Comunicación** (inbox/campañas, inspirado en `(email)`) — ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §13.
3. Repetir el patrón validado: reutilizar componentes reales ya existentes antes de crear nuevos, cero mock data, tsc/lint/build/vitest PASS antes de cerrar el módulo, commit separado.
4. `@fullcalendar/react@7.0.2` (React 19 ✅) sigue reservado para `citas`/`calendar` cuando se aborde ese módulo — no instalar antes de tiempo.
5. No prod deploy UI · no flip claimReady · canary KILL.

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
