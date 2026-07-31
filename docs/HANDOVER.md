# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 5 Automatizaciones/workflows migrado + fix de causa raíz grave en el editor visual (siempre publicaba la misma demo fija)** · `docs/ops/W3CRM_MIGRATION_PLAN.md` §16 (ADR-075) · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2467 passed / 4 skipped** · smoke sin sesión (307/401, sin 500) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** · módulo 3 **IA NELVYON DONE** · módulo 4 **Comunicación DONE** (3 fixes de causa raíz: open rate, SMS log, deliverability) · módulo 5 **Automatizaciones/workflows DONE**: `/saas/workflows` (builder clásico, ya real y extenso) recibe fixes de consistencia visual (`KpiTile`, tokens `warning/success/destructive`, `NelvyonDsStatusDot`); `/saas/workflows/editor` (editor visual `@xyflow/react`) tenía un **defecto funcional grave**: nunca leía `GET /api/saas/workflows/visual` (ya implementado) por lo que siempre arrancaba con 2 nodos hardcodeados y no permitía añadir nodos nuevos ni borrar flujos guardados — solo podía publicar siempre la misma combinación fija `contact_created → send_email`. Corregido exponiendo capacidad de backend ya real y probada (`GET`/`DELETE /api/saas/workflows/visual/[id]` + panel "Mis flujos" + paleta de nodos, con acciones limitadas a los 4 tipos que `publishAsSaasWorkflow` soporta de verdad). Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §16 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 6 (Calendario y citas)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §16 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos IA NELVYON, Comunicación y Automatizaciones/workflows — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en todas las rutas de los tres módulos.
3. Repetir el patrón validado por módulo: auditar antes de tocar código (no tocar lo que ya cumple el estándar visual), reutilizar componentes/APIs reales ya existentes, cero mock data, corregir causas raíz de bugs funcionales encontrados en la auditoría (no solo estética — ver el patrón repetido de "capacidad de backend real nunca expuesta en el frontend" en los módulos 4 y 5), tsc/lint/build/vitest PASS antes de cerrar, commit separado, documentar.
4. `@fullcalendar/react@7.0.2` (React 19 ✅) sigue reservado para el módulo `citas`/`calendar` — evaluar su uso real al auditar ese módulo (siguiente paso).
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
