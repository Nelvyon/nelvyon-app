# OS-1-UI-02 — Entregables UI interna OS

Conecta el shell operativo (`/os/entregables`) con `/api/v1/os/deliverables`.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/os/entregables` | Lista + filtros (estado, cliente, proyecto) |
| `/os/entregables/nuevo` | Crear entregable |
| `/os/entregables/{id}` | Detalle, edición (draft), workflow, versiones, revisiones portal |

## API

Base: `/api/v1/os/deliverables` · `tenantScoped: true` · `X-Workspace-Id`

| Acción UI | Método API |
|-----------|------------|
| Lista | `GET /` |
| Detalle | `GET /{id}` |
| Crear | `POST /` |
| Editar | `PATCH /{id}` |
| Enviar a revisión | `POST /{id}/submit-review` |
| Entregar | `POST /{id}/deliver` |
| Aprobar interno | `POST /{id}/approve` |
| Publicar | `POST /{id}/publish` |
| Rechazar | `POST /{id}/reject` |
| Crear revisión | `POST /{id}/create-revision` |
| Historial versiones | `GET /{id}/versions` |
| Revisiones portal | `GET /{id}/client-reviews` |

Pickers cliente/proyecto: `/api/v1/os/clients`, `/api/v1/os/projects` con bridge legacy (`legacy_nelvyon_client_id`, `metadata.legacy_nelvyon_project_id`).

## Workflow (estados visuales)

| Status | Badge | Acciones disponibles |
|--------|-------|---------------------|
| `draft` | Borrador | submit-review |
| `in_review` | En revisión | deliver, reject |
| `delivered` | Entregado | approve, reject |
| `approved` | Aprobado (interno) | publish |
| `changes_requested` | Cambios solicitados | create-revision |
| `published` / `approved_by_client` / `rejected` / `archived` | — | Sin acciones |

## Integración en detalle cliente/proyecto

`OsDeliveriesSection` en ficha cliente/proyecto usa `osDeliverablesApi.list` con resolución UUID canónica desde IDs legacy nelvyon.

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `features/os-shell/deliverables/api.ts` | Cliente API |
| `features/os-shell/deliverables/canonicalPickers.ts` | Bridge legacy → UUID |
| `features/os-shell/deliverables/deliverableStatus.ts` | Labels, tonos, workflow |
| `features/os-shell/deliverables/OsDeliverablesListView.tsx` | Lista |
| `features/os-shell/deliverables/OsDeliverableCreateView.tsx` | Alta |
| `features/os-shell/deliverables/OsDeliverableDetailView.tsx` | Detalle + versiones |
| `features/os-shell/deliverables/OsDeliverableWorkflowActions.tsx` | Botones workflow |
| `features/os-shell/components/OsDeliveriesSection.tsx` | Widget en cliente/proyecto |
| `features/os-shell/osShellNav.ts` | Nav «Entregables» |

## Validación

```bash
cd apps/web
pnpm test -- src/features/os-shell/deliverables
pnpm typecheck
pnpm build
```
