# OS-1-04 — Schema `os_projects` (migración 316)

Tabla canónica de proyectos NELVYON OS con FK real hacia `os_clients`. `nelvyon_projects` no se modifica.

## Dependencias

| Migración | Tabla |
|-----------|-------|
| **315** | `os_clients` (FK padre) |
| **316** | `os_projects` |

Ejecutar en orden: `pnpm migrate` (apps/web) con `DATABASE_URL` configurada.

## Columnas

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `workspace_id` | INTEGER NOT NULL | Aislamiento tenant; denormalizado desde cliente |
| `client_id` | UUID NOT NULL | FK → `os_clients(id)` ON DELETE RESTRICT |
| `name` | TEXT NOT NULL | Nombre del proyecto |
| `description` | TEXT | Opcional |
| `status` | TEXT NOT NULL | Default `draft`; CHECK abajo |
| `priority` | TEXT NOT NULL | Default `medium`; CHECK abajo |
| `start_date` | DATE | Opcional |
| `due_date` | DATE | Opcional |
| `budget` | NUMERIC(14,2) | Opcional |
| `metadata` | JSONB NOT NULL | Default `{}` |
| `created_at` | TIMESTAMPTZ NOT NULL | Default NOW() |
| `updated_at` | TIMESTAMPTZ NOT NULL | Default NOW() |
| `archived_at` | TIMESTAMPTZ | Nullable; archivado lógico |

## Estados (`status`)

| Valor | Uso |
|-------|-----|
| `draft` | Borrador, no iniciado |
| `active` | En curso |
| `paused` | Pausado |
| `completed` | Finalizado con éxito |
| `cancelled` | Cancelado |
| `archived` | Archivado (histórico) |

## Prioridades (`priority`)

`low` · `medium` · `high` · `urgent`

## Índices

| Índice | Columnas |
|--------|----------|
| `idx_os_projects_workspace` | `workspace_id` |
| `idx_os_projects_client` | `client_id` |
| `idx_os_projects_status` | `status` |
| `idx_os_projects_due_date` | `due_date` |
| `idx_os_projects_updated_at` | `updated_at` |
| `idx_os_projects_workspace_status` | `(workspace_id, status)` |

## Seguridad / aislamiento

- **FK** impide proyectos huérfanos sin cliente OS válido.
- **ON DELETE RESTRICT** en `client_id` — no se puede borrar un `os_clients` referenciado.
- **`workspace_id`** en cada fila permite filtrar por workspace sin join obligatorio en listados (la API futura validará coherencia `client.workspace_id = project.workspace_id`).
- Sin referencias a `nelvyon_projects`, `saas_*` ni `crm_contacts`.

## Validación

```bash
cd apps/web
pnpm migrate
pnpm validate:os-core-migrations
```

Comprueba: migraciones 315+316 registradas, tablas, columnas, FK `client_id`, CHECK `status`/`priority`, índices.

## Idempotencia

La migración usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`. Re-ejecutar el SQL manualmente no duplica objetos; el runner `migrate.ts` salta archivos ya en `_migrations`.

## Siguiente ticket

**OS-1-05** — Backfill idempotente `nelvyon_projects` → `os_projects` (dry-run / apply, dedupe, validador).
