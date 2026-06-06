# OS-1-05 — Backfill `nelvyon_projects` → `os_projects`

Migración segura e idempotente de proyectos legacy hacia la tabla canónica NELVYON OS (`os_projects`, migración 316).

## Prerrequisitos

1. Migración **315** (`os_clients`) y **316** (`os_projects`) aplicadas.
2. Backfill de clientes **OS-1-02** ejecutado (o clientes OS con `legacy_nelvyon_client_id` poblado) — los proyectos requieren `client_id` UUID mapeable.

## Alcance

| Incluye | Excluye |
|---------|---------|
| Script dry-run / apply | SaaS, web pública, portal |
| Validador post-backfill | UI, APIs legacy |
| Solo `INSERT` en `os_projects` | Borrar/modificar `nelvyon_projects` |
| Referencia legacy en `metadata` | Cambios schema `os_clients` / `os_projects` |

## Reglas de mapeo

| Legacy (`nelvyon_projects`) | OS (`os_projects`) |
|-----------------------------|---------------------|
| `workspace_id` | `workspace_id` (obligatorio) |
| `client_id` (int) | `client_id` UUID vía `os_clients.legacy_nelvyon_client_id` |
| `title` o `name` | `name` |
| `description` o `brief` | `description` |
| `status` | enum OS (`draft`, `active`, `paused`, `completed`, `cancelled`, `archived`) |
| `priority` | `low` / `medium` / `high` / `urgent` (default `medium`) |
| `start_date` | `start_date` (si columna existe) |
| `due_date` o `deadline` | `due_date` |
| `budget` | `budget` (si existe) |
| `id` | `metadata.legacy_nelvyon_project_id` + `metadata.source` |

`metadata` adicional: `project_type`, `progress`, `deliverables`, `legacy_client_id`, `imported_at`.

## Dedupe

1. **Primario** — ya migrado si `metadata.legacy_nelvyon_project_id = nelvyon_projects.id`.
2. **Duplicado OS** — skip si existe fila con misma clave `workspace_id + client_id + name`.
3. **Conflicto** — dos+ filas legacy sin migrar con misma clave fallback → no insertar hasta resolución manual.

## Proyectos sin cliente

Si no hay fila en `os_clients` con `legacy_nelvyon_client_id = nelvyon_projects.client_id` (mismo workspace), el proyecto se **omite** (`skippedNoClientMapping`). No se inventan clientes.

## Comandos

```bash
cd apps/web

pnpm validate:os-core-migrations
pnpm os:projects-backfill -- --dry-run
pnpm os:projects-backfill -- --apply --i-understand-apply
pnpm validate:os-projects-backfill
```

## Reporte JSON

Campos clave (`docs/OS_PROJECTS_BACKFILL_REPORT.json`):

| Campo | Descripción |
|-------|-------------|
| `legacyTotal` | Filas en `nelvyon_projects` |
| `candidatesNew` | Insertables en este run |
| `duplicates` | Clave fallback ya existe en `os_projects` |
| `conflicts` | Varios legacy misma clave fallback |
| `skippedNoClientMapping` | Sin `os_clients` para `client_id` legacy |
| `skippedAlreadyMigrated` | Ya en metadata legacy |
| `appliedInserts` | Filas insertadas (apply) |

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/os-core/osProjectsDedupe.ts` | Mapeos y claves dedupe |
| `backend/os-core/OsProjectsBackfillService.ts` | Lógica dry-run / apply |
| `backend/os-core/scripts/runOsProjectsBackfill.ts` | CLI |
| `apps/web/scripts/validate-os-projects-backfill.ts` | Validador counts |
| `backend/os-core/__tests__/osProjectsBackfill.test.ts` | Tests |

## Rollback operativo

```sql
DELETE FROM os_projects
WHERE metadata->>'source' = 'etl:legacy:nelvyon_projects';
```

Solo tras revisar el reporte; `nelvyon_projects` permanece intacto.

## Siguiente ticket

**OS-1-06** — API REST `/api/v1/os/projects` (CRUD sobre `os_projects`, FK `client_id`, RBAC workspace).
