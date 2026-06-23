# TECH_HANDOFF — NELVYON

Documento para que **la empresa sea autónoma**: desplegar, aceptar clientes y operar packs sin intervención de Cursor en el flujo con clientes. Cursor queda solo para **construcción de producto** (nuevas features, bugs, refactors).

---

## 1. Arquitectura en una página

```
Cliente final          Operador / agencia              Infra
─────────────          ──────────────────              ─────
/packs, /portal   →    /os/packs, /dashboard    →     Railway (web)
/signup, onboarding                         →     Supabase Postgres
                                              →     SES / OAuth (GA4, Meta…)
```

### Capas

| Capa | Tecnología | Responsabilidad |
|------|------------|-----------------|
| **UI SaaS** | Next.js App Router (`apps/web`) | Catálogo packs, dashboards, CRM, campañas, portal |
| **BFF** | Route handlers `apps/web/src/app/api/**` | Auth JWT, workspace scope, pack kickoff, portal |
| **Packs** | `apps/web/src/lib/packs/*` | Orquestación demo/producción, informes, entregables |
| **OS interno** | `apps/web/src/lib/os-core/*` | Catálogo agentes/plantillas/conectores (no visible al cliente) |
| **DB** | PostgreSQL (Supabase) vía `backend/db/DbClient` | Usuarios, workspaces, pack_runs, CRM, portal |
| **API Python** | `backend/` FastAPI | Rutas legacy; parte del tráfico va por proxy desde web |

### Autenticación

- Cookie `nelvyon_token` + header `Authorization: Bearer`
- Workspace: header `X-Workspace-Id` en rutas tenant-scoped
- Portal cliente: rutas `/api/platform/portal/*` (invitación + login separado)

### Rutas críticas

| Ruta | Uso |
|------|-----|
| `POST /api/auth/login` | Login operador |
| `GET /api/platform/workspaces/list` | Workspace activo |
| `POST /api/os/packs/{packId}/kickoff` | Lanzar growth pack |
| `POST /api/os/packs/analytics-insights/kickoff` | Lanzar Analytics Insights |
| `GET /api/platform/pack-report?pack_id=` | Último informe |
| `GET /api/os/core/catalog?view=summary` | Salud OS (demo interna) |
| `GET /api/integrations/ga4/status` | Estado conexión GA4 |

---

## 2. Despliegue (Railway + Supabase)

### Servicios

1. **Web (Next.js)** — servicio principal (`ideal-victory-staging` en staging)
2. **PostgreSQL** — Supabase (misma URL en web y, si aplica, API Python)
3. **Opcional:** API Python en `nelvyon-app-production` — ver `backend/README.md`

