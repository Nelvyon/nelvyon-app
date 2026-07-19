# OS-1-UI-05 — Tareas UI canónica

Migra el shell `/os/tareas` a `/api/v1/os/tasks` (`os_tasks`, UUID).

## Feature flag

| Variable | Default | Efecto |
|----------|---------|--------|
| `NEXT_PUBLIC_OS_TASKS_CANONICAL_UI` | `true` (unset) | UI canónica |
| `false` / `0` | — | Fallback UI legacy `entities/os_tasks` |

`OsRelatedOpsSection` sigue en `legacyApi.ts` hasta migración del detalle cliente legacy.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/os/tareas` | Lista paginada + filtros |
| `/os/tareas/nuevo` | Crear |
| `/os/tareas/{uuid}` | Detalle, editar, archivar |

## API

| Acción | Método |
|--------|--------|
| Lista | `GET /?page&page_size&q&status&priority&project_id&client_id&assignee` |
| Detalle | `GET /{id}` |
| Crear | `POST /` |
| Editar | `PATCH /{id}` |
| Archivar | `DELETE /{id}` (soft → `status=archived`) |

## Archivos

| Archivo | Rol |
|---------|-----|
| `tareas/api.ts` | `osTasksCanonicalApi` |
| `tareas/legacyApi.ts` | `osTasksLegacyApi` (OsRelatedOpsSection) |
| `tareas/featureFlag.ts` | Toggle UI |
| `tareas/OsTasksListCanonicalView.tsx` | Lista |
| `tareas/OsTaskDetailCanonicalView.tsx` | Detalle |
| `tareas/OsTaskCreateCanonicalView.tsx` | Alta |
| `tareas/OsTaskCanonicalForm.tsx` | Formulario canónico |
| `tareas/*LegacyView.tsx` | Fallback |

## Validación

```bash
cd apps/web
pnpm test -- src/features/os-shell/tareas
pnpm typecheck
pnpm build
```

## Núcleo operativo OS

Con OS-1-UI-01 (Clientes), OS-1-UI-04 (Proyectos) y OS-1-UI-05 (Tareas), el shell operativo usa APIs canónicas UUID por defecto.
