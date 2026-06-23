# CURSOR NELVYON — Master Execution Plan

> Estado actualizado: 2026-06-24  
> Este documento refleja el estado REAL del código — no aspiracional.

---

## Visión

Agencia de marketing digital 100% operada por IA + SaaS B2B.  
Sin personal humano. Packs autónomos → agentes → QA → auto-approve → portal cliente → email SES.

---

## Sección 1 — Arquitectura

| Capa | Descripción | Estado |
|---|---|---|
| SaaS `/saas/*` | 7 módulos (CRM, campañas, workflows, billing, pipeline, inbox, dashboard) | ✅ producción-ready |
| OS `/os/*` | Motor de packs de marketing (local, ecommerce, saas-b2b) | ✅ producción-ready |
| Agency Portal `/portal/*` | Portal cliente para aprobar entregables | ✅ producción-ready |
| FastAPI Backend | Agentes IA Python (port 8000) | ✅ integrado |

---

## Sección 2 — SKUs y Packs

| Pack ID | SKUs que usa | Kickoff route | Estado |
|---|---|---|---|
| `local-business-growth` | NELVYON-LANDING + NELVYON-SEO + NELVYON-CHATBOT | ✅ `/api/os/packs/local-business-growth/kickoff` | ✅ funcional |
| `ecommerce-growth` | NELVYON-LANDING + NELVYON-SEO + NELVYON-CHATBOT | ✅ `/api/os/packs/ecommerce-growth/kickoff` | ✅ funcional |
| `saas-b2b-growth` | NELVYON-LANDING + NELVYON-SEO + NELVYON-CHATBOT | ✅ `/api/os/packs/saas-b2b-growth/kickoff` | ✅ funcional |
| `analytics-insights` | — | ❌ no existe | 🚫 coming_soon — NO activar |

---

## Sección 3 — Flujo completo (agencia)

```
1. Operador lanza kickoff → POST /api/os/packs/[packId]/kickoff
2. packOrchestrator.ts → runGrowthPack → 3 agentes IA (LANDING/SEO/CHATBOT)
3. QA score ≥ 85 → dbAutoApprovePackDeliverables (sin operador humano)
4. Portal invite → cliente recibe email → login → /portal/deliverables
5. Cliente aprueba entregables → estado final
```

Auto-approve implementado: `backend/os-core/packOrchestrator.ts` → `dbAutoApprovePackDeliverables`.

---

## Sección 4 — Checklist de código (actualizado 2026-06-24)

### SaaS

| Feature | Estado | Evidencia |
|---|---|---|
| `/saas/dashboard` KPIs reales desde DB | ✅ | `fetch("/api/saas/dashboard")` → `StatCard` |
| CRM contactos, pipeline, deals | ✅ | `SaasCrmService.ts` + API routes |
| Campañas email con bounce handling | ✅ | `SaasCampaniasService.ts` — contacto sin email → `status=bounced` |
| Unsubscribe link en HTML email | ✅ | `SaasCampaniasService.ts` línea 480 — link &ldquo;Darse de baja&rdquo; |
| SES empty state honesto | ✅ | Banner amber en `/saas/campanias` y `/saas/workflows` |
| Workflows con idempotencia 4 min | ✅ | `SaasWorkflowService.ts` — `msSinceLast < 4 * 60 * 1000` |
| Billing badge lee plan real | ✅ | `dynamic="force-dynamic"` + Stripe webhook UPDATE |
| `/crm` legacy → redirect `/saas/crm` | ✅ | `apps/web/src/app/crm/page.tsx` |
| SaasShellLayout en 41 páginas /saas/* | ✅ | `scripts/migrate-saas-shell.mjs` + fix-up |
| Triggers de workflow en UI = backend | ✅ | UI muestra: contact_created/updated, stage_changed, deal_stage_changed, job_completed, manual, scheduled |

### Agency / OS

| Feature | Estado | Evidencia |
|---|---|---|
| packOrchestrator E2E sin operador | ✅ | `runGrowthPack` + `dbAutoApprovePackDeliverables` (QA≥85) |
| Portal cliente BFF (no FastAPI) | ✅ | `/api/platform/portal/*` routes |
| CEO metrics dashboard reales | ✅ | `fetchLocalPackCeoMetrics` → DB |
| E2E smokes local-growth | ✅ | `staging-smoke-local-pack-e2e.mjs` |
| E2E smokes ecommerce-growth | ✅ | `staging-smoke-ecommerce-pack-e2e.mjs` |
| E2E smokes saas-b2b-growth | ✅ | `staging-smoke-saas-b2b-pack-e2e.mjs` |

### Gate

| Check | Resultado | Fecha |
|---|---|---|
| `pnpm typecheck` | ✅ 0 errores | 2026-06-24 |
| `pnpm lint` | ✅ 0 errores (205 warnings) | 2026-06-24 |
| `pnpm test` (vitest) | ✅ 483 files, 3373 passed, 2 skipped | 2026-06-24 |

---

## Sección 5 — Variables de entorno producción

Ver `docs/RAILWAY_DEPLOY_CHECKLIST.md` para la lista completa.  
Nombres exactos que usa el código:

```
STRIPE_PRICE_ID_STARTER    # NO: STRIPE_STARTER_PRICE_ID
STRIPE_PRICE_ID_PRO        # planConfig.ts → STRIPE_PRICE_ENV_BY_PLAN
STRIPE_PRICE_ID_AGENCY
STRIPE_PRICE_ID_AGENCY_PARTNER
SES_ACCESS_KEY_ID          # NO: AWS_ACCESS_KEY_ID
SES_SECRET_ACCESS_KEY
SES_FROM_EMAIL
SES_REGION
```

---

## Sección 6 — Lo que NO está hecho (honesto)

| Área | Estado |
|---|---|
| `analytics-insights` pack | ❌ no tiene kickoff — `coming_soon` |
| Módulos coming_soon (afiliados, LMS, loyalty, etc.) | ❌ UI existe, backend no |
| Portal cliente dark glass | ❌ usa `AppShell` light theme — cliente ve tema claro |
| Signup/onboarding dark glass unificado | ⚠️ funcional pero no dark glass |
| White label completo | ⚠️ partial — config guardada, render no completo |
| Test E2E Playwright en CI | ⚠️ configurado pero no en CI automático |

---

## Sección 7 — Deploy manual (usuario)

Ver `docs/LAUNCH_READY.md` para pasos detallados step-by-step:
1. Push origin main
2. Crear proyecto Railway + vincular repo
3. Añadir variables de entorno (ver sección 5 arriba)
4. Ejecutar migraciones (`backend/db/migrations/001` → `400`)
5. Configurar cron job (cada 5 min → `/api/cron/saas-workflows`)
6. Configurar AWS SNS → SES webhook
7. Configurar Stripe webhook + price IDs
8. Verificar health check `/api/health`
9. Smoke manual: typecheck + vitest + `node scripts/run-staging-p0-smokes.mjs`
