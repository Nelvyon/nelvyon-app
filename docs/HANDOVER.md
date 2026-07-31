# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-31** — **W3CRM Fase 2: módulo 7 Marketing y redes sociales migrado** (consistencia visual — colores hardcodeados → tokens semánticos, sin hallazgo funcional de causa raíz) · `docs/ops/W3CRM_MIGRATION_PLAN.md` §18 · prod tip **`3f10c272`** (sin deploy de este módulo aún) · canary **KILL** · `claimReady: false`

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` |
| **Calidad** | tsc/lint/build **PASS** · `vitest backend/saas backend/email src/features/saas-crm` **195 archivos / 2467 passed / 4 skipped** · smoke sin sesión (307/401, sin 500) **PASS** · Playwright **no** re-ejecutado en esta sesión |
| **W3CRM** | Fase 1 auditoría **DONE** · módulo 1 **Dashboard DONE** · módulo 2 **CRM/Pipeline DONE** · módulo 3 **IA NELVYON DONE** · módulo 4 **Comunicación DONE** · módulo 5 **Automatizaciones/workflows DONE** · módulo 6 **Calendario/citas DONE** · módulo 7 **Marketing y redes sociales DONE**: `/saas/{social,publicidad,seo,reputacion}` usaban de forma sistemática colores Tailwind literales (`text-red-400`, `bg-red-500/10`, `#0084ff`, etc.) en vez de los tokens semánticos (`destructive/success/warning/primary`) ya establecidos en los módulos 1–6 — violación de "un solo sistema visual", sin defecto de renderizado (a diferencia del bug del módulo 2). Corregido sustituyendo cada literal por su token semántico y migrando KPIs a `KpiTile` en las 4 pantallas; colores por plataforma/marca (Instagram/Facebook/LinkedIn/TikTok) y por tipo de dato se mantienen intencionalmente (mismo patrón ya documentado para el calendario en §17.3). Ninguna de las 4 pantallas tenía capacidades de backend sin exponer (a diferencia de los módulos 4/5/6) — CRUD, OAuth y degraded states ya eran reales. Ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §18 |
| **DashForge** | Plan ADR-074 en **pausa** (no cancelado) — W3CRM pasa a ser la plantilla de referencia principal por instrucción del usuario |
| **Android** | APK 1.0.0 + emulator PASS · Play **BLOCKED_EXTERNAL** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Continuar automáticamente con el **módulo 8 (Funnels, formularios y landing pages)**, siguiendo el orden confirmado por el usuario en `docs/ops/W3CRM_MIGRATION_PLAN.md` §7 y §18 — no esperar nueva confirmación salvo decisión irreversible/coste/credenciales.
2. Validar visualmente en staging (con `DATABASE_URL` real y sesión autenticada) los módulos IA NELVYON, Comunicación, Automatizaciones/workflows, Calendario/citas y Marketing/redes sociales — mismo bloqueo `BLOCKED_ENVIRONMENT` que CRM/Pipeline en local; smoke sin sesión ya confirmó 307/401 sin 500 en todas las rutas de los cinco módulos.
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
