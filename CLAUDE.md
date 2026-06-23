# CLAUDE.md — Nelvyon

Agencia de marketing digital 100% operada por IA + SaaS B2B.  
Monorepo pnpm. Deploy target: **Railway** (Node 20 + Postgres 16).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend app (SaaS + OS) | Next.js 15.5 (App Router), React 19, TypeScript 5.9, Tailwind CSS v4 |
| Backend TS (servicios SaaS) | `backend/saas/*.ts` — clases de servicio puras, sin Express |
| Backend Python (FastAPI) | `backend/main.py` — agentes IA, packs, voice; puerto 8000 |
| Email | AWS SES via `backend/email/sesClient.ts` |
| DB | Postgres 16, migraciones en `backend/db/migrations/*.sql` |
| Auth SaaS | JWT propio en cookies httpOnly (`requireSaasContext`) |
| Auth Plataforma | `requirePlatformClaims` — tokens para OS/portal/operators |
| Billing | Stripe (webhook → `UPDATE saas_tenants SET plan`) |
| Package manager | pnpm 10.33 (`pnpm-workspace.yaml`) |

### Workspaces
```
apps/web/          ← Next.js 15 (producto principal)
backend/           ← Servicios TS + Python FastAPI
frontend/          ← Legacy (en desuso, no tocar)
```

---

## Arquitectura — tres capas

### 1. SaaS (`/saas/*`)
CRM, campañas, workflows, billing, pipeline, etc.  
- Layout: **`SaasShellLayout`** (`@/features/saas-shell/components/SaasShellLayout`) + `SaasSidebar activeId="xxx"`
- Diseño: dark glass `bg-[#020817]`, acento `#0084ff`
- Todas las rutas `/saas/*` tienen el layout aplicado (41 páginas migradas — junio 2026)
- `dynamic = "force-dynamic"` en todas las rutas API que leen de DB

### 2. OS — Operating System (`/os/*`, `/api/os/*`)
Motor de packs de marketing ejecutados por IA.  
- `runGrowthPack` en `apps/web/src/lib/packs/packOrchestrator.ts`
- SKUs autónomos: `NELVYON-LANDING`, `NELVYON-SEO`, `NELVYON-CHATBOT`
- PackIds: `local-business-growth`, `ecommerce-growth`, `saas-b2b-growth`
- Auto-aprobación si QA ≥ 85: `dbAutoApprovePackDeliverables`
- CEO dashboard: `PackReportDashboard` → `/api/platform/pack-report` → DB real

### 3. Agency Portal (`/portal/*`, `/api/platform/portal/*`)
Portal cliente para revisar/aprobar entregables. BFF Next.js (no FastAPI).

---

## Comandos útiles

```bash
# Desarrollo
pnpm -C apps/web dev

# TypeCheck (debe dar 0 errores)
pnpm -C apps/web exec tsc --noEmit

# Tests (0 fallos esperados)
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot

# Migraciones
pnpm -C apps/web migrate

# Smokes staging
node scripts/run-staging-p0-smokes.mjs --skip-wait

# Build producción
pnpm -C apps/web build
```

---

## Variables de entorno requeridas en producción

```
JWT_SECRET              # ≥32 chars — auth SaaS
TRACKING_SECRET         # HMAC open/click; fallback: JWT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL            # https://app.nelvyon.com
NEXT_PUBLIC_APP_URL     # igual, sin trailing slash — afecta tracking pixel
DATABASE_URL            # Railway Postgres
CRON_SECRET             # protege endpoint /api/cron/saas-workflows
SES_REGION              # eu-west-1
SES_ACCESS_KEY_ID
SES_SECRET_ACCESS_KEY
SES_FROM_EMAIL          # dirección verificada en SES
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_PRICE_ID
STRIPE_PRO_PRICE_ID
STRIPE_AGENCY_PRICE_ID
```

Sin `SES_FROM_EMAIL` + `SES_ACCESS_KEY_ID`, la UI muestra un banner de advertencia (no crash).

---

## Migraciones de base de datos

Archivos en `backend/db/migrations/`. Ejecutar en orden numérico.  
Última migración comiteada: `400_nelvyon_pack_runs.sql`  
Pendientes de commitear (untracked): `401_inbox_conversations.sql` … `416_surveys_qr_ab.sql`

