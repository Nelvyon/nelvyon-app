# OS-1-UI-04 — Proyectos UI canónica

Migra el shell `/os/proyectos` a `/api/v1/os/projects` (`os_projects`, UUID).

## Feature flag

| Variable | Default | Efecto |
|----------|---------|--------|
| `NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI` | `true` (unset) | UI canónica |
| `false` / `0` | — | Fallback UI legacy `nelvyon_projects` |

Otros módulos OS (pipeline, tareas, documentos) siguen en `legacyApi.ts` hasta OS-1-UI-05.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/os/proyectos` | Lista paginada + filtros |
| `/os/proyectos/nuevo` | Crear |
| `/os/proyectos/{uuid}` | Detalle, editar, archivar |

## API

| Acción | Método |
|--------|--------|
| Lista | `GET /?page&page_size&q&status&priority&client_id` |
| Detalle | `GET /{id}` |
| Crear | `POST /` |
| Editar | `PATCH /{id}` |
| Archivar | `DELETE /{id}` (soft → `status=archived`) |

## Archivos

| Archivo | Rol |
|---------|-----|
| `projects/api.ts` | `osProjectsCanonicalApi` |
| `projects/legacyApi.ts` | `osProjectsLegacyApi` (pipeline, tareas, documentos) |
| `projects/featureFlag.ts` | Toggle UI |
| `projects/OsProjectsListCanonicalView.tsx` | Lista |
| `projects/OsProjectDetailCanonicalView.tsx` | Detalle |
| `projects/OsProjectCreateCanonicalView.tsx` | Alta |
| `projects/OsProjectCanonicalForm.tsx` | Formulario canónico |
| `projects/projectEnrichment.ts` | Tareas + entregables vinculados |
| `projects/*LegacyView.tsx` | Fallback |

## Validación

```bash
cd apps/web
pnpm test -- src/features/os-shell/projects
pnpm typecheck
pnpm build
```

## Transición

1. Ejecutar backfill `os:projects-backfill` en staging/prod.
2. Mantener flag `true` en entornos con backfill.
3. Si falla backfill, `NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI=false` temporalmente.
4. Tras OS-1-UI-05, migrar pickers de tareas a UUID canónico.

## Compatibilidad legacy

- Pipeline, tareas y documentos importan `osProjectsApi` desde `legacyApi.ts` (re-export en `api.ts`).
- Detalle canónico enlaza a pipeline/tareas solo si `metadata.legacy_nelvyon_project_id` existe post-backfill.
- Selector de cliente en alta/edición usa `os_clients` (UUID).
