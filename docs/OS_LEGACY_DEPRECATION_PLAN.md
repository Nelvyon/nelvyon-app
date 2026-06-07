# OS Legacy Deprecation Plan

Plan de retirada segura de dependencias legacy fuera del modelo canónico `os_*`. **No ejecutar retirada en producción hasta completar fases de verificación.**

## Inventario de dependencias restantes

### 1. `nelvyon_clients` (legacy CRM/OS híbrido)

| Área | Archivos / rutas | Uso |
|------|------------------|-----|
| Web OS shell | `apps/web/src/features/os-shell/clients/legacyApi.ts` | Fallback API legacy |
| Web OS shell | `OsClientsListLegacyView.tsx`, `OsClientCreateLegacyView.tsx` | UI si flag `false` |
| Web OS shell | `clients/featureFlag.ts` | `NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI` |
| Backend | `routers/nelvyon_clients.py`, `services/nelvyon_clients.py` | API legacy activa |
| Backend | `models/nelvyon_clients.py`, `data_models/nelvyon_clients.json` | Modelo ORM |
| Backfill | `backend/os-core/OsClientsBackfillService.ts`, `runOsClientsBackfill.ts` | Migración datos → `os_clients` |
| Tests | `osClientsBackfill.test.ts`, gap/remediation tests | Regresión |

**Estado datos**: columna `os_clients.legacy_nelvyon_client_id` permite trazabilidad.

### 2. `nelvyon_projects` (legacy)

| Área | Archivos / rutas | Uso |
|------|------------------|-----|
| Web OS shell | `projects/legacyApi.ts` | Fallback API |
| Web OS shell | `OsProjectsListLegacyView.tsx`, `OsProjectCreateLegacyView.tsx`, `OsProjectDetailLegacyView.tsx` | UI legacy |
| Web OS shell | `projects/featureFlag.ts` | `NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI` |
| Backend | `routers/nelvyon_projects.py`, `services/nelvyon_projects.py` | API legacy |
| Backfill | `OsProjectsBackfillService.ts`, `runOsProjectsBackfill.ts` | → `os_projects` |
| Tests | `osProjectsBackfill.test.ts` | Regresión |

### 3. `/os/documentos` (ruta documentos legacy)

| Área | Archivos | Uso |
|------|----------|-----|
| Navegación | `osShellNav.ts` | Entrada menú OS |
| Routing | `routePageRegistry.ts` | Página registrada |
| UI | `OsDocumentosView.tsx`, `OsDocumentDetailView.tsx` | Vista documentos no canónica |
| IA | `ia/insights.ts`, `OsIaView.tsx`, `useOsPlatformDashboard.ts` | Referencias dashboard |
| Normalización | `documents/normalize.ts`, `constants.ts` | Helpers legacy |

**Nota**: no usa tablas `os_*`; mezcla entidades genéricas / documentos históricos.

### 4. Tareas legacy (parcial)

| Área | Archivo | Flag |
|------|---------|------|
| Web | `tareas/OsTasksListLegacyView.tsx` | `NEXT_PUBLIC_OS_TASKS_CANONICAL_UI=false` |

### 5. Backend transversal (no OS-core, no retirar en este bloque)

Referencias en `e2e_orchestrator`, `agent_orchestrator`, `communications_v1`, Alembic histórico — **fuera de alcance OS**; documentar solo como deuda.

## Fases de retirada

### Fase 0 — Precondiciones (actual)

- [x] Tablas canónicas `os_clients`, `os_projects`, `os_tasks`, `os_deliverables` en prod
- [x] Backfill scripts con dry-run
- [x] UI canónica por defecto (`CANONICAL_UI` unset = true)
- [x] RLS 322 en tablas `os_*`
- [ ] Confirmar 0 filas huérfanas en backfill prod

### Fase 1 — Congelar legacy UI (1 sprint)

1. Fijar en Railway/prod:
   - `NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI=true`
   - `NEXT_PUBLIC_OS_PROJECTS_CANONICAL_UI=true`
   - `NEXT_PUBLIC_OS_TASKS_CANONICAL_UI=true`
2. Ocultar rutas legacy en nav si flag true (ya implementado).
3. Monitorizar errores 404 a `nelvyon_*` APIs (7 días).

### Fase 2 — Soft-deprecate APIs legacy (2–3 semanas)

1. Marcar `routers/nelvyon_clients.py` y `nelvyon_projects.py` como deprecated en OpenAPI.
2. Log `warning` en cada request legacy con `workspace_id`.
3. Bloquear **nuevos** writes legacy vía feature flag backend `OS_LEGACY_WRITES_DISABLED=true`.
4. Ejecutar backfill final + validación conteos.

### Fase 3 — Documentos `/os/documentos` (paralelo)

1. Inventariar usuarios activos en ruta (analytics).
2. Migrar flujos críticos a entregables `os_deliverables` donde aplique.
3. Redirigir `/os/documentos` → `/os/entregables` con aviso 30 días.
4. Eliminar `OsDocumentosView` y entradas nav.

### Fase 4 — Hard removal (post-verificación)

1. Eliminar `legacyApi.ts`, vistas `*LegacyView.tsx`, feature flags.
2. Retirar routers/servicios `nelvyon_clients` / `nelvyon_projects` del mount FastAPI.
3. Migración SQL: `RENAME` tablas legacy → `*_archived_YYYYMMDD` (no DROP inmediato).
4. Actualizar tests remediation/gap que referencien legacy.

## Criterios de éxito

| Métrica | Objetivo |
|---------|----------|
| Tráfico API `nelvyon_clients` | 0 req/día 14 días |
| Tráfico API `nelvyon_projects` | 0 req/día 14 días |
| Visitas `/os/documentos` | 0 o redirigidas |
| Filas sin `legacy_*_id` en `os_*` | 100% mapeadas o aceptadas como nativas |
| Tests OS core | verde |

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cliente aún en UI legacy por flag | Forzar env prod true |
| Integraciones externas a API legacy | Inventario + período gracia |
| Pérdida datos documentos | Export CSV antes Fase 3 |
| CRM SaaS cruza `nelvyon_clients` | **No tocar SaaS**; solo aislar mounts OS |

## Comandos de verificación

```bash
pnpm -C apps/web validate:os-clients-backfill -- --dry-run
pnpm -C apps/web validate:os-projects-backfill -- --dry-run
pnpm -C apps/web validate:os-core-migrations
rg "nelvyon_clients|nelvyon_projects" apps/web/src/features/os-shell
```

## Resumen ejecutivo

- **Dependencias legacy activas**: 2 tablas API (`nelvyon_clients`, `nelvyon_projects`), 1 ruta UI (`/os/documentos`), 3 feature flags.
- **Retirada segura estimada**: 4–6 semanas tras Fase 0 en prod.
- **Bloque endurecimiento actual**: documenta y asegura `os_*`; **no elimina** legacy (estabilidad).
