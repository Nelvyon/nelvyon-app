# OS-1-09 — Portal cliente mínimo

Portal de lectura para clientes OS: auth por invitación, proyectos propios y entregables publicados (`client_visible` + `published`).

## Tablas (migración 319)

| Tabla | Propósito |
|-------|-----------|
| `os_portal_invites` | Invitación por email; solo `token_hash` en DB |
| `os_portal_users` | Cuenta portal (email + password_hash); FK → `os_clients` |

**Archivo:** `backend/db/migrations/319_os_portal.sql`

## Auth

### Crear invitación (interno — operator+)

```http
POST /api/v1/portal/invites
Authorization: Bearer <platform JWT>
X-Workspace-Id: <integer>

{ "client_id": "<uuid>", "email": "cliente@empresa.com" }
```

Respuesta incluye `token` **una sola vez** (72h TTL).

### Activar cuenta

```http
POST /api/v1/portal/auth/accept-invite

{ "token": "<raw>", "password": "min 8 chars", "name": "Opcional" }
```

→ JWT portal (`portal: true`, claims `client_id`, `workspace_id`).

### Login

```http
POST /api/v1/portal/auth/login

{ "email": "...", "password": "..." }
```

## API portal (lectura)

Base: **`/api/v1/portal`**

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/me` | Portal JWT |
| `GET` | `/projects` | Portal JWT |
| `GET` | `/projects/{id}` | Portal JWT |
| `GET` | `/deliverables` | Portal JWT |
| `GET` | `/deliverables/{id}` | Portal JWT |

```http
Authorization: Bearer <portal JWT>
```

**No** requiere `X-Workspace-Id` (workspace inferido del token).

## Visibilidad y aislamiento

- Proyectos: solo del `client_id` del usuario; estados `active`, `paused`, `completed` (no `draft`/`archived`).
- Entregables: solo `status=published` **y** `visibility=client_visible`.
- Nunca expone: otros clientes, otros workspaces, tareas, `review_notes`, `storage_key`, borradores o entregables en revisión.

## Seguridad

- Token invitación: `secrets.token_urlsafe(32)` + SHA-256 hash en DB.
- Password: PBKDF2-SHA256 (stdlib, sin deps extra).
- JWT portal marcado con claim `portal: true`; tokens plataforma rechazados en rutas portal.
- Queries filtradas por `workspace_id` + `client_id` del token.

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/models/os_portal_invites.py` | Modelo invites |
| `backend/models/os_portal_users.py` | Modelo users |
| `backend/services/portal_auth_service.py` | Invites, login, JWT |
| `backend/services/portal_data_service.py` | Lectura proyectos/entregables |
| `backend/dependencies/portal.py` | `require_portal_user` |
| `backend/routers/portal_rest.py` | Router FastAPI |
| `backend/tests/test_portal_api.py` | Tests |

## Validación

```bash
pnpm migrate
pnpm validate:os-core-migrations
cd backend && python -m pytest tests/test_portal_api.py -q
pnpm typecheck
pnpm build
```

## Siguiente ticket

**OS-1-10** — Aprobación cliente sobre entregables (`approve`/`reject` desde portal).
