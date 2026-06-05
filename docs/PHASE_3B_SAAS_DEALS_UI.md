# Fase 3B — UI pipeline oficial `saas_deals`

## Objetivo

Convertir `saas_deals` en el pipeline visible y oficial del producto SaaS en `/saas/crm`.

## Entregado

| Sprint | Contenido |
|--------|-----------|
| S1 | `features/saas-deals/` — types, api, hooks, stages |
| S2 | Kanban deals en pestaña Pipeline; cambio de etapa vía `PATCH /api/saas/deals/[id]/stage` |
| S4 | KPIs: openCount, wonCount, lostCount, pipelineValue, forecastValue |
| S5 | `dealsContext` en detalle contacto (`GET /api/saas/crm/contacts/[id]`) |
| S3 | CRUD deals: crear, editar, eliminar, detalle lateral, selector contacto |

## APIs consumidas (solo frontend)

- `GET/POST /api/saas/deals`
- `GET/PATCH/DELETE /api/saas/deals/[dealId]`
- `PATCH /api/saas/deals/[dealId]/stage`
- `GET /api/saas/deals/metrics`
- `GET /api/saas/crm/contacts/[contactId]` (dealsContext)

## Fuera de alcance (3B)

- Drag-and-drop avanzado
- `deal_stage_changed` en workflows
- Billing, RBAC, automatizaciones nuevas
- ~~Dashboard comercial en `/saas/dashboard` (S6)~~ ✅

## S6 — Dashboard comercial

- `CommercialPipelineSection` en `/saas/dashboard`
- KPIs desde `GET /api/saas/deals/metrics` (6 métricas incl. valor ganado)
- Distribución `byStage` con barras proporcionales reales
- Actividad: oportunidades abiertas y ganados recientes (`GET /api/saas/deals`)
- CTA → `/saas/crm?tab=pipeline`

## S3 — CRUD UI

- `DealFormModal` — POST crear / PATCH editar
- `DealDetailPanel` — detalle + eliminar con confirmación
- Botón «Nuevo deal» en Pipeline y en detalle contacto (contacto preseleccionado)

## Transición `pipeline_stage`

- Kanban oficial lee **solo** `saas_deals`
- Tabla contactos mantiene badge `pipeline_stage` (legacy informativo)
- `GET /api/saas/crm/pipeline` deprecado en UI; sin eliminar backend

## Validación

```powershell
cd apps/web
pnpm exec vitest run src/features/saas-deals
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```
