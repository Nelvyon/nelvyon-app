# OS-1-07 — Tareas canónicas (`os_tasks`) + API REST

Base oficial de tareas NELVYON OS con FK hacia `os_projects` y `os_clients` (migración 317).

## Migración

**Archivo:** `backend/db/migrations/317_os_tasks.sql`

- Renombra la tabla pipeline legacy 281 (`user_id`) → `os_tasks_legacy_281` si aplica.
- Crea `os_tasks` UUID con FKs, CHECK `status` / `priority`, índices y soft delete vía `archived_at`.

### Columnas

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `workspace_id` | INTEGER NOT NULL | Aislamiento tenant |
| `project_id` | UUID → `os_projects(id)` | Opcional |
| `client_id` | UUID → `os_clients(id)` | Opcional; inferido desde `project_id` |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | TEXT CHECK | `pending`, `in_progress`, `blocked`, `completed`, `archived` |
| `priority` | TEXT CHECK | `low`, `medium`, `high`, `urgent` |
| `assignee` | TEXT | |
| `due_date` | DATE | |
| `completed_at` | TIMESTAMPTZ | Set al pasar a `completed` |
| `metadata` | JSONB | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |
| `archived_at` | TIMESTAMPTZ | Soft delete |

### Índices

`idx_os_tasks_workspace`, `idx_os_tasks_project`, `idx_os_tasks_client`, `idx_os_tasks_status`, `idx_os_tasks_priority`, `idx_os_tasks_due_date`, `idx_os_tasks_updated_at`

## API REST

Base: **`/api/v1/os/tasks`**

| Método | Ruta | RBAC | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/os/tasks` | Miembro workspace | Lista paginada |
| `GET` | `/api/v1/os/tasks/{id}` | Miembro workspace | Detalle UUID |
| `POST` | `/api/v1/os/tasks` | owner / admin / operator | Crear |
| `PATCH` | `/api/v1/os/tasks/{id}` | owner / admin / operator | Actualización parcial |
| `DELETE` | `/api/v1/os/tasks/{id}` | owner / admin / operator | Archivar (soft) |

### Autenticación

```http
Authorization: Bearer <JWT>
X-Workspace-Id: <integer>
```

### RBAC

- **Lectura** — owner, admin, operator, **member**, **viewer**
- **Escritura** — owner, admin, operator
- **member** / **viewer** → **403** en POST/PATCH/DELETE

### Validación FK

- `project_id` y `client_id` deben existir en el **mismo workspace**
- Si `project_id` tiene `client_id`, el `client_id` enviado debe coincidir (o omitirse para inferir)
- Errores → **400**

### Listado

| Param | Descripción |
|-------|-------------|
| `page` | Página (default 1) |
| `page_size` | 1–200 (default 20) |
| `q` | Búsqueda en `title`, `description` |
| `status` | Filtro exacto |
| `priority` | Filtro exacto |
| `project_id` | UUID proyecto OS |
| `client_id` | UUID cliente OS |
| `assignee` | Filtro exacto |

Orden: `updated_at DESC`, `title ASC`.

### DELETE (soft)

- `status` → `archived`
- `archived_at` → timestamp UTC

## Legacy preservado

- Tabla: `os_tasks_legacy_281` (pipeline Fase 2C)
- API legacy: `/api/v1/entities/os_tasks` (sin cambios de contrato)

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/db/migrations/317_os_tasks.sql` | Migración PG |
| `backend/models/os_tasks.py` | Modelo canónico |
| `backend/models/os_tasks_legacy_281.py` | Modelo legacy |
| `backend/services/os_tasks_service.py` | CRUD + validación FK |
| `backend/routers/os_tasks_rest.py` | Router FastAPI |
| `backend/tests/test_os_tasks_api.py` | Tests API |
| `apps/web/scripts/validate-os-core-migrations.ts` | Validador 315+316+317 |

## Validación

```bash
pnpm migrate
pnpm --filter web validate-os-core-migrations
cd backend && python -m pytest tests/test_os_tasks_api.py -q
pnpm typecheck
pnpm build
```

## Siguiente ticket

**OS-1-08** — `os_deliverables` con workflow borrador → revisión → entregado → aprobado/publicado.
