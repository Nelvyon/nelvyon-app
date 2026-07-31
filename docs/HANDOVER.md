# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 6 Calendario/citas migrado + fix de causa raíz (citas sin ciclo de vida: solo creación, nunca confirmación/cierre/borrado)** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §17 (ADR-075) · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2467 passed / 4 skipped** · smoke sin sesión (307/401, sin 500, incluye PATCH/DELETE) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** · módulo 3 **IA NELVYON DONE** · módulo 4 **Comunicación DONE** · módulo 5 **Automatizaciones/workflows DONE** · módulo 6 **Calendario/citas DONE**: `/api/saas/citas` solo tenía `GET`/`POST` — el esquema `saas_appointments` ya modelaba 5 estados (`scheduled/confirmed/completed/cancelled/no_show`) pero ninguna cita podía transicionar nunca de `scheduled`, dejando el KPI "Completadas" matemáticamente fijo en `0` y sin forma de borrar una cita creada por error. Corregido con `PATCH`/`DELETE /api/saas/citas/[id]` (mismo permiso `workflows.write` ya usado por el módulo) + botones de acción en la UI. `/saas/calendar` recibe fixes de estados: loading sin skeleton, vista lista sin empty state, errores de red ignorados en silencio. `@fullcalendar/react` evaluado y descartado (grid CSS propio ya cubre el caso de uso sin dependencia adicional). Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §17 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 7 (Marketing y redes sociales)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §17 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos IA NELVYON, Comunicación, Automatizaciones/workflows y Calendario/citas — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en todas las rutas de los cuatro módulos.
3. Repetir el patrón validado por módulo: auditar antes de tocar código (no tocar lo que ya cumple el estándar visual), reutilizar componentes/APIs reales ya existentes, cero mock data, corregir causas raíz de bugs funcionales encontrados en la auditoría (no solo estética — ver el patrón repetido de "capacidad real modelada pero nunca expuesta" en los módulos 4, 5 y 6), tsc/lint/build/vitest PASS antes de cerrar, commit separado, documentar.
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
