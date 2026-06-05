# Fase 3B — Sincronización `pipeline_stage` desde `saas_deals`

## Por qué existe

- **Fuente oficial del pipeline:** `saas_deals` (UI kanban, dashboard comercial, métricas).
- **Campo transitorio:** `saas_contacts.pipeline_stage` sigue usado por:
  - **Workflows** — trigger `stage_changed`, condición `contact.pipeline_stage`
  - **Campañas** — audiencia por `pipeline_stage`
  - **Tabla contactos** — badge/filtro legacy informativo

Sin sync, deals y contactos divergían y workflows/campañas leían un stage obsoleto.

## Reglas de sync

Tras **crear**, **editar**, **cambiar etapa** o **eliminar** un deal con `contact_id`:

1. Listar deals del contacto (`tenant_id` + `contact_id`).
2. Calcular etapa principal (`pickPrimaryPipelineStage` en `backend/saas/pipelineStageSync.ts`):
   - **Deals abiertos** (`new` → `proposal`): mayor `value`; empate → `updated_at` más reciente.
   - **Sin abiertos:** `won`/`lost` con `updated_at` más reciente.
   - **Sin deals:** `pipeline_stage = new`.
3. `UPDATE saas_contacts SET pipeline_stage = … WHERE tenant_id AND id`.

### Cambio de contacto en un deal

- Recalcular contacto **nuevo** y **anterior** (si distintos).

### Seguridad

- Solo `saas_contacts` y `saas_deals` del mismo `tenant_id`.
- Sin tablas legacy (`contacts`, `crm_contacts`, etc.).

## Implementación

| Punto | Archivo |
|-------|---------|
| Lógica etapa principal | `backend/saas/pipelineStageSync.ts` |
| Sync en mutaciones | `SaasDealsService.syncContactPipelineStage()` |
| Hooks | `createDeal`, `updateDeal`, `changeStage` (vía update), `deleteDeal` |
| `dealsContext.primaryStage` | Misma función `pickPrimaryPipelineStage` |

## Qué queda legacy

| Elemento | Estado |
|----------|--------|
| `saas_contacts.pipeline_stage` | **Derivado** — no editar manualmente desde UI pipeline |
| `GET /api/saas/crm/pipeline` | Deprecado en UI; API aún existe |
| Movimiento stage en tab contactos (◀/▶) | No usado en pipeline deals; filtro contacto sigue leyendo columna sincronizada |
| Workflows `stage_changed` | Siguen disparando si algo actualiza `pipeline_stage` directamente vía CRM PATCH contacto |

## Cuándo deprecar `pipeline_stage`

1. Workflows usan trigger `deal_stage_changed` sobre `saas_deals`.
2. Campañas filtran por deal stage o segmento derivado.
3. ETL + periodo de gracia con datos en prod.
4. Migración opcional: columna `pipeline_stage` → vista/materializada o eliminación.

**Estimación:** tras Fase 3B completa + RBAC + 1 ciclo prod con ETL, **4–8 semanas** para deprecación UI/API del campo.

## Tests

```powershell
cd apps/web
pnpm exec vitest run ../../backend/saas/__tests__/pipelineStageSync.test.ts ../../backend/saas/__tests__/saasDealsPipelineStageSync.test.ts
```
