# OS-1-UI-01 — Clientes UI canónica

Migra el shell `/os/clientes` a `/api/v1/os/clients` (`os_clients`, UUID).

## Feature flag

| Variable | Default | Efecto |
|----------|---------|--------|
| `NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI` | `true` (unset) | UI canónica |
| `false` / `0` | — | Fallback UI legacy `nelvyon_clients` |

Otros módulos OS (proyectos, tareas, pipeline) siguen en `legacyApi.ts` hasta sus tickets UI.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/os/clientes` | Lista paginada + filtros |
| `/os/clientes/nuevo` | Crear |
| `/os/clientes/{uuid}` | Detalle, editar, archivar |

## API

| Acción | Método |
|--------|--------|
| Lista | `GET /?skip&limit&q&status&sector` |
| Detalle | `GET /{id}` |
| Crear | `POST /` |
| Editar | `PATCH /{id}` |
| Archivar | `DELETE /{id}` (soft) |

## Archivos

| Archivo | Rol |
|---------|-----|
| `clients/api.ts` | `osClientsCanonicalApi` |
| `clients/legacyApi.ts` | `osClientsLegacyApi` (otros módulos) |
| `clients/featureFlag.ts` | Toggle UI |
| `clients/OsClientsListCanonicalView.tsx` | Lista |
| `clients/OsClientDetailCanonicalView.tsx` | Detalle |
| `clients/OsClientCreateCanonicalView.tsx` | Alta |
| `clients/*LegacyView.tsx` | Fallback |

## Validación

```bash
cd apps/web
pnpm test -- src/features/os-shell/clients
pnpm typecheck
pnpm build
```

## Transición

1. Ejecutar backfill `os:clients-backfill` en staging/prod.
2. Mantener flag `true` en entornos con backfill.
3. Si falla backfill, `NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI=false` temporalmente.
4. Tras OS-1-UI-04, migrar pickers de proyectos a UUID canónico.