**Regla:** no crear archivos 401+ sin una feature real que los requiera.

---

## Reglas de código (NO negociables)

- ❌ No UI sin API real detrás (prohibido mock silencioso en prod)
- ❌ No `coming_soon` → `available` sin kickoff route en `/api/os/packs/[packId]/kickoff/route.ts`
- ❌ No tocar rutas `pages/api/saas/*` — ya responden 410 (legacy, no modificar)
- ❌ No hubs GHL mock (`/saas/dashboard/leads`, `/saas/dashboard/linkedin`, etc.) — dejar intactos
- ❌ No hardcodear `TRACKING_SECRET` ni `JWT_SECRET`
- ❌ No borrar migraciones existentes
- ✅ Confirmar antes de cualquier acción destructiva o irreversible
- ✅ `dynamic = "force-dynamic"` en rutas API que leen estado de DB
- ✅ `SaasShellLayout` en toda página `/saas/*`

---

## Módulos completados (estado junio 2026)

| Módulo | Estado |
|---|---|
| SaaS CRM | ✅ producción-ready |
| Campañas email | ✅ con bounce handling, SES empty state |
| Workflows (scheduled + trigger) | ✅ idempotencia 4 min |
| Billing + Stripe webhook | ✅ plan badge real |
| Pipeline | ✅ |
| Inbox | ✅ |
| Packs OS (local, ecommerce, saas-b2b) | ✅ E2E auto-approve |
| Portal cliente BFF | ✅ |
| SaasShellLayout (41 páginas) | ✅ 0 errores TS |
| CEO metrics dashboard | ✅ datos reales |
| Legacy /crm → redirect /saas/crm | ✅ |

### Módulos coming_soon (sin kickoff — NO activar)
- Afiliados, dialer avanzado, LMS, loyalty, publicidad, social, web-builder

---

## Archivos clave

| Archivo | Qué hace |
|---|---|
| `apps/web/src/features/saas-shell/components/SaasShellLayout.tsx` | Layout dark glass de todas las páginas SaaS |
| `apps/web/src/components/saas/SaasSidebar.tsx` | Sidebar SaaS con `activeId: SaasNavId` |
| `backend/saas/SaasCampaniasService.ts` | Envío de campañas, bounce handling |
| `backend/saas/SaasWorkflowService.ts` | Motor de workflows con idempotencia |
| `backend/saas/SaasBillingService.ts` | Resumen billing desde `saas_tenants.plan` |
| `apps/web/src/lib/packs/packOrchestrator.ts` | `runGrowthPack` — motor de packs IA |
| `apps/web/src/lib/saas/servicePacksCatalog.ts` | Catálogo de service packs (SKUs documentados) |
| `apps/web/src/app/api/saas/campanias/route.ts` | GET incluye `ses_configured` |
| `apps/web/src/app/api/saas/workflows/route.ts` | GET incluye `ses_configured` |
| `apps/web/src/app/api/os/packs/[packId]/kickoff/route.ts` | Kickoff de los 3 packs autónomos |
| `backend/db/migrations/` | Migraciones SQL en orden numérico |
| `docs/LAUNCH_READY.md` | Checklist código ✅ + pasos Railway paso a paso |
| `docs/RAILWAY_DEPLOY_CHECKLIST.md` | Variables de entorno y configuración detallada |
| `docs/STAGING_P0_SMOKES.md` | Smokes P0 y criterios de cierre |
| `scripts/run-staging-p0-smokes.mjs` | Orquestador de smokes |

---

## Tests

```bash
# Suite principal (vitest) — debe dar 0 fallos
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
# Resultado esperado: 52 test files, 489 tests passed

# Python (FastAPI/packs)
cd backend && python -m pytest tests/ -q --tb=short
```

---

## Próximas tareas (post-deploy)

1. Commitear migraciones `401_inbox_conversations.sql` … `416_surveys_qr_ab.sql`
2. Confirmar SNS subscription en AWS tras primer deploy
3. Activar GitHub Actions cron (`staging-smoke-p0.yml`) para CI continuo
4. Verificar skin dark `/saas/dashboard` en browser prod (`#020817`)
5. Primer envío real de campaña → comprobar open pixel en SES logs
