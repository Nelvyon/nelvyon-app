# OS Phase 1 — Descarga segura de entregables (portal)

Descarga autenticada para clientes del portal OS. Sustituye enlaces directos a `file_url` en la UI.

## Endpoint

```http
GET /api/v1/portal/deliverables/{id}/download
Authorization: Bearer <portal JWT>
```

| Regla | Comportamiento |
|-------|----------------|
| Auth | JWT portal (`portal: true`) |
| Aislamiento | Mismo `workspace_id` y `client_id` del token |
| Visibilidad | `visibility = client_visible` |
| Estado | `status ∈ { published, approved_by_client }` |
| Archivo | `storage_key` (prioridad) o `file_url` https |
| Sin archivo | `404` — `No file attached to this deliverable` |
| Token inválido | `401` |

### Resolución de URL

1. **`storage_key`** — URL firmada Supabase (TTL 600 s por defecto, bucket `os-deliverables`).
2. **`file_url`** — solo si es `https://`; respuesta `302` al destino.
3. Ninguno válido — `404`.

La respuesta exitosa es **`302 Found`** con `Location` apuntando al recurso.

## Portal API — campo `has_file`

`GET /api/v1/portal/deliverables` y `GET /api/v1/portal/deliverables/{id}` incluyen:

```json
{ "has_file": true }
```

Calculado desde `storage_key` o `file_url` https. No expone `storage_key`.

## UI portal

- Ruta: `/portal/deliverables/{id}`
- Botón **Download file** solo si `has_file === true`
- Estados: loading, error
- Ya no enlaza `file_url` crudo en HTML

Archivos:

- `apps/web/src/features/client_portal_v1/components/PortalDeliverableDownloadButton.tsx`
- `apps/web/src/features/client_portal_v1/download.ts`

## Storage / upload (preparado, no implementado)

### SupabaseService (auditoría)

| Método | Uso |
|--------|-----|
| `upload_bytes` | Subida binaria (mock si faltan credenciales) |
| `create_signed_url` | URL firmada para descarga privada |
| `download_bytes` | Lectura interna |
| `list_objects` | Listado por prefijo |

Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Sin ellas → **mock mode** (URLs `mock.supabase.local`).

### Helper OS

`backend/services/os_deliverable_storage.py`:

- `OS_DELIVERABLES_BUCKET` (default `os-deliverables`)
- `build_storage_path(workspace_id, deliverable_id, version, filename)`
- `deliverable_has_file`, `resolve_deliverable_download_url`
- `upload_design_note()` — contrato para fase siguiente

### Compatibilidad `file_url` manual

Los entregables con `file_url` https existentes siguen descargándose sin migración. `storage_key` tiene prioridad cuando ambos existen.

### Upload real (pendiente)

```
POST /api/v1/os/deliverables/{id}/upload   (operator+, multipart)
  → SupabaseService.upload_bytes(bucket, path)
  → PATCH deliverable: storage_key=<path>
```

Requiere: bucket privado `os-deliverables`, credenciales prod, UI en shell OS.

## Tests

`backend/tests/test_portal_deliverable_download.py`:

| Caso | Esperado |
|------|----------|
| Visible + archivo | `302` → URL |
| Otro cliente | `404` |
| `visibility=internal` | `404` |
| Sin archivo | `404` |
| Token inválido | `401` |
| `storage_key` (mock) | `302` → signed mock URL |

## Ejecución local

```bash
cd backend && python -m pytest tests/test_portal_deliverable_download.py -q
cd apps/web && pnpm typecheck && pnpm build
```
