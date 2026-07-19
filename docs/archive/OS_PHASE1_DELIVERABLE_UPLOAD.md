# OS Phase 1 — Upload real de entregables

Subida de archivos por operadores al almacenamiento privado Supabase (`os-deliverables`).

## Endpoint

```http
POST /api/v1/os/deliverables/{id}/upload
Authorization: Bearer <platform JWT>
X-Workspace-Id: <integer>
Content-Type: multipart/form-data

file=<binary>
```

| Requisito | Detalle |
|-----------|---------|
| Auth | JWT plataforma + workspace |
| Rol | `owner`, `admin` u `operator` (`require_workspace_operator`) |
| Aislamiento | Entregable debe pertenecer al `workspace_id` del header |
| Campo | `file` (obligatorio) |
| Respuesta | `200` — `OsDeliverableResponse` con `storage_key` actualizado |

## Validación de archivo

| Regla | Valor |
|-------|-------|
| Tamaño máximo | 25 MB (`OS_DELIVERABLES_MAX_UPLOAD_BYTES`) |
| Extensiones | `pdf`, `png`, `jpg`, `jpeg`, `webp`, `svg`, `zip`, `docx`, `xlsx` |
| Filename | Sin rutas (`..`, `/`, `\`); máx. 200 caracteres |
| Content-Type | Debe coincidir con la extensión (salvo `application/octet-stream`) |

## Storage

- **Bucket:** `os-deliverables` (privado, env `OS_DELIVERABLES_BUCKET`)
- **Path:** `{workspace_id}/{deliverable_id}/{version}/{filename}`
- **Supabase:** `SupabaseService.upload_bytes` si existen `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Mock:** sin credenciales → subida simulada; `storage_key` se guarda igual

Tras subir:
- Se actualiza `storage_key`
- **`file_url` manual no se borra** (compatibilidad)

## Seguridad

- Portal **no** expone `storage_key` (solo `has_file`)
- Descarga portal usa signed URL (`GET /api/v1/portal/deliverables/{id}/download`)
- Prioridad descarga: `storage_key` > `file_url` https

## UI interna

Ruta: `/os/entregables/{id}`

- Panel **Subir archivo** (solo `canEdit`)
- Estados: loading / error / success
- Indica si hay adjunto (storage o URL manual)
- No altera el formulario de edición existente

Archivos:
- `OsDeliverableUploadPanel.tsx`
- `attachment.ts`
- `api.ts` → `uploadFile()`

## Tests

`backend/tests/test_os_deliverable_upload.py`:

| Caso | Esperado |
|------|----------|
| Upload OK | `200`, `storage_key` guardado |
| Viewer/member | `403` |
| Otro workspace | `404` |
| Archivo inválido (.exe) | `400` |
| Mantiene `file_url` manual | `storage_key` + `file_url` |
| Portal download tras upload | `302` signed mock URL |

## Variables de entorno

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OS_DELIVERABLES_BUCKET=os-deliverables
OS_DELIVERABLES_MAX_UPLOAD_BYTES=26214400
OS_DELIVERABLES_SIGNED_TTL_SEC=600
```

## Ejecución local

```bash
cd backend && python -m pytest tests/test_os_deliverable_upload.py -q
cd apps/web && pnpm typecheck && pnpm build
```

## Relación con descarga

Ver [OS_PHASE1_DELIVERABLE_DOWNLOAD.md](./OS_PHASE1_DELIVERABLE_DOWNLOAD.md).
