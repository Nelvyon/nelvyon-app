# OS-1-11 — Versionado y re-publicación de entregables

Workflow completo de revisión cliente → nueva versión → re-publicación.

## Migración 321

**Archivo:** `backend/db/migrations/321_os_deliverable_versions.sql`

Tabla **`os_deliverable_versions`** — snapshots de versiones anteriores al crear revisión.

| Columna | Descripción |
|---------|-------------|
| `id` | UUID PK |
| `workspace_id` | Aislamiento tenant |
| `deliverable_id` | FK → `os_deliverables` |
| `version` | Número de versión archivada |
| `status` | Status al archivar (p. ej. `changes_requested`) |
| `file_url` | URL del archivo de esa versión |
| `review_notes` | Notas internas |
| `metadata` | JSONB (incluye feedback cliente) |
| `created_at` | Timestamp del snapshot |

**UNIQUE** `(deliverable_id, version)`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/os/deliverables/{id}/create-revision` | Nueva revisión tras `changes_requested` |
| `GET` | `/api/v1/os/deliverables/{id}/versions` | Historial de snapshots |

Auth: JWT workspace + rol **operator** para `create-revision`; lectura con cualquier miembro workspace.

## Workflow completo

```
draft
  → submit-review → in_review
  → deliver → delivered
  → approve → approved
  → publish → published (client_visible)
  → [portal reject] → changes_requested
  → create-revision → draft v(N+1)  ← snapshot vN en os_deliverable_versions
  → submit-review → … → publish v(N+1)
  → [portal approve/reject de nuevo]
```

## Reglas `create-revision`

Solo permitido cuando `status = changes_requested`.

**Snapshot (vN):**
- Fila en `os_deliverable_versions` con version, status, file_url, review_notes, metadata completa

**Entregable actual (vN+1):**
- `version += 1`
- `status = draft`
- `visibility = internal`
- Reset timestamps: `delivered_at`, `approved_at`, `published_at`, `client_reviewed_at`, `approved_by_portal_user_id`
- **Conserva** `metadata.client_feedback`, `client_review_history`, etc.
- Añade `metadata.previous_version`, `metadata.revision_created_at`

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/db/migrations/321_os_deliverable_versions.sql` | Migración |
| `backend/models/os_deliverable_versions.py` | Modelo |
| `backend/services/os_deliverables_service.py` | `create_revision`, `list_versions` |
| `backend/routers/os_deliverables_rest.py` | Endpoints |
| `backend/tests/test_os_deliverable_versioning.py` | Tests |

## Validación

```bash
pnpm migrate
pnpm validate:os-core-migrations
cd backend && python -m pytest tests/test_os_deliverable_versioning.py -q
```

## Relación con OS-1-10

OS-1-10 cubre approve/reject portal. OS-1-11 cierra el ciclo permitiendo al equipo interno crear una nueva versión y volver a publicar tras `changes_requested`.
