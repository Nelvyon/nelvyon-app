# Fase 1B — ETL CRM y dedupe

## Reglas de dedupe

| Prioridad | Clave |
|-----------|--------|
| 1 | `tenant_id` + email normalizado (lower, trim) |
| 2 | `tenant_id` + teléfono (solo dígitos, ≥6) + nombre normalizado |

## Fuentes

| Fuente | Incluida | Notas |
|--------|----------|-------|
| `contacts` | Sí | Requiere `workspace_id` + tenant en bridge |
| `crm_contacts` (workspace) | Sí | Solo si columna `workspace_id` existe |
| `crm_contacts` (OS / `user_id`) | No en 1B | Sin bridge workspace; fase posterior |

## Marcado de origen

Tags en `saas_contacts.tags`:

- `etl:source:contacts` o `etl:source:crm_contacts`
- `etl:legacy_id:<source>:<id>`

## Modos

```bash
cd apps/web
pnpm migrate                    # 310 + 311 si pendientes
pnpm saas:validate-bridge       # reporte JSON bridge
pnpm saas:crm-etl -- --dry-run  # análisis
pnpm saas:crm-etl -- --apply --i-understand-apply
```

## Reporte ETL

| Campo | Significado |
|-------|-------------|
| `candidatesTotal` | Filas legacy elegibles |
| `newContacts` | Insertables tras dedupe |
| `duplicates` | Ya existían en saas (misma clave) |
| `conflicts` | Varias filas legacy con misma clave |
| `skippedNoTenant` | Sin `saas_tenants.workspace_id` |
| `skippedAlreadyMigrated` | Tag `etl:legacy_id` ya presente |

## Cuotas (transición)

`workspace_service._count_resource("contacts")` usa `GREATEST(saas_contacts, legacy_sum)` — ver `docs/PHASE_1B_QUOTAS.md`.
