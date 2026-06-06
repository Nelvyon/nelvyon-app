# OS-1-03 — API REST `/api/v1/os/clients`

API oficial de clientes NELVYON OS sobre la tabla canónica `os_clients` (migración 315).

## Alcance

| Incluye | Excluye |
|---------|---------|
| CRUD workspace-scoped | SaaS (`saas_*`, `saas_contacts`) |
| Auth JWT + `X-Workspace-Id` | Legacy `/api/v1/entities/nelvyon_clients` |
| RBAC workspace | CRM legacy (`crm_contacts`, `contacts`) |
| Búsqueda, filtros, paginación | UI / portal cliente |
| Tests pytest | Modificar `nelvyon_clients` |

## Endpoints

Base: **`/api/v1/os/clients`**

| Método | Ruta | RBAC | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/os/clients` | Miembro workspace (incl. viewer) | Lista paginada |
| `GET` | `/api/v1/os/clients/{id}` | Miembro workspace | Detalle por UUID |
| `POST` | `/api/v1/os/clients` | owner / admin / operator | Crear cliente |
| `PATCH` | `/api/v1/os/clients/{id}` | owner / admin / operator | Actualización parcial |
| `DELETE` | `/api/v1/os/clients/{id}` | owner / admin / operator | Archivar (`status=archived`) |

## Autenticación y workspace

```http
Authorization: Bearer <JWT>
X-Workspace-Id: <integer>
```

- Sin `X-Workspace-Id` → **400** (`workspace_id_required`).
- Usuario no miembro del workspace → **403**.
- Todas las queries SQL filtran por `workspace_id` del header.

## RBAC

Implementado vía dependencias FastAPI:

- **Lectura** — `require_workspace` (cualquier rol activo: owner, admin, operator, member, viewer).
- **Escritura** — `require_workspace_operator` → `owner`, `admin`, `operator` (`core.rbac.workspace_can_mutate`).
- **viewer** y **member** reciben **403** en POST/PATCH/DELETE.

## Query params (GET lista)

| Param | Tipo | Descripción |
|-------|------|-------------|
| `skip` | int ≥ 0 | Offset (default 0) |
| `limit` | int 1–200 | Tamaño página (default 20) |
| `q` | string | Búsqueda ILIKE en `business_name`, `contact_email`, `contact_name` |
| `status` | `active` \| `archived` | Filtro exacto |
| `sector` | string | Filtro exacto por sector |

Respuesta:

```json
{
  "items": [ { "id": "uuid", "workspace_id": 1, "business_name": "...", ... } ],
  "total": 42,
  "skip": 0,
  "limit": 20
}
```

## Body crear (POST)

Campos mínimos:

```json
{
  "business_name": "Acme Corp",
  "sector": "tech",
  "contact_email": "hello@acme.com",
  "status": "active"
}
```

- `business_name` obligatorio (no vacío).
- `contact_email` normalizado a minúsculas; validación formato básico.
- `status` default `active`; valores permitidos: `active`, `archived`.
- `workspace_id` en body opcional; si se envía debe coincidir con `X-Workspace-Id`.
- `metadata` JSON opcional.

## DELETE

Soft-delete: establece `status = archived`. No borra la fila ni toca `nelvyon_clients`.

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/models/os_clients.py` | Modelo SQLAlchemy |
| `backend/services/os_clients.py` | Lógica CRUD + búsqueda |
| `backend/routers/os_clients.py` | Router FastAPI |
| `backend/tests/test_os_clients_api.py` | Tests |

## Tests

```bash
cd backend
python -m pytest tests/test_os_clients_api.py -q
```

Cubre: CRUD owner, viewer solo lectura, operator mutación, aislamiento workspace, paginación, búsqueda, filtros status/sector, member sin CUD.

## Siguiente ticket

**OS-1-04** — Migración `316_os_projects` + FK → `os_clients.id` (UUID).
