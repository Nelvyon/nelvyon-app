# Fase 1A — Inventario legacy

| Sistema | Oficial | Legacy | Deprecado |
|---------|---------|--------|-----------|
| **CRM** | `saas_contacts`, `SaasCrmService`, `/api/saas/crm/*`, `/saas/crm` | `crm_contacts` (workspace + OS), `/api/crm/*`, OS `CrmService` | Escrituras en tablas legacy (congeladas, sin delete) |
| **Dashboard** | `/saas/dashboard`, `SaasDashboardService`, `/api/saas/dashboard` | `/dashboard/*` (apps/web OS), Vite `SaasDashboard` + `global-dashboard` | Componentes `Superior*Dashboard` (roadmap) |
| **Auth** | `nelvyon_users`, `AuthService.ts`, `authenticate()` en `/api/saas/*` | FastAPI JWT + `X-Workspace-Id`, cookie `nelvyon_session` | Doble claim sin unificar `tenantId` TEXT vs `saas_tenants.id` |
| **Contacts** | `saas_contacts` | `contacts` (integer ID), `crm_contacts` | Tabla `contacts` post-ETL |
| **Deals** | (pendiente `saas_deals`) | `deals`, `crm_deals`, `pipeline_deals` | Unificación fase 2 |
| **Workflows** | `saas_workflows`, `SaasWorkflowService`, `/api/saas/workflows/*` | `workflows` entity, `workflow_engine.py`, `/dashboard/workflows` | Motor visual Python duplicado |
| **Integraciones** | `apps/web/saas/dashboard/integrations`, OAuth en `apps/web/src/app/api/oauth/*` | `backend/routers/oauth_integrations.py` | Tokens duplicados sin estrategia UUID |

Actualizado: Fase 1B — ETL dry-run/apply, cuotas híbridas, guardrails legacy.

Ver también: `PHASE_1B_CRM_ETL.md`, `PHASE_1B_QUOTAS.md`.
