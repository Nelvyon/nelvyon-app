# Fase 3B — Limpieza legacy y navegación SaaS

## Objetivo

Reducir ruido, mocks y rutas legacy visibles en el producto SaaS (`/saas/*`) antes de RBAC/Billing. **No se eliminó código**; solo se ocultó del menú y se unificó la navegación.

## Qué se ocultó del menú SaaS

| Elemento | Motivo | Ruta / código |
|----------|--------|----------------|
| **Servicios** | Apuntaba a OS (`/os/execution`), fuera del producto SaaS tenant | Quick action eliminada en dashboard |
| **Módulos F62** | 19 páginas bajo `/saas/dashboard/*` (leads, dialer, ads, etc.) sin menú; muchas con modo mock | Código intacto, URL directa |
| **CRM legacy workspace** | Duplicado del CRM oficial tenant | `/dashboard/crm`, `/crm/deals`, `/crm/clients` |
| **Pipelines Vite** | SPA separada (`frontend/src`), no enlazada desde Next.js SaaS | `/saas/pipelines` (Vite only) |
| **Billing/Settings Vite** | No existen en apps/web | `/saas/billing`, `/saas/settings` (Vite only) |

Definición central: `apps/web/src/features/saas-shell/saasNav.ts` → `SAAS_HIDDEN_ROUTES`.

## Qué sigue activo (menú unificado)

Sidebar compartido: `SaasSidebar` en:

- `/saas/dashboard`
- `/saas/crm` (+ pestaña Pipeline → `activeId: pipeline`)
- `/saas/campanias`
- `/saas/workflows`

| Ítem menú | Ruta | API |
|-----------|------|-----|
| Dashboard | `/saas/dashboard` | `/api/saas/dashboard`, pipeline comercial |
| CRM | `/saas/crm` | `/api/saas/crm/contacts*` |
| Pipeline | `/saas/crm?tab=pipeline` | `/api/saas/deals*` |
| Campañas | `/saas/campanias` | `/api/saas/campanias*` |
| Workflows | `/saas/workflows` | `/api/saas/workflows*` |
| Configuración | `/dashboard/settings` | Settings workspace (facturación, API keys, equipo) |

Onboarding sigue en `/saas/onboarding` (gate antes del dashboard).

## Qué queda legacy (código presente, no promocionado)

| Superficie | Rutas | Notas |
|------------|-------|-------|
| Workspace AppShell | `/dashboard/crm`, `/crm/*`, `/billing`, `/dashboard/*` | Nav en `navConfig.ts`; producto workspace distinto del SaaS tenant |
| Dashboard home mock | `/dashboard` KPIs con `—` | No enlazado desde menú SaaS |
| F62 modules | `/saas/dashboard/leads`, `.../social`, etc. | OAuth callbacks → integrations; acceso URL |
| Marketing mocks | `components/agenforce/module-screens` | Solo landing/demo |
| Vite SaaS SPA | `frontend/src/components/SaasLayout.tsx` | Nav completo legacy; no es el producto Next.js |

## Empty states

Componente: `SaasEmptyState` (`features/saas-shell/components/SaasEmptyState.tsx`).

Texto estándar:

- **Título:** «Sin datos todavía»
- **Descripción:** «Conecta datos o crea el primer registro.»

Aplicado en: dashboard (actividad/jobs), CRM (contactos, actividades), workflows, campañas, pipeline comercial.

## Qué se puede recuperar después

1. **Servicios / OS** — Reañadir enlace cuando exista integración tenant-scoped (no `/os/execution` genérico).
2. **Módulos F62** — Exponer en menú progresivo cuando salgan de mock y tengan RBAC.
3. **`/saas/settings` y `/saas/billing`** — Crear rutas Next.js propias y dejar de salir a `/dashboard/settings`.
4. **Unificar workspace y SaaS** — Migrar usuarios de `/dashboard/crm` a `/saas/crm` y deprecar legacy en `navConfig`.
5. **Layout `/saas/layout.tsx`** — Envolver todas las páginas con `SaasSidebar` (hoy solo 4 páginas core).

## Validación

```powershell
cd apps/web
pnpm exec vitest run src/features/saas-shell src/features/saas-deals
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```

## Archivos tocados (S7 cleanup)

- `features/saas-shell/saasNav.ts` — nav visible + registro hidden
- `features/saas-shell/components/SaasSidebar.tsx` — sidebar con links reales
- `features/saas-shell/components/SaasEmptyState.tsx` — empty states
- `app/saas/dashboard/page.tsx` — sidebar + quick actions + empty states
- `app/saas/crm/page.tsx`
- `app/saas/workflows/page.tsx`
- `app/saas/campanias/page.tsx`
- `features/saas-deals/components/CommercialPipelineSection.tsx`
