# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 9 Facturación/pagos/suscripciones migrado** (3 hallazgos funcionales de causa raíz corregidos + consistencia visual) · `docs/ops/W3CRM_MIGRATION_PLAN.md` §20 · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2467 passed / 4 skipped** · smoke sin sesión (307/401, sin 500) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** · módulo 3 **IA NELVYON DONE** · módulo 4 **Comunicación DONE** · módulo 5 **Automatizaciones/workflows DONE** · módulo 6 **Calendario/citas DONE** · módulo 7 **Marketing y redes sociales DONE** · módulo 8 **Funnels/formularios/landing pages DONE** · módulo 9 **Facturación/pagos/suscripciones DONE**: `GET /api/saas/invoices` (facturas de plataforma NELVYON→tenant, `SaasInvoiceService`) existía y no se consumía en ningún sitio — se añadió sección "Historial de facturas" en `/saas/billing`. `POST /api/saas/billing/cancel` ya escribía `saas_tenants.billing_status` (pausa/cancelación) pero `buildSaasBillingSummary` nunca lo leía y no había ningún botón en la UI — se propagó `billingStatus` por toda la cadena de proyección de tenant (`saasTenantMapper`, `SaasOnboardingService`, `SaasBillingService`, `SaasTenantBridgeService`, `SaasDashboardService`) y se añadieron botones "Pausar"/"Cancelar"/"Reactivar" con confirmación inline. Se añadió acción `resume` al endpoint de cancelación (antes no había vuelta atrás sin tocar la DB a mano). El botón "↓ PDF" de `/saas/facturas` no tenía `onClick` pese a que `GET /api/saas/facturas/[id]/pdf` ya generaba el HTML imprimible — conectado. `/saas/billing` migrada íntegramente de `DarkCard`/hex a `NelvyonDs*`/tokens semánticos; `/saas/facturas` con literales de color puntuales migrados. Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §20 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 10 (Analítica, informes y exportaciones)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §20 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos IA NELVYON, Comunicación, Automatizaciones/workflows, Calendario/citas, Marketing/redes sociales, Funnels/formularios/landing pages y Facturación/pagos/suscripciones — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en todas las rutas de los siete módulos.
3. Repetir el patrón validado por módulo: auditar antes de tocar código (no tocar lo que ya cumple el estándar visual), reutilizar componentes/APIs reales ya existentes, cero mock data, corregir causas raíz de bugs funcionales encontrados en la auditoría (no solo estética), tsc/lint/build/vitest PASS antes de cerrar, commit separado, documentar.
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
