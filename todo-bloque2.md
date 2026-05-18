# BLOQUE 2 — Objetivo ~85/100 real

## Ejecuciones

### 1. Multi-tenancy Real
- **Backend**: `routers/tenant_management.py` — Tenant settings (timezone, locale, industry, billing_email), tenant-aware data isolation middleware
- **Backend**: Extend `models/workspaces.py` with tenant fields (timezone, locale, industry, billing_email, max_users, features_json)
- **Frontend**: `pages/saas/SaasTenantSettings.tsx` — Tenant config panel (branding, timezone, locale, features)
- Route: `/saas/tenant-settings`

### 2. Permisos Granulares por Tenant y Módulo
- **Backend**: `routers/tenant_permissions.py` — Module-level permission CRUD per workspace member
- **Backend**: `models/tenant_permissions.py` — New model: workspace_id, user_id, module, actions[]
- **Frontend**: `components/TenantPermissionsManager.tsx` — UI to assign module permissions per member
- Integrate into existing Settings page

### 3. Integraciones Reales OAuth/API
- **Backend**: `routers/oauth_integrations.py` — OAuth2 flow endpoints (authorize URL, callback, token exchange, refresh)
- **Frontend**: Update `SaasIntegrations.tsx` — Add OAuth connect buttons, real connection status
- Support: Meta (Facebook/Instagram), Google (Calendar/Ads/Analytics), Slack, HubSpot

### 4. Onboarding Guiado y Activación
- **Backend**: `routers/onboarding.py` — Track onboarding progress, checklist state, demo data seeding
- **Frontend**: `pages/saas/SaasOnboarding.tsx` — Step-by-step wizard with progress tracking
- Route: `/saas/onboarding`

### 5. Dashboard Global de Negocio
- **Backend**: `routers/global_dashboard.py` — Aggregated cross-module business metrics
- **Frontend**: `pages/saas/SaasGlobalDashboard.tsx` — Revenue, pipeline, tickets, campaigns, contracts, account health
- Route: `/saas/global-dashboard`

## Files to Create/Modify (max 8 new files)
1. `backend/routers/tenant_management.py` (NEW)
2. `backend/routers/oauth_integrations.py` (NEW)
3. `backend/routers/onboarding.py` (NEW)
4. `backend/routers/global_dashboard.py` (NEW)
5. `frontend/src/pages/saas/SaasOnboarding.tsx` (NEW)
6. `frontend/src/pages/saas/SaasGlobalDashboard.tsx` (NEW)
7. `frontend/src/pages/saas/SaasTenantSettings.tsx` (NEW)
8. `frontend/src/App.tsx` (MODIFY — add routes)
9. `frontend/src/components/SaasLayout.tsx` (MODIFY — add nav items)
10. `backend/models/workspaces.py` (MODIFY — add tenant fields)