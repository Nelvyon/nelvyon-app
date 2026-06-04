# Fase 2B — Clientes y proyectos OS (CRUD real)

## Tablas (solo dominio OS interno)

| Tabla | Uso en UI |
|-------|-----------|
| `nelvyon_clients` | `/os/clientes` — fuente oficial clientes NELVYON |
| `nelvyon_projects` | `/os/proyectos` — proyectos vinculados a `client_id` |
| `nelvyon_outputs` | Detalle proyecto — entregas |
| `nelvyon_campaigns` | Detalle proyecto — campañas internas |

**No usado:** `saas_contacts`, `crm_contacts`, `contacts` (SaaS CRM).

## Endpoints reutilizados (FastAPI existentes)

| Recurso | Base | Auth |
|---------|------|------|
| Clientes | `GET/POST /api/v1/entities/nelvyon_clients` | `require_workspace` / `require_workspace_operator` (write) |
| Cliente ID | `GET/PUT/DELETE .../nelvyon_clients/{id}` | Igual |
| Proyectos | `GET/POST /api/v1/entities/nelvyon_projects` | Igual + header deprecación legacy |
| Proyecto ID | `GET/PUT/DELETE .../nelvyon_projects/{id}` | Igual |
| Outputs | `GET .../nelvyon_outputs?query={"project_id":N}` | Igual |
| Campañas | `GET .../nelvyon_campaigns?query={"project_id":N}` | Igual |

Filtros vía query param `query` (JSON): `status`, `client_id`, `project_id` (igualdad exacta en `workspace_mixin`).

Frontend: `apps/web/src/features/os-shell/clients/api.ts`, `projects/api.ts`, helper `lib/entityQuery.ts`.

## Qué funciona (2B)

### Clientes `/os/clientes`

- Listado real + búsqueda local (nombre, sector, ciudad)
- Filtro sector + estado operativo derivado (con/sin proyectos)
- Detalle `/os/clientes/[id]`
- Crear `/os/clientes/nuevo`, editar, eliminar (rol `os` + `can()` matrix)
- Métricas en detalle: conteo proyectos, muestra outputs/campañas por proyecto
- **Notas:** campo `objectives` (no existe columna `notes` en modelo)
- **Estado:** derivado de proyectos vinculados (no columna `status` en DB)

### Proyectos `/os/proyectos`

- Listado + filtros API por `status` y `client_id`
- Búsqueda local
- Detalle con entregas y campañas relacionadas
- Crear (con `?client_id=` preseleccionado), editar, eliminar
- Vínculo obligatorio a cliente en formulario

### Permisos UI

- `member`: ver
- `operator`: crear/editar
- `admin`: eliminar

## Pendiente

| Item | Notas |
|------|-------|
| Columna `status` / `notes` en `nelvyon_clients` | Requiere migración SQL si se quieren persistir |
| Búsqueda server-side (ILIKE) | Hoy solo filtros exactos en API |
| CRUD outputs/campañas desde OS shell | Solo lectura en detalle proyecto |
| Paginación UI | Lista hasta 500 filas |
| Métricas cliente sin recorrer proyectos | Endpoint agregado opcional en fase 2C |
| Pipeline `/os/pipeline` | Sigue preparado (saas_deals / os_deals) |

## Riesgos

1. **Eliminar cliente** no borra en cascada proyectos — pueden quedar referencias `client_id`.
2. **Headers deprecación** en `nelvyon_projects` / `outputs` — dominio legacy marcado; datos siguen siendo los de OS interno.
3. **Conteo outputs/campañas** en detalle cliente: suma por primeros 20 proyectos (honesto pero incompleto si hay más).
4. **Roles:** escritura requiere `X-Workspace-Id` + rol operator en backend (`require_workspace_operator`).

## Validación

```bash
cd apps/web && pnpm typecheck
pnpm exec vitest run src/features/os-shell
NODE_OPTIONS=--max-old-space-size=8192 pnpm build
```

## Referencias

- Shell 2A: `PHASE_2A_OS_SHELL.md`
- Separación SaaS: `PHASE_1A_CRM_TRANSITION.md`
