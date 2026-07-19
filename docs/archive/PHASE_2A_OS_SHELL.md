# Fase 2A — Shell oficial NELVYON OS (Next.js)

## Objetivo

Base visual y estructural del **OS interno** en `apps/web`, sin CRUD nuevo, sin tocar web pública, marketing, Productized Agency ni CRM SaaS (`saas_*`).

## Rutas oficiales (Next App Router)

| Ruta | Estado | Fuente de datos |
|------|--------|-----------------|
| `/os/dashboard` | Dashboard real | `nelvyon_*`, automation, QA, billing (si permiso) |
| `/os/clientes` | Vista previa lectura | `GET /api/v1/entities/nelvyon_clients` |
| `/os/proyectos` | Vista previa lectura | `GET /api/v1/entities/nelvyon_projects` |
| `/os/pipeline` | Preparado | Sin `os_deals` / `saas_deals` aún |
| `/os/tareas` | Preparado | Sin `os_tasks` |
| `/os/documentos` | Preparado | Outputs vía dashboard / QA |
| `/os/finanzas` | Parcial real | `/api/v1/billing/*` si rol billing |
| `/os/ia` | Preparado + enlaces | `/os/agents`, `/os/execution` |
| `/os/configuracion` | Preparado + enlaces | workspaces, settings legacy |

**Ruta legacy conservada:** `/os` — hub automatización (jobs, webhooks). Enlace al dashboard nuevo.

Implementación: `apps/web/src/features/os-shell/` + `apps/web/src/app/os/(platform)/`.

## Layout OS

- Sidebar + header + breadcrumbs + selector de workspace
- Tema oscuro NELVYON (`#020817`, `#07122a`, acento `#0084FF`)
- Clase raíz: `nelvyon-os-shell` (sin naranja, distinto del marketing)
- No usa `AppShell` del producto SaaS/dashboard genérico

## Separación OS vs SaaS

| Dominio | OS (interno NELVYON) | SaaS (producto cliente) |
|---------|----------------------|-------------------------|
| Personas / CRM | `nelvyon_clients` | `saas_contacts` |
| Proyectos | `nelvyon_projects` | Workflows/campañas tenant |
| Entregas IA | `nelvyon_outputs` | Contenido generado en tenant (otras tablas) |
| Deals | Legacy / futuro `os_deals` | Futuro `saas_deals` (no mezclar) |
| UI | `/os/*` shell | `/saas/*`, `/saas/crm` |
| Auth | Mismo JWT + `X-Workspace-Id`; módulo `os` en `ProtectedLayout` | `/api/saas/*`, bridge `saas_tenants` |

**Regla:** no usar `saas_contacts` para clientes internos; no usar `nelvyon_clients` para el CRM del cliente final.

## Legacy Vite OS

- **Interino / legacy:** `frontend/` — `DashboardLayout`, rutas `/dashboard`, `/clients`, `/projects`, etc.
- **No eliminar** en 2A; no romper proxy `/api` ni super-admin flows.
- Migración gradual: paridad de KPIs con `/os/dashboard`, luego deprecar Vite OS.

## Qué no se hizo (2A)

- CRUD completo en módulos OS
- `saas_deals`, `os_tasks`, pipeline unificado
- Rediseño de `/os/agents` ni previews premium
- Cambios en web pública `(marketing)/*`

## Validación

```bash
cd apps/web && pnpm typecheck && pnpm build
pnpm exec vitest run src/features/os-shell/__tests__/osShellNav.test.ts
```

## Fase 2B (completada)

CRUD clientes y proyectos: ver `PHASE_2B_OS_CLIENTS_PROJECTS.md`.

## Siguiente fase (2C sugerida)

1. Listado `nelvyon_outputs` en documentos
3. Redirect opcional Vite → Next para super-admin
4. `os_tasks` + pipeline cuando exista esquema
