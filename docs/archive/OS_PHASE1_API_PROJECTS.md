# OS-1-06 — API REST `/api/v1/os/projects`

API oficial de proyectos NELVYON OS sobre `os_projects` (migración 316), con FK validada hacia `os_clients`.

## Endpoints

Base: **`/api/v1/os/projects`**

| Método | Ruta | RBAC | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/os/projects` | Miembro workspace | Lista paginada |
| `GET` | `/api/v1/os/projects/{id}` | Miembro workspace | Detalle UUID |
| `POST` | `/api/v1/os/projects` | owner / admin / operator | Crear |
| `PATCH` | `/api/v1/os/projects/{id}` | owner / admin / operator | Actualización parcial |
| `DELETE` | `/api/v1/os/projects/{id}` | owner / admin / operator | Archivar (soft) |

## Autenticación

```http
Authorization: Bearer <JWT>
X-Workspace-Id: <integer>
```

## RBAC

- **Lectura** — `require_workspace` (owner, admin, operator, **member**, **viewer**).
- **Escritura** — `require_workspace_operator` (owner, admin, operator).
- **member** y **viewer** → **403** en POST/PATCH/DELETE.

## FK `client_id`

- Obligatorio en POST.
- Debe existir en `os_clients` **del mismo workspace**.
- Si no existe → **400** (`client_id not found in workspace`).
- PATCH puede cambiar `client_id` con la misma validación.

## Listado

Query params:

| Param | Descripción |
|-------|-------------|
| `page` | Página (default 1) |
| `page_size` | Tamaño (1–200, default 20) |
| `q` | Búsqueda en `name`, `description` |
| `status` | Filtro exacto |
| `priority` | Filtro exacto |
| `client_id` | Filtro UUID cliente OS |

Orden: `updated_at DESC`, `name ASC`.

Respuesta:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

## DELETE (soft)

- `status` → `archived`
- `archived_at` → timestamp UTC
- No borrado físico

## Status / priority válidos

**Status:** `draft`, `active`, `paused`, `completed`, `cancelled`, `archived`  
**Priority:** `low`, `medium`, `high`, `urgent`

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/models/os_projects.py` | Modelo SQLAlchemy |
| `backend/services/os_projects.py` | CRUD + filtros |
| `backend/routers/os_projects.py` | Router FastAPI |
| `backend/tests/test_os_projects_api.py` | Tests |

## Tests

```bash
cd backend
python -m pytest tests/test_os_projects_api.py -q
```

## Siguiente ticket

**OS-1-07** — Migración `317_os_tasks` con FK hacia `os_projects` + API REST `/api/v1/os/tasks`.