### Variables mínimas (web)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<min 32 chars>
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
FRONTEND_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_LEGAL_ENTITY_NAME=Tu Razón Social S.L.
GA4_DEMO_FALLBACK=1          # staging: pack Analytics sin OAuth
```

Secrets (no commitear): Stripe, SES, Google OAuth, Meta, `OAUTH_ENCRYPTION_KEY`.

### Pipeline recomendado

1. Push a rama `main` (repo privado GitHub)
2. Railway build `apps/web` (root: monorepo, ver `railway.toml` o config del servicio)
3. Migraciones DB si hay cambios en `backend/db/migrations`
4. `node scripts/staging-demo-preflight.mjs`
5. Demo con cliente o piloto

### Dominio producción

- Apuntar DNS a Railway
- `NEXT_PUBLIC_APP_URL` = URL canónica HTTPS
- Revisar cookies secure / SameSite en producción

---

## 3. Operación diaria (sin Cursor)

### Alta de cliente

1. Cliente en `/signup` (acepta `/legal/terms` y `/legal/privacy`)
2. Onboarding `/saas/onboarding` (4 pasos; paso 4 exige checkbox legal)
3. Dashboard `/saas/dashboard` o `/packs`

### Lanzar un pack (demo 1 clic)

1. `/packs` → elegir pack → kickoff
2. O directo `/os/packs/local-growth` (etc.)
3. Plantilla demo → esperar steps → informe en `/dashboard/<pack>`
4. Entregables en `/portal` + invitación cliente CRM

### Packs especializados (`?focus=`)

| Catálogo | Kickoff | Informe padre |
|----------|---------|---------------|
| SEO Local | `/os/packs/local-growth?focus=seo` | `/dashboard/local-growth` |
| Meta Ads | `/os/packs/ecommerce-growth?focus=meta` | `/dashboard/ecommerce-growth` |
| Email | `/os/packs/local-growth?focus=email` | `/dashboard/local-growth` |
| Landing+Funnel | `/os/packs/saas-b2b-growth?focus=landing` | `/dashboard/saas-b2b-growth` |

### Analytics Insights (GA4)

- Kickoff: `/os/packs/analytics-insights`
- **Demo:** botón «fixture GA4» (`demo_mode: true`)
- **Real:** OAuth `/api/oauth/google` → `POST /api/integrations/ga4/link-property` con `property_id` → lanzar sin demo

### Guiones de demo por audiencia

Definidos en `apps/web/src/lib/saas/demoGuide.ts`:

- `getDemoScript("local_business")`
- `getDemoScript("saas_b2b")`
- `getDemoScript("agency")`

---

## 4. Cómo añadir un pack nuevo

### A) Pack de crecimiento integral (como Local / Ecommerce / B2B)

1. **ID y tipos** — `apps/web/src/lib/packs/types.ts`  
   - Añadir `MY_PACK_ID`, intake type, step definitions

2. **Registro** — `apps/web/src/lib/packs/packRegistry.ts`  
   - Meta: nombre, rutas kickoff/report, sectores, SKUs

3. **Runner** — `apps/web/src/lib/packs/myPack.ts`  
   - `validate*Intake`, `runMyPack` usando `runGrowthPack` o patrón Analytics

4. **Kickoff API** — registrar en `apps/web/src/app/api/os/packs/[packId]/kickoff/route.ts`  
   - O ruta dedicada si no es `PackId` estándar

5. **Informe demo** — `apps/web/src/lib/packs/packDemoReportContent.ts`  
   - Secciones, bullets, recomendaciones

6. **Catálogo usuario** — `apps/web/src/lib/saas/servicePacksCatalog.ts`

7. **OS bridge** — `apps/web/src/lib/os-core/packOsBridge.ts` (agentes/conectores)

8. **UI** — páginas `apps/web/src/app/os/packs/<slug>/page.tsx` y `dashboard/<slug>/page.tsx`

9. **Smoke** — ampliar `scripts/staging-demo-preflight.mjs`

10. **Tests** — `apps/web/src/lib/packs/__tests__/`

### B) Pack especializado (mismo motor, foco distinto)

1. Entrada en `servicePacksCatalog.ts` con `kickoffPath: "/os/packs/parent?focus=xxx"`
2. Copy en `packFocusCopy.ts` + complemento en `packParentComplement` (packDemoReportContent)
3. `PackQuickLaunch` ya propaga `catalog_focus` desde URL

### C) Pack con conector real (patrón Analytics Insights)

1. Integración en `backend/integrations/` o `apps/web/src/lib/integrations/`
2. Runner con steps propios (`analyticsInsightsPack.ts`)
3. `data_provenance: "ga4" | "demo"` en `PackReport`
4. Status API + UI de conexión

---

## 5. Informes y entregables

- **PackReport** — JSON en `nelvyon_pack_runs.report`
- **Secciones demo** — generadas en kickoff (`sections`, `live_insight`, `parent_complement`)
- **Portal** — `portalDeliverablesStore.ts` + API `/api/platform/portal/*`
- **CEO metrics** — Local y SaaS B2B: rutas `/api/platform/packs/*/ceo-metrics`

---

## 6. Tests y calidad

```bash
cd apps/web
pnpm test                    # unit tests Vitest
pnpm gate                    # si configurado en CI

# Staging
node scripts/staging-demo-preflight.mjs
node scripts/run-staging-p0-smokes.mjs --skip-wait
```

---

## 7. Legal (producto, no asesoramiento jurídico)

Textos base en:

- `/legal/terms` — software propietario, datos del cliente, limitación responsabilidad, AUP
- `/legal/privacy` — RGPD, encargado tratamiento, derechos
- `/legal/acceptable-use`, `/legal/dpa`, etc.

Editable: `apps/web/src/lib/legal/legalMeta.ts` (`NEXT_PUBLIC_LEGAL_ENTITY_NAME`)

**Revisar con abogado antes de producción comercial** — ver `docs/BEFORE_LAUNCH_CHECKLIST.md`.

---

## 8. Qué NO hacer en flujo cliente

- No usar Cursor/agentes para login, demos en vivo ni soporte al cliente
- No commitear secretos ni datos de clientes reales
- No modificar producción sin preflight/smoke en staging previo

---

## 9. Contactos técnicos internos

| Área | Archivo / ruta |
|------|----------------|
| Packs | `apps/web/src/lib/packs/` |
| SaaS copy/catálogo | `apps/web/src/lib/saas/` |
| Staging smokes | `docs/STAGING_P0_SMOKES.md` |
| Fase 2 GA4 diseño | `docs/packs/PHASE2_GA4_INSIGHTS_PACK.md` |
| Backend legacy | `backend/README.md` |

---

*Última revisión handoff: junio 2026*
