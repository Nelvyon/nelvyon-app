# Auditoría final NELVYON OS v1 — cierre producción y archivos

**Fecha:** 2026-06-06  
**Alcance:** Migraciones 315–321, backfill, UI canónica, entregables/portal, prod-readiness  
**Fuera de alcance:** SaaS, web pública, marketing, CRM SaaS, pipeline SaaS

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| **Finalización OS v1 comercial (ponderada)** | **~76%** |
| **Backend / schema OS-1 (315–321)** | **100%** (validado en DB conectada) |
| **UI interna `/os/*` canónica** | **~88%** (clientes, proyectos, tareas, entregables) |
| **Portal cliente** | **~74%** |
| **Prod-ready (migraciones + backfill + archivos)** | **~45%** |

**Veredicto:** El **núcleo operativo OS** (clientes → proyectos → tareas → entregables) está en UI canónica con APIs UUID. **Migraciones 315–321 OK** en la base conectada. **Backfill dry-run sin conflictos** pero con **0 filas legacy** en este entorno — en producción con datos reales hay que repetir dry-run con `DATABASE_URL` prod antes de `--i-understand-apply`. **Archivos de entregables** siguen siendo `file_url` manual; falta upload/download seguro para v1 comercial completo.

---

## 1. Backfill producción

### Dry-run ejecutado (2026-06-06)

| Script | Resultado | Conflictos | Errores |
|--------|-----------|------------|---------|
| `pnpm os:clients-backfill -- --dry-run` | `legacyTotal: 0`, `candidatesNew: 0` | `[]` | `[]` |
| `pnpm os:projects-backfill -- --dry-run` | `legacyTotal: 0`, `candidatesNew: 0` | `[]` | `[]` |

Reportes: `docs/OS_CLIENTS_BACKFILL_REPORT.json`, `docs/OS_PROJECTS_BACKFILL_REPORT.json`

### Validadores post-backfill

| Script | Resultado |
|--------|-----------|
| `pnpm validate:os-clients-backfill` | **OK** — `unmigratedLegacyCount: 0`, `ok: true` |
| `pnpm validate:os-projects-backfill` | **OK** — `unmigratedLegacyCount: 0`, `projectsWithoutClientMapping: 0`, `ok: true` |

### ¿Listo para apply?

| Entorno | Estado |
|---------|--------|
| **DB actual (dev/staging conectada)** | ✅ **Listo para apply** — sin conflictos; apply sería no-op (0 legacy). |
| **Producción con datos reales** | ⚠️ **No aplicar sin confirmación** — repetir dry-run contra prod; revisar `conflicts[]` y `skippedNoClientMapping`; solo entonces `pnpm os:clients-backfill -- --i-understand-apply` y `pnpm os:projects-backfill -- --i-understand-apply`. |

**Apply no ejecutado** (instrucción: no aplicar sin confirmar con datos reales).

---

## 2. Validación core — migraciones 315–321

```
pnpm validate:os-core-migrations  → OK
```

| Migración | Tabla / objeto | Estado |
|-----------|----------------|--------|
| **315** | `os_clients` | ✅ registrada, columnas, CHECK status |
| **316** | `os_projects` | ✅ FK → os_clients, índices |
| **317** | `os_tasks` | ✅ FK project/client, CHECK status/priority |
| **318** | `os_deliverables` | ✅ FK client/project/task, visibility |
| **319** | Portal (`os_portal_invites`, `os_portal_users`) | ✅ |
| **320** | `os_deliverable_reviews` | ✅ |
| **321** | `os_deliverable_versions` | ✅ |

Filas actuales en tablas canónicas: **0** (entorno limpio / sin seed OS).

---

## 3. Upload archivos entregables — auditoría

### Estado actual

| Capa | Implementación |
|------|----------------|
| **Schema** | `os_deliverables.file_url`, `storage_key` (318); versiones con `file_url` (321) |
| **API OS** | POST/PATCH aceptan `file_url` y `storage_key` como strings — **sin multipart upload** |
| **UI OS** | `OsDeliverableForm` — campo texto `file_url` (URL externa manual) |
| **Portal** | `PortalDeliverableResponse.file_url` expuesto en GET — enlace directo si existe |

### Infraestructura reutilizable (existente)

| Componente | Ubicación | Uso actual |
|------------|-----------|------------|
| `SupabaseService` | `backend/services/supabase_service.py` | Agentes (DALL-E, finetuning, dialer) — `upload_bytes`, `download_bytes`, `public_url` |
| Mock mode | Sin `SUPABASE_URL` + service role | Dev local sin credenciales |

**No hay** bucket OS dedicado ni router de upload para entregables. **No se implementó storage** en este bloque (requeriría credenciales/bucket prod).

### Diseño mínimo propuesto (sin implementar)

```
Bucket sugerido: os-deliverables  (privado, no public)

Upload (fase siguiente, operator+):
  POST /api/v1/os/deliverables/{id}/upload
  → multipart/form-data
  → SupabaseService.upload_bytes(bucket, f"{workspace_id}/{deliverable_id}/{version}/{filename}")
  → PATCH deliverable: storage_key=<path>, file_url=null (o signed URL efímera)

Compatibilidad:
  • Si file_url ya existe → no tocar en migración
  • Si storage_key existe → download vía signed URL
  • Prioridad resolución: storage_key > file_url
```

**Variables prod necesarias (futuro):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, bucket `os-deliverables` creado con RLS/policies.

---

## 4. Descarga cliente — auditoría y propuesta

