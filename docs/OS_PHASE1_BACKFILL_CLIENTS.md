# OS-1-02 — Backfill `nelvyon_clients` → `os_clients`

Migración segura e idempotente de clientes legacy hacia la tabla canónica NELVYON OS (`os_clients`, migración 315).

## Alcance

| Incluye | Excluye |
|---------|---------|
| Script dry-run / apply | SaaS (`saas_*`, ETL Block B) |
| Validador post-backfill | Web pública / marketing |
| Tests unitarios dedupe + servicio | Portal cliente |
| Solo `INSERT` en `os_clients` | Borrar o modificar `nelvyon_clients` |
| Referencia `legacy_nelvyon_client_id` + `metadata.source` | Sobrescribir filas existentes |

## Reglas de mapeo

- **workspace_id** — obligatorio; filas sin workspace se omiten (error en reporte).
- **Campos** — `business_name`, `sector`, `country`, `city`, marca (`ideal_customer`, `objectives`, etc.) si existen en legacy.
- **Email** — `contact_email` normalizado a minúsculas.
- **Teléfono** — en `metadata.contact_phone` (no hay columna `phone` en `os_clients`).
- **Status** — `active` por defecto; `archived` / `inactive` / `churned` → `archived`.
- **Dedupe** — `workspace_id + email` si hay email; si no, `workspace_id + business_name` (lower trim).
- **Ya migrado** — skip si `os_clients.legacy_nelvyon_client_id = nelvyon_clients.id`.
- **Duplicado OS** — skip si ya existe fila en `os_clients` con misma clave dedupe (no overwrite).
- **Conflicto legacy** — dos+ filas legacy sin migrar con misma clave → no insertar ninguna hasta resolución manual.

## Comandos

Prerrequisito: migración **315** aplicada (`pnpm migrate` o prod equivalente).

```bash
cd apps/web

# 1. Validar schema os_clients
pnpm validate:os-core-migrations

# 2. Dry-run (solo reporte)
pnpm os:clients-backfill -- --dry-run

# 3. Apply (INSERT seguros únicamente)
pnpm os:clients-backfill -- --apply --i-understand-apply

# 4. Validar counts legacy vs os
pnpm validate:os-clients-backfill
```

`DATABASE_URL` se carga desde `apps/web/.env.production.local`, `.env.production.local.txt`, `.env.local` o variables de entorno.

## Reporte dry-run / apply

El CLI escribe JSON en `docs/OS_CLIENTS_BACKFILL_REPORT.json`:

| Campo | Descripción |
|-------|-------------|
| `legacyTotal` | Filas en `nelvyon_clients` |
| `candidatesNew` | Insertables en este run |
| `duplicates` | Legacy cuya clave ya existe en `os_clients` |
| `conflicts` | Varios legacy con misma clave dedupe |
| `errors` | workspace NULL, nombre vacío, fallos INSERT |
| `skippedAlreadyMigrated` | Ya tienen fila OS por `legacy_nelvyon_client_id` |
| `skippedNoWorkspace` | Sin `workspace_id` |
| `appliedInserts` | Filas insertadas (solo modo apply) |

## Validador

`validate:os-clients-backfill` compara:

- Total `nelvyon_clients` vs `os_clients`
- Clientes legacy sin fila OS (`legacy_nelvyon_client_id`)
- Grupos dedupe duplicados en `os_clients` (falla si > 0)

Tras apply completo, `unmigratedLegacyCount` debe ser 0 salvo filas omitidas por reglas (sin workspace, conflicto, duplicado).

## Idempotencia

- Re-ejecutar **dry-run** o **apply** no duplica: filas ya migradas y duplicados se saltan.
- Índice único parcial `idx_os_clients_legacy_nelvyon` impide dos OS rows por mismo legacy id.

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/os-core/osClientsDedupe.ts` | Claves dedupe y mapeo status |
| `backend/os-core/OsClientsBackfillService.ts` | Lógica dry-run / apply |
| `backend/os-core/scripts/runOsClientsBackfill.ts` | CLI |
| `apps/web/scripts/validate-os-clients-backfill.ts` | Validador counts |
| `backend/os-core/__tests__/osClientsBackfill.test.ts` | Tests |

## Rollback operativo

No hay DELETE automático. Para revertir un apply erróneo:

```sql
DELETE FROM os_clients
WHERE legacy_nelvyon_client_id IS NOT NULL
  AND metadata->>'source' = 'etl:legacy:nelvyon_clients';
```

Ejecutar solo tras revisar el reporte; `nelvyon_clients` permanece intacto.

## Siguiente ticket

**OS-1-03** — API REST `/api/v1/os/clients` (CRUD lectura/escritura sobre `os_clients`).
