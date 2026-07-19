# Fase 3C — RBAC y Billing básico SaaS

## Auditoría RBAC (estado inicial)

| Ruta / API | Rol requerido (objetivo) | Estado anterior | Riesgo |
|------------|--------------------------|-----------------|--------|
| `POST /api/saas/crm/contacts` | member+ write | Solo JWT + tenant | Alto — sin rol ni cuota |
| `DELETE /api/saas/crm/contacts/[id]` | admin/owner | Solo JWT | Alto |
| `POST/PATCH /api/saas/deals*` | member+ write | Solo JWT | Alto |
| `DELETE /api/saas/deals/[id]` | admin/owner | Solo JWT | Alto |
| `POST /api/saas/campanias` | admin/owner | Solo JWT | Alto |
| `POST /api/saas/workflows` | admin/owner | Solo JWT | Alto |
| `GET /api/saas/billing` | owner/admin | No existía | Medio |
| `/dashboard/settings` (legacy) | workspace RBAC | Fuera de SaaS nav | Medio — confusión UX |
| Pages Router `/pages/api/saas/*` (~80) | — | JWT sin tenant RBAC | Alto — fuera de alcance 3C |
| `/saas/*` UI | — | Cookie middleware only | Medio |

## Roles SaaS (implementados)

| Rol | Origen | Permisos clave |
|-----|--------|----------------|
| **owner** | `saas_tenants.user_id` | CRUD completo, billing, workflows/campañas |
| **admin** | `workspace_members.role = admin` | Igual que owner |
| **member** | `workspace_members` operator/member | Crear/editar contactos y deals; lectura campañas/workflows; sin delete ni billing |
| **viewer** | `workspace_members.viewer` | Solo lectura |

Definición: `backend/saas/saasRbac.ts`

Resolución tenant+rol: `backend/saas/saasRequestContext.ts` → `requireSaasContext(req, action)`

## Permisos por acción

| Acción | owner | admin | member | viewer |
|--------|:-----:|:-----:|:------:|:------:|
| contacts.read | ✓ | ✓ | ✓ | ✓ |
| contacts.write | ✓ | ✓ | ✓ | |
| contacts.delete | ✓ | ✓ | | |
| deals.read | ✓ | ✓ | ✓ | ✓ |
| deals.write | ✓ | ✓ | ✓ | |
| deals.delete | ✓ | ✓ | | |
| campanias.read | ✓ | ✓ | ✓ | ✓ |
| campanias.write/delete/launch | ✓ | ✓ | | |
| workflows.read | ✓ | ✓ | ✓ | ✓ |
| workflows.write/delete/execute | ✓ | ✓ | | |
| billing.read | ✓ | ✓ | | |
| settings.read | ✓ | ✓ | ✓ | ✓ |

## Límites de plan (enforcement en creación)

Alineado con `backend/core/pricing_plans.py` + extensión deals.

| Recurso | starter | pro | enterprise |
|---------|---------|-----|------------|
| contacts | 2 500 | 25 000 | ∞ |
| deals | 500 | 5 000 | ∞ |
| campañas | 10 | 200 | ∞ |
| workflows | 10 | 100 | ∞ |
| users | 3 | 20 | ∞ |

Helper: `backend/saas/saasPlanLimits.ts`  
Enforcement: `assertSaasPlanCanCreate()` en create contact/deal/campaña/workflow.

Error API: `403` + `code: PLAN_LIMIT`

## Rutas protegidas (App Router `/api/saas/*` core)

Actualizadas con `requireSaasContext`:

- CRM contacts + activities + pipeline (GET/POST/PATCH/DELETE)
- Deals (GET/POST/PATCH/DELETE/stage/metrics)
- Campañas (GET/POST/PATCH/DELETE + launch/pause/stats/recipients)
- Workflows (GET/POST/PATCH/DELETE + activate/pause/execute/runs)
- Dashboard + activity
- **Nuevo** `GET /api/saas/billing`
- **Nuevo** `GET /api/saas/settings`

Sin RBAC SaaS (fuera de alcance o flujo especial): onboarding, deals/etl, reports, Pages Router legacy.

## Rutas SaaS UI

| Ruta | Descripción |
|------|-------------|
| `/saas/billing` | Plan, uso vs límites (datos reales) |
| `/saas/settings` | Tenant, rol, permisos efectivos |

Nav actualizado: Facturación → `/saas/billing`, Configuración → `/saas/settings` (sin legacy en menú).

Portal Stripe/suscripción sigue en `/dashboard/settings` (enlace honesto desde billing).

## Qué queda pendiente

1. RBAC en reports + onboarding (flujos pre-tenant / export)  
2. Multi-usuario tenant nativo (`saas_tenant_members`) — hoy bridge vía `workspace_members`  
3. Enforcement cuotas en Pages Router legacy  
4. UI: ocultar botones delete para member/viewer (hoy API devuelve 403)  
5. Stripe checkout embebido en `/saas/billing`  
6. RBAC tests E2E por rol simulado (member/viewer → 403 en delete/billing)  
7. Sincronizar `nelvyon_users.plan` ↔ `saas_tenants.plan` en upgrades

## Validación

```powershell
cd apps/web
pnpm exec vitest run backend/saas/__tests__/saasRbac.test.ts backend/saas/__tests__/saasPlanLimits.test.ts backend/saas/__tests__/saasCrm.test.ts backend/saas/__tests__/saasDeals.test.ts backend/saas/__tests__/saasCampanias.test.ts backend/saas/__tests__/saasWorkflows.test.ts backend/saas/__tests__/saasDashboard.test.ts src/features/saas-shell
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```

## Archivos clave

- `backend/saas/saasRbac.ts`
- `backend/saas/saasPlanLimits.ts`
- `backend/saas/SaasPlanQuotaService.ts`
- `backend/saas/saasRequestContext.ts`
- `backend/saas/SaasBillingService.ts`
- `apps/web/src/app/api/saas/billing/route.ts`
- `apps/web/src/app/api/saas/settings/route.ts`
- `apps/web/src/app/saas/billing/page.tsx`
- `apps/web/src/app/saas/settings/page.tsx`
