# OS-1-08 — Entregables canónicos (`os_deliverables`) + API REST

Sistema oficial de entregables NELVYON OS con workflow **borrador → revisión → entregado → aprobado → publicado** (migración 318).

## Migración

**Archivo:** `backend/db/migrations/318_os_deliverables.sql`

### Columnas principales

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `workspace_id` | INTEGER NOT NULL | Aislamiento tenant |
| `client_id` | UUID → `os_clients(id)` | Obligatorio |
| `project_id` | UUID → `os_projects(id)` | Obligatorio |
| `task_id` | UUID → `os_tasks(id)` | Opcional |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `type` | TEXT | Tipo libre (document, report, …) |
| `status` | TEXT CHECK | Ver workflow abajo |
| `visibility` | TEXT CHECK | `internal` \| `client_visible` |
| `file_url` / `storage_key` | TEXT | Referencia al archivo |
| `version` | INTEGER | Default 1 |
| `review_notes` | TEXT | Notas de revisión/rechazo |
| `delivered_at` / `approved_at` / `published_at` | TIMESTAMPTZ | Timestamps de workflow |
| `metadata` | JSONB | |
| `archived_at` | TIMESTAMPTZ | Soft delete |

### Status válidos

`draft`, `in_review`, `delivered`, `approved`, `published`, `rejected`, `archived`

### Coherencia FK

- `project.client_id` debe coincidir con `client_id`
- Si `task_id` existe, `task.project_id` debe coincidir con `project_id`

## API REST

Base: **`/api/v1/os/deliverables`**

| Método | Ruta | RBAC | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/os/deliverables` | Lectura | Lista paginada |
| `GET` | `/api/v1/os/deliverables/{id}` | Lectura | Detalle |
| `POST` | `/api/v1/os/deliverables` | Escritura | Crear (default `draft`) |
| `PATCH` | `/api/v1/os/deliverables/{id}` | Escritura | Actualización parcial |
| `DELETE` | `/api/v1/os/deliverables/{id}` | Escritura | Archivar (soft) |

### Acciones de workflow

| Método | Ruta | Transición |
|--------|------|------------|
| `POST` | `/{id}/submit-review` | `draft` → `in_review` |
| `POST` | `/{id}/deliver` | `in_review` \| `approved` → `delivered` (+ `delivered_at`) |
| `POST` | `/{id}/approve` | `delivered` → `approved` (+ `approved_at`) |
| `POST` | `/{id}/publish` | `approved` → `published` (+ `published_at`, `visibility=client_visible`) |
| `POST` | `/{id}/reject` | `in_review` \| `delivered` → `rejected` (body opcional `review_notes`) |

Transiciones inválidas → **400**.

### Autenticación

```http
Authorization: Bearer <JWT>
X-Workspace-Id: <integer>
```

### RBAC

- **Lectura** — owner, admin, operator, member, viewer
- **Escritura y workflow** — owner, admin, operator
- **member / viewer** → **403** en mutaciones

### Listado

| Param | Descripción |
|-------|-------------|
| `page` / `page_size` | Paginación (1–200) |
| `q` | Búsqueda en `title`, `description` |
| `status` | Filtro exacto |
| `visibility` | Filtro exacto |
| `type` | Filtro exacto |
| `client_id` / `project_id` / `task_id` | Filtros UUID |

Orden: `updated_at DESC`, `title ASC`.

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/db/migrations/318_os_deliverables.sql` | Migración PG |
| `backend/models/os_deliverables.py` | Modelo SQLAlchemy |
| `backend/services/os_deliverables_service.py` | CRUD + workflow |
| `backend/routers/os_deliverables_rest.py` | Router FastAPI |
| `backend/tests/test_os_deliverables_api.py` | Tests |

## Validación

```bash
pnpm migrate
pnpm validate:os-core-migrations
cd backend && python -m pytest tests/test_os_deliverables_api.py -q
pnpm typecheck
pnpm build
```

## Siguiente ticket

**OS-1-09** — Portal cliente mínimo: login/invite + ver proyectos + ver entregables `client_visible`.