### Estado actual

- Portal lista/detalle devuelve `file_url` en JSON.
- **No existe** `GET /api/v1/portal/deliverables/{id}/download`.
- Riesgo: URL pública permanente filtrada en API; sin expiración ni audit trail.

### Flujo recomendado

```
GET /api/v1/portal/deliverables/{id}/download
Authorization: Bearer <portal_jwt>

Validaciones:
  1. require_portal_user
  2. deliverable.client_id == session.client_id
  3. visibility == client_visible
  4. status ∈ PORTAL_VISIBLE_STATUSES (published, delivered, approved, etc.)

Resolución:
  A) storage_key → SupabaseService signed URL (redirect 302, TTL 5–15 min)
  B) file_url externa → redirect 302 (solo https, allowlist opcional)
  C) ninguno → 404 "No file attached"

Respuesta alternativa: 200 stream application/octet-stream (más carga en API)
```

**Portal UI:** botón "Descargar" llama al endpoint autenticado; no enlazar `file_url` crudo en HTML.

---

## 5. Qué está cerrado

| Área | Estado |
|------|--------|
| Schema OS 315–321 | ✅ Validado |
| APIs REST canónicas (clients, projects, tasks, deliverables, portal) | ✅ |
| UI OS clientes/proyectos/tareas/entregables | ✅ Feature flags + legacy fallback |
| Portal auth + proyectos + entregables + approve/reject | ✅ |
| Versionado entregables + revisiones portal | ✅ |
| Scripts backfill + validadores | ✅ |
| Dry-run backfill sin conflictos (entorno actual) | ✅ |

---

## 6. Qué falta

| Prioridad | Item | Tipo |
|-----------|------|------|
| P0 | Dry-run + apply backfill en **prod real** | Ops |
| P0 | Upload entregables (storage_key + bucket) | Backend + UI |
| P0 | `GET /portal/deliverables/{id}/download` | Backend + Portal UI |
| P1 | Deprecar `/os/documentos` (nelvyon_outputs) | UI |
| P1 | RLS / aislamiento tenant en tablas OS | DB |
| P1 | Notificaciones portal (email entregable publicado) | Producto |
| P2 | Pipeline OS interno (`os_deals`) canónico | Fuera v1 mínimo |
| P2 | Finanzas OS completo | Fuera v1 mínimo |

---

## 7. % real por módulo

Metodología: 5 ejes × 20% (schema, API, UI OS, portal, prod). Pesos globales iguales a `OS_V1_COMMERCIAL_AUDIT.md`.

| Módulo | % | Notas |
|--------|---|-------|
| **Clientes** | **82%** | UI canónica OS-1-UI-01; prod backfill prod pendiente verificación |
| **Proyectos** | **80%** | UI canónica OS-1-UI-04 |
| **Tareas** | **78%** | UI canónica OS-1-UI-05 |
| **Entregables** | **80%** | UI + workflow OK; upload real −15% |
| **Portal cliente** | **74%** | Sin download seguro; sin notificaciones |

**Global ponderado:** `0.20×82 + 0.20×80 + 0.15×78 + 0.25×80 + 0.20×74` = **~79%**  
**Ajuste conservador prod (−3%):** **~76%**

---

## 8. Bloqueantes

### Para el lunes (operación interna)

1. Confirmar `DATABASE_URL` producción y ejecutar dry-run backfill allí.
2. Si hay legacy en prod: ventana apply + smoke `/os/clientes`, `/os/proyectos`.
3. Smoke E2E: crear cliente → proyecto → tarea → entregable → publicar → portal approve.
4. Decidir bucket Supabase (o mantener `file_url` manual temporalmente).

### Para v1 comercial (~85%+)

1. Upload + download seguro entregables.
2. Backfill prod ejecutado y validado.
3. Runbook migraciones documentado en deploy.
4. Eliminar dependencia visible de `nelvyon_*` en rutas OS (flags default true + datos migrados).
5. Portal: download + invite UX + al menos notificación email básica.

---

## 9. Orden recomendado siguiente

| # | Ticket / acción | Impacto |
|---|-----------------|---------|
| 1 | **Prod dry-run backfill** (clients + projects) con confirmación humana | Desbloquea datos reales |
| 2 | **OS-1-12** Upload entregables (diseño §3) reutilizando `SupabaseService` | +8% entregables |
| 3 | **OS-1-13** Portal download endpoint (diseño §4) | +6% portal |
| 4 | Smoke + runbook deploy migraciones 315–321 | +5% prod |
| 5 | Deprecar `/os/documentos` entregas legacy | +3% coherencia |
| 6 | Portal notificaciones | +5% portal |

**Commits UI canónicos recientes:**

| Ticket | Commit |
|--------|--------|
| OS-1-UI-01 Clientes | `a331da3` |
| OS-1-UI-04 Proyectos | `59b4c4b` |
| OS-1-UI-05 Tareas | `5ac7185` |

---

## 10. Validación de este bloque

| Check | Resultado |
|-------|-----------|
| `validate:os-core-migrations` | ✅ |
| `validate:os-clients-backfill` | ✅ |
| `validate:os-projects-backfill` | ✅ |
| Backfill dry-run | ✅ sin conflictos |
| Código modificado | ❌ Solo documentación |
| typecheck / build | N/A (sin cambios de código) |

---

*Auditoría basada en ejecución local 2026-06-06 contra la DB configurada en `.env.local` / `.env.production.local`. Producción real requiere repetir validadores con credenciales prod.*
