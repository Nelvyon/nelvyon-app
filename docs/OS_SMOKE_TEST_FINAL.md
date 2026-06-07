# OS Smoke Test Final — Resultado

**Fecha ejecución:** 2026-06-07  
**Entorno:** Local test DB + pytest / validadores TS

---

## Checklist E2E (manual en prod)

| # | Paso | Ruta / API | Esperado |
|---|------|------------|----------|
| 1 | Crear cliente | `/os/clientes/nuevo` | Cliente `active` con UUID |
| 2 | Invitar portal | `/os/clientes/{id}` → Invitar | 201 + enlace copiable |
| 3 | Activar portal | `/client/accept-invite?token=` | Login → `/portal` |
| 4 | Crear proyecto | `/os/proyectos/nuevo` | Proyecto `active` |
| 5 | Crear tarea | `/os/tareas/nuevo` | Tarea en lista |
| 6 | Crear entregable | `/os/entregables/nuevo` | Borrador |
| 7 | Upload archivo | `/os/entregables/{id}` → Subir | `storage_key` + Storage Supabase |
| 8 | Workflow publish | 4 acciones workflow | `published` + `client_visible` |
| 9 | Email publicado | Bandeja cliente | Email SendGrid (si configurado) |
| 10 | Portal lista | `/portal/deliverables` | Entregable visible |
| 11 | Download | Botón Download file | Archivo descargado |
| 12 | Approve o Reject | Panel revisión | `approved_by_client` o `changes_requested` |
| 13 | Create revision | OS interno si rechazado | `draft` v+1 |
| 14 | Re-publicar | Workflow completo | Cliente ve nueva versión |

---

## Tests automatizados ejecutados

```bash
cd backend && python -m pytest \
  tests/test_os_notifications.py \
  tests/test_portal_api.py \
  tests/test_portal_deliverable_download.py \
  tests/test_os_deliverable_upload.py \
  -q
```

**Resultado:** ✅ **24 passed** (34s)

### Cobertura por área

| Suite | Tests | Estado |
|-------|-------|--------|
| Portal API + invites | 7 | ✅ |
| Portal download | 6 | ✅ |
| Deliverable upload | 6 | ✅ |
| OS notifications | 4 | ✅ |
| Portal approvals | incluido en portal_api | ✅ |

---

## Validadores infraestructura

| Comando | Resultado |
|---------|-----------|
| `pnpm validate:os-core-migrations` | ✅ OK |
| `pnpm validate:os-clients-backfill` | ✅ ok: true |
| `pnpm validate:os-projects-backfill` | ✅ ok: true |
| `pnpm os:clients-backfill -- --dry-run` | ✅ 0 conflictos |
| `pnpm os:projects-backfill -- --dry-run` | ✅ 0 conflictos |

---

## Frontend

| Comando | Resultado |
|---------|-----------|
| `pnpm typecheck` | ✅ (post-fix) |
| `pnpm test src/features/os-shell/portal/__tests__/api.test.ts` | ✅ 3/3 |

---

## Veredicto smoke

| Criterio | Estado |
|----------|--------|
| Flujo API completo | ✅ Automatizado |
| Aislamiento tenant/cliente | ✅ Tests 404 cross-client |
| Upload + download | ✅ |
| Invites + notificaciones | ✅ Hooks verificados |
| Manual prod pendiente | ⚠️ Ejecutar checklist §1–14 en staging/prod |

**GO automatizado:** ✅  
**GO producción real:** Pendiente checklist manual + variables prod

---

*Archivo actualizado en cierre operativo OS 2026-06-07.*
