# Fase 1C — Dashboards legacy (marcados, no eliminados)

## Fuente oficial CRM

- UI: `/saas/crm` (`apps/web`)
- API: `/api/saas/crm/*` → `saas_contacts`
- Manifest: `backend/saas/crmConsolidation.ts`

## Dashboards y rutas legacy

| Superficie | Ruta / API | Tablas contactos | Estado 1C |
|------------|------------|------------------|-----------|
| CRM Next legacy | `/dashboard/crm` | `crm_contacts`, `/api/crm/*` | Marcado en `page.tsx` |
| Vite SaaS hub | `/saas/dashboard` → `SaasDashboard.tsx` | KPIs: **hybrid** vía `/api/v1/dashboard/metrics` | Marcado |
| Vite global | `/saas/global-dashboard` → `SaasGlobalDashboard.tsx` | **hybrid** vía `/api/v1/global-dashboard/*` | Marcado |
| FastAPI metrics | `/api/v1/dashboard/metrics` | contactos hybrid; deals legacy | Comentario router |
| FastAPI global | `/api/v1/global-dashboard/*` | contactos hybrid; deals legacy | Comentario router |
| Workspace home | `/api/v1/workspace/home-summary` | contactos hybrid | Comentario router |
| Analytics CRM | `/api/v1/analytics/crm` | totales hybrid; charts source/status legacy | Comentario router |
| Reporting | `reporting_service._crm_metrics` | `crm_contacts` | Pendiente 1D |
| Legacy CRM stats | `/api/crm/stats` | `crm_contacts` | Sin cambio (API legacy) |

## Respuestas API (telemetría)

- `GET /api/v1/dashboard/metrics`: `contacts_count_mode`, `contacts_source` (`saas` | `legacy` | `hybrid` | `empty`)
- `GET /api/v1/analytics/crm`: `contacts_count_mode`, `contacts_charts_legacy_only: true`

## Qué no se ha rediseñado

- Layouts, componentes Superior*, marketing, web pública.
- Pipeline/deals en dashboards (siguen `deals` / `crm_deals`).

## Próximo paso

Ver `PHASE_1C_SAAS_DEALS_PLAN.md` antes de OS.
