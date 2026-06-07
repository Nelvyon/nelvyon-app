# OS RLS Audit — NELVYON OS (322_os_rls.sql)

Auditoría de Row Level Security en tablas canónicas `os_*`. Complementa el aislamiento ya aplicado en FastAPI (`workspace_id` + RBAC). **El backend usa `service_role` y bypass RLS**; estas políticas protegen acceso directo vía PostgREST/Supabase client con JWT de usuario.

## Tablas auditadas

| Tabla | `workspace_id` | RLS | Políticas |
|-------|----------------|-----|-----------|
| `os_clients` | Sí | FORCE | select, insert, update, delete |
| `os_projects` | Sí | FORCE | select, insert, update, delete |
| `os_tasks` | Sí | FORCE | select, insert, update, delete |
| `os_deliverables` | Sí | FORCE | select, insert, update, delete |
| `os_portal_invites` | Sí | FORCE | select, insert, update, delete |
| `os_portal_users` | Sí | FORCE | select, insert, update, delete |
| `os_deliverable_reviews` | Sí | FORCE | select, insert, update, delete |
| `os_deliverable_versions` | Sí | FORCE | select, insert, update, delete |

Migración: `backend/db/migrations/322_os_rls.sql`

## Funciones helper

| Función | Propósito |
|---------|-----------|
| `nelvyon_jwt_sub_text()` | JWT `sub` como texto (compatible con `workspace_members.user_id`) |
| `nelvyon_current_workspace_id()` | Workspace activo desde `app.workspace_id` o claim JWT |
| `nelvyon_user_in_workspace(id)` | Miembro activo o owner del workspace |
| `nelvyon_workspace_can_mutate(id)` | Roles `owner`, `admin`, `operator` (o owner del workspace) |
| `nelvyon_os_workspace_select(id)` | SELECT: workspace actual + membresía |
| `nelvyon_os_workspace_mutate(id)` | DML: select + rol mutación |
| `nelvyon_apply_os_workspace_rls(table)` | Aplica 4 políticas idempotentes por tabla |

## Políticas por operación

Patrón equivalente al SaaS (`311_saas_tenant_rls.sql`), adaptado a `workspace_id INTEGER`:

- **SELECT** (`{table}_os_select`): `nelvyon_os_workspace_select(workspace_id)`
- **INSERT** (`{table}_os_insert`): `nelvyon_os_workspace_mutate(workspace_id)` en `WITH CHECK`
- **UPDATE** (`{table}_os_update`): `USING` + `WITH CHECK` con `nelvyon_os_workspace_mutate`
- **DELETE** (`{table}_os_delete`): `nelvyon_os_workspace_mutate(workspace_id)`

### Matriz RBAC (aplicación + RLS)

| Rol workspace | Lectura `os_*` (API) | Mutación `os_*` (API) | RLS SELECT | RLS INSERT/UPDATE/DELETE |
|---------------|----------------------|------------------------|------------|--------------------------|
| owner | Sí | Sí | Sí | Sí |
| admin | Sí | Sí | Sí | Sí |
| operator | Sí | Sí | Sí | Sí |
| viewer / member read-only | Sí (según endpoint) | No | Sí | No |
| Sin membresía | No | No | No | No |
| Portal JWT | Solo rutas `/api/v1/portal/*` | N/A (no accede tablas vía PostgREST) | N/A | N/A |

RBAC API: `backend/core/rbac.py`, dependencias `require_workspace_operator` / `require_workspace_member`.

## Observabilidad OS (acciones críticas)

Eventos en `security_events` con `source='os'` vía `backend/services/os_audit_service.py`:

| Categoría | Acciones |
|-----------|----------|
| `upload` | `file_uploaded`, `storage_upload` (error) |
| `download` | `resolve_url`, `no_file`, `signed_url_failed` |
| `email` | tipos SendGrid OS (`portal_invite`, `deliverable_published`, etc.) |
| `portal` | `create_invite`, `login` (error), `approve_deliverable`, `reject_deliverable` |

## Validación

```bash
pnpm -C apps/web validate:os-core-migrations   # requiere DATABASE_URL + 322 aplicada
pnpm -C apps/web test backend/db/__tests__/osCoreMigrations.test.ts
cd backend && pytest tests/test_os_rls_migration.py tests/test_os_audit_events.py -q
```

## Limitaciones conocidas

1. **Service role bypass**: la API FastAPI no queda restringida por RLS; la seguridad primaria sigue siendo middleware + filtros `workspace_id`.
2. **Portal users**: autenticación separada (JWT portal); no hay política RLS por `portal_user_id` — el portal no debe usar anon key contra tablas `os_*`.
3. **Storage**: bucket `os-deliverables` requiere políticas de storage Supabase independientes de RLS SQL.

## Nivel de seguridad post-322

| Capa | Estado |
|------|--------|
| Aislamiento API workspace | Operativo |
| RBAC operator+ mutaciones | Operativo |
| RLS defensivo 8 tablas | **Nuevo — operativo tras migración** |
| Auditoría rutas críticas | **Nuevo — operativo** |
| Portal JWT + filtros client_id | Operativo |

**Calificación defensiva DB**: media-alta para acceso PostgREST autenticado; **alta en aplicación** si se mantiene solo service_role en backend.
